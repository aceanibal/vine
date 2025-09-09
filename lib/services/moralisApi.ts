import { type ChainId } from '../stores/useGlobalStore';
import { useGlobalStore } from '../stores/useGlobalStore';

// ===== TYPES =====

export interface MoralisConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ActiveChain {
  chain: string;
  chain_id: string;
  total_transactions: number; // Total from Moralis API
  actual_loaded_transactions: number; // Total actually loaded/retrieved
  first_transaction: {
    block_number: string;
    block_timestamp: string;
    transaction_hash: string;
  } | null;
  last_transaction: {
    block_number: string;
    block_timestamp: string;
    transaction_hash: string;
  } | null;
}

export interface WalletActiveChainsResponse {
  address: string;
  active_chains: ActiveChain[];
}

export interface MoralisTransaction {
  hash: string;
  nonce: string;
  transaction_index: string;
  from_address: string;
  to_address: string;
  value: string;
  gas: string;
  gas_price: string;
  receipt_cumulative_gas_used: string;
  receipt_gas_used: string;
  receipt_contract_address: string | null;
  receipt_status: string;
  block_timestamp: string;
  block_number: string;
  block_hash: string;
  transaction_fee: string;
  method_label: string | null;
  nft_transfers: any[];
  erc20_transfers: any[];
  native_transfers: {
    from_address: string;
    to_address: string;
    value: string;
    value_formatted: string;
    direction: 'send' | 'receive';
    internal_transaction: boolean;
    token_symbol: string;
    token_logo: string;
  }[];
  summary: string;
  possible_spam: boolean;
  category: 'send' | 'receive' | 'contract_interaction';
}

export interface WalletHistoryResponse {
  cursor: string | null;
  page_size: number;
  limit: string;
  result: MoralisTransaction[];
  page: number;
}

export interface TokenPriceResponse {
  tokenName: string;
  tokenSymbol: string;
  tokenLogo: string;
  tokenDecimals: string;
  nativePrice?: {
    value: string;
    decimals: number;
    name: string;
    symbol: string;
    address?: string;
  };
  usdPrice?: number;
  usdPriceFormatted?: string;
  exchangeAddress?: string;
  exchangeName?: string;
  tokenAddress: string;
  toBlock?: string;
  possibleSpam: boolean;
  verifiedContract: boolean;
  pairAddress?: string;
  pairTotalLiquidityUsd?: string;
  securityScore?: number;
  priceLastChangedAtBlock?: string;
  blockTimestamp?: string;
  // 24-hour price data
  usdPrice24hr?: number | null;
  usdPrice24hrUsdChange?: number | null;
  usdPrice24hrPercentChange?: number | null;
  '24hrPercentChange'?: string | null;
}

export interface TokenPriceRequest {
  token_address: string;
  exchange?: string;
  to_block?: string;
}

// ===== MORALIS API SERVICE =====

class MoralisApiService {
  private apiKey: string | null = null;
  private baseUrl = 'https://deep-index.moralis.io/api/v2.2';

  /**
   * Initialize Moralis API service with API key
   */
  initialize(config: MoralisConfig): void {
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
    console.log('MoralisApi: Initialized');
  }

  /**
   * Check if service is initialized, auto-initialize if needed
   */
  private checkInitialized(): void {
    if (!this.apiKey) {
      this.autoInitialize();
    }
  }

  /**
   * Auto-initialize with environment variables
   */
  private autoInitialize(): void {
    const apiKey = process.env.EXPO_PUBLIC_MORALIS_API_KEY;
    
    if (!apiKey) {
      throw new Error('EXPO_PUBLIC_MORALIS_API_KEY environment variable is required');
    }

    this.initialize({ apiKey });
    console.log('MoralisApi: Auto-initialized with environment variables');
  }

  /**
   * Make HTTP request to Moralis API
   */
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}, method: 'GET' | 'POST' = 'GET', body?: any): Promise<T> {
    this.checkInitialized();
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters for GET requests
    if (method === 'GET') {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    console.log(`MoralisApi: Making ${method} request to: ${url.toString()}`);

    const requestOptions: RequestInit = {
      method,
      headers: {
        'X-API-Key': this.apiKey!,
        'Content-Type': 'application/json',
      },
    };

    // Add body for POST requests
    if (method === 'POST' && body) {
      requestOptions.body = JSON.stringify(body);
      console.log(`MoralisApi: Request body:`, JSON.stringify(body, null, 2));
    }

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Moralis API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get active chains for a wallet address and store them in global store
   * Active chains are chains with transactions > 0
   */
  async getWalletActiveChains(address: string): Promise<void> {
    try {
      console.log(`MoralisApi: Getting active chains for ${address}`);
      
      // Check all major chains
      const chainsToCheck = [
        { chainId: '0x1', chainName: 'eth' },
        { chainId: '0x89', chainName: 'polygon' },
        { chainId: '0x38', chainName: 'bsc' },
        { chainId: '0xa4b1', chainName: 'arbitrum' },
        { chainId: '0xa', chainName: 'optimism' },
        { chainId: '0xa86a', chainName: 'avalanche' },
        { chainId: '0xfa', chainName: 'fantom' },
        { chainId: '0x2105', chainName: 'base' }
      ];
      
      const activeChains: ActiveChain[] = [];
      
      for (const { chainId, chainName } of chainsToCheck) {
        try {
          console.log(`MoralisApi: Checking chain ${chainName} (${chainId}) for transactions`);
          
          // Use stats endpoint to check if chain has transactions
          const statsResponse = await this.makeRequest<{
            transactions: { total: string };
          }>(`/wallets/${address.toLowerCase()}/stats`, { chain: chainId });
          
          const totalTransactions = parseInt(statsResponse.transactions.total);
          
          console.log(`MoralisApi: Chain ${chainName} has ${totalTransactions} transactions`);
          
          // Chain is active if it has transactions > 0
          if (totalTransactions > 0) {
            const activeChain: ActiveChain = {
              chain: chainName,
              chain_id: chainId,
              total_transactions: totalTransactions,
              actual_loaded_transactions: 0, // Will be updated when transactions are loaded
              first_transaction: {
                block_number: "0",
                block_timestamp: new Date().toISOString(),
                transaction_hash: "active"
              },
              last_transaction: null
            };
            
            activeChains.push(activeChain);
            console.log(`MoralisApi: Chain ${chainName} is active with ${totalTransactions} transactions`);
          }
        } catch (chainError) {
          console.warn(`MoralisApi: Failed to check chain ${chainName}:`, chainError);
          // Continue with other chains even if one fails
        }
      }

      console.log(`MoralisApi: Found ${activeChains.length} active chains`);
      
      // Store active chains in global store
      useGlobalStore.getState().setActiveChains(activeChains);
      
    } catch (error) {
      console.error('MoralisApi: Failed to get active chains:', error);
      // Store empty array if failed
      useGlobalStore.getState().setActiveChains([]);
    }
  }

  /**
   * Get wallet transaction history for a specific chain
   */
  async getWalletHistory(
    address: string,
    chain: string,
    options: {
      fromDate?: Date;
      toDate?: Date;
      fromBlock?: number;
      cursor?: string;
      limit?: number;
      order?: 'ASC' | 'DESC';
    } = {}
  ): Promise<WalletHistoryResponse> {
    try {
      const {
        fromDate,
        toDate,
        fromBlock,
        cursor,
        limit = 100,
        order = 'DESC'
      } = options;

      console.log(`MoralisApi: Getting wallet history for ${address} on chain ${chain}`);
      
      const params: Record<string, any> = {
        chain,
        order,
        limit: limit.toString(),
      };

      if (fromDate) {
        params.from_date = Math.floor(fromDate.getTime() / 1000).toString();
      }

      if (toDate) {
        params.to_date = Math.floor(toDate.getTime() / 1000).toString();
      }

      if (fromBlock !== undefined) {
        params.from_block = fromBlock.toString();
      }

      if (cursor) {
        params.cursor = cursor;
      }

      const response = await this.makeRequest<WalletHistoryResponse>(
        `/wallets/${address.toLowerCase()}/history`,
        params
      );

      console.log(`MoralisApi: Retrieved ${response.result.length} transactions for chain ${chain}`);
      
      return response;
    } catch (error) {
      console.error('MoralisApi: Failed to get wallet history:', error);
      throw new Error(`Failed to get wallet history: ${error}`);
    }
  }

  /**
   * Get all transactions for a wallet across all active chains from latest stored block numbers
   * This is used for incremental updates - only fetches new transactions since last update
   */
  async getAllWalletTransactionsFromLatestBlocks(
    address: string
  ): Promise<Array<{ chainId: ChainId; transactions: MoralisTransaction[] }>> {
    try {
      console.log(`MoralisApi: Getting incremental transactions for ${address} from latest blocks`);
      
      // Get active chains and latest block numbers from global store
      const globalState = useGlobalStore.getState();
      const activeChains = globalState.activeChains;
      const latestBlockNumbers = globalState.latestBlockNumbers;
      
      console.log(`MoralisApi: Found ${activeChains.length} active chains`);
      console.log(`MoralisApi: Latest block numbers:`, latestBlockNumbers);

      if (activeChains.length === 0) {
        console.log(`MoralisApi: No active chains found`);
        return [];
      }

      // Get transactions for each active chain from their latest block number
      const transactionPromises = activeChains.map(async (chain) => {
        try {
          const chainId = this.getChainIdFromMoralis(chain.chain);
          const latestBlock = latestBlockNumbers[chainId];
          
          if (!latestBlock) {
            console.log(`MoralisApi: No latest block found for chain ${chainId}, fetching all transactions`);
            // If no latest block stored, fetch all transactions
            const historyResponse = await this.getWalletHistory(
              address,
              chain.chain_id,
              { order: 'DESC' }
            );
            
            return {
              chainId,
              transactions: historyResponse.result,
            };
          }
          
          console.log(`MoralisApi: Fetching transactions from block ${latestBlock + 1} for chain ${chainId}`);
          
          // Fetch transactions from the next block after the latest stored block
          const historyResponse = await this.getWalletHistory(
            address,
            chain.chain_id,
            { 
              fromBlock: latestBlock + 1,
              order: 'DESC' 
            }
          );
          
          console.log(`MoralisApi: Retrieved ${historyResponse.result.length} new transactions for chain ${chainId}`);
          
          return {
            chainId,
            transactions: historyResponse.result,
          };
        } catch (error) {
          console.warn(`MoralisApi: Failed to get incremental transactions for chain ${chain.chain}:`, error);
          return {
            chainId: this.getChainIdFromMoralis(chain.chain),
            transactions: [],
          };
        }
      });

      const results = await Promise.all(transactionPromises);
      const totalTransactions = results.reduce((sum, result) => sum + result.transactions.length, 0);
      
      console.log(`MoralisApi: Retrieved ${totalTransactions} new transactions across ${results.length} chains`);
      results.forEach(result => {
        if (result.transactions.length > 0) {
          console.log(`MoralisApi: Chain ${result.chainId}: ${result.transactions.length} new transactions`);
        }
      });
      
      return results;
    } catch (error) {
      console.error('MoralisApi: Failed to get incremental wallet transactions:', error);
      throw new Error(`Failed to get incremental wallet transactions: ${error}`);
    }
  }

  /**
   * Get all transactions for a wallet across all active chains
   * Returns transactions but does not store them
   */
  async getAllWalletTransactions(
    address: string,
    fromDate?: Date
  ): Promise<Array<{ chainId: ChainId; transactions: MoralisTransaction[] }>> {
    try {
      console.log(`MoralisApi: Getting all transactions for ${address}`);
      
      // Get active chains from global store
      const activeChains = useGlobalStore.getState().activeChains;
      
      console.log(`MoralisApi: Found ${activeChains.length} active chains in global store`);

      if (activeChains.length === 0) {
        console.log(`MoralisApi: No active chains found`);
        return [];
      }

      // Get transactions for each active chain
      const transactionPromises = activeChains.map(async (chain) => {
        try {
          const chainId = this.getChainIdFromMoralis(chain.chain);
          const historyResponse = await this.getWalletHistory(
            address,
            chain.chain_id,
            { fromDate, order: 'DESC' }
          );
          
          return {
            chainId,
            transactions: historyResponse.result,
          };
        } catch (error) {
          console.warn(`MoralisApi: Failed to get transactions for chain ${chain.chain}:`, error);
          return {
            chainId: this.getChainIdFromMoralis(chain.chain),
            transactions: [],
          };
        }
      });

      const results = await Promise.all(transactionPromises);
      const totalTransactions = results.reduce((sum, result) => sum + result.transactions.length, 0);
      
      console.log(`MoralisApi: Retrieved ${totalTransactions} total transactions across ${results.length} chains`);
      results.forEach(result => {
        console.log(`MoralisApi: Chain ${result.chainId}: ${result.transactions.length} transactions`);
      });
      
      return results;
    } catch (error) {
      console.error('MoralisApi: Failed to get all wallet transactions:', error);
      throw new Error(`Failed to get all wallet transactions: ${error}`);
    }
  }

  /**
   * Convert Moralis chain string to our ChainId type
   */
  private getChainIdFromMoralis(chain: string): ChainId {
    const chainMap: Record<string, ChainId> = {
      'eth': 'eth',
      'polygon': 'polygon',
      'bsc': 'bsc',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'avalanche': 'avalanche',
      'fantom': 'fantom',
      'base': 'base',
    };
    
    return chainMap[chain] || 'polygon'; // Default to polygon
  }

  /**
   * Get token price for a specific ERC20 token
   * If no exchange is specified, Moralis will auto-select the best available exchange
   */
  async getTokenPrice(
    tokenAddress: string,
    chain: string,
    options: {
      exchange?: 'uniswapv4' | 'uniswapv3' | 'uniswapv2';
      toBlock?: number;
      includePercentChange?: boolean;
    } = {}
  ): Promise<TokenPriceResponse> {
    try {
      const { exchange, toBlock, includePercentChange = true } = options;
      
      console.log(`MoralisApi: Getting token price for ${tokenAddress} on chain ${chain}`);
      
      const params: Record<string, any> = {
        chain,
      };

      if (exchange) {
        params.exchange = exchange;
      }

      if (toBlock) {
        params.to_block = toBlock.toString();
      }

      if (includePercentChange) {
        params.include = 'percent_change';
      }

      const response = await this.makeRequest<TokenPriceResponse>(
        `/erc20/${tokenAddress.toLowerCase()}/price`,
        params
      );

      console.log(`MoralisApi: Retrieved price data for ${response.tokenSymbol}: $${response.usdPriceFormatted || response.usdPrice}`);
      
      return response;
    } catch (error) {
      console.error(`MoralisApi: Failed to get token price for ${tokenAddress}:`, error);
      throw new Error(`Failed to get token price: ${error}`);
    }
  }

  /**
   * Get prices for multiple tokens using individual API calls
   * More reliable than bulk endpoint, easier to debug
   */
  async getMultipleTokenPrices(
    tokens: Array<{ address: string; chain: string }>,
    options: {
      exchange?: 'uniswapv4' | 'uniswapv3' | 'uniswapv2';
      includePercentChange?: boolean;
    } = {}
  ): Promise<Array<{ tokenKey: string; price: TokenPriceResponse | null }>> {
    try {
      console.log(`MoralisApi: Getting prices for ${tokens.length} tokens using individual calls`);
      
      // Make individual calls for each token
      const pricePromises = tokens.map(async ({ address, chain }) => {
        try {
          const chainId = this.getChainHexFromMoralisChain(chain);
          if (!chainId) {
            throw new Error(`Unsupported chain: ${chain}`);
          }
          
          console.log(`MoralisApi: Getting price for token ${address} on chain ${chainId}`);
          
          const params: Record<string, any> = {
            chain: chainId,
          };
          
          if (options.includePercentChange !== false) {
            params.include = 'percent_change';
          }
          
          if (options.exchange) {
            params.exchange = options.exchange;
          }
          
          const price = await this.makeRequest<TokenPriceResponse>(
            `/erc20/${address.toLowerCase()}/price`,
            params
          );
          
          const tokenKey = `${this.getChainIdFromMoralis(chain)}-${address}`;
          
          console.log(`MoralisApi: Retrieved price for ${price.tokenSymbol}: $${price.usdPriceFormatted || price.usdPrice}`);
          
          return { tokenKey, price };
        } catch (error) {
          console.warn(`MoralisApi: Failed to get price for token ${address} on chain ${chain}:`, error);
          const tokenKey = `${this.getChainIdFromMoralis(chain)}-${address}`;
          return { tokenKey, price: null };
        }
      });
      
      const results = await Promise.all(pricePromises);
      const successfulResults = results.filter(r => r.price !== null);
      
      console.log(`MoralisApi: Retrieved ${successfulResults.length}/${results.length} token prices successfully using individual calls`);
      
      return results;
    } catch (error) {
      console.error('MoralisApi: Failed to get multiple token prices:', error);
      throw new Error(`Failed to get multiple token prices: ${error}`);
    }
  }
  
  /**
   * Get prices for multiple tokens on a single chain using bulk endpoint
   */
  async getMultipleTokenPricesForChain(
    tokens: Array<{ address: string; exchange?: string }>,
    chain: string,
    options: {
      includePercentChange?: boolean;
    } = {}
  ): Promise<TokenPriceResponse[]> {
    try {
      console.log(`MoralisApi: Getting prices for ${tokens.length} tokens on chain ${chain}`);
      
      // Prepare bulk request body
      const tokensRequest: TokenPriceRequest[] = tokens.map(({ address, exchange }) => ({
        token_address: address,
        ...(exchange && { exchange }),
      }));
      
      const params: Record<string, any> = {
        chain,
      };
      
      if (options.includePercentChange !== false) {
        params.include = 'percent_change';
      }
      
      // Make bulk POST request
      const bulkPrices: TokenPriceResponse[] = await this.makeRequest<TokenPriceResponse[]>(
        '/erc20/prices',
        params,
        'POST',
        { tokens: tokensRequest }
      );
      
      console.log(`MoralisApi: Retrieved ${bulkPrices.length} token prices for chain ${chain}`);
      
      bulkPrices.forEach(price => {
        console.log(`MoralisApi: ${price.tokenSymbol}: $${price.usdPriceFormatted || price.usdPrice}`);
      });
      
      return bulkPrices;
    } catch (error) {
      console.error(`MoralisApi: Failed to get bulk prices for chain ${chain}:`, error);
      throw new Error(`Failed to get bulk prices for chain ${chain}: ${error}`);
    }
  }

  /**
   * Get native token price for a specific chain using wrapped token addresses
   */
  async getNativeTokenPrice(
    chain: string,
    options: {
      exchange?: 'uniswapv4' | 'uniswapv3' | 'uniswapv2';
      includePercentChange?: boolean;
    } = {}
  ): Promise<TokenPriceResponse> {
    try {
      console.log(`MoralisApi: Getting native token price for chain ${chain}`);
      
      // Get wrapped native token address for the chain
      const wrappedTokenAddress = this.getWrappedNativeTokenAddress(chain);
      if (!wrappedTokenAddress) {
        throw new Error(`No wrapped native token address found for chain ${chain}`);
      }
      
      console.log(`MoralisApi: Using wrapped token address ${wrappedTokenAddress} for chain ${chain}`);
      
      // Use the regular getTokenPrice method with the wrapped token address
      const response = await this.getTokenPrice(wrappedTokenAddress, chain, options);

      console.log(`MoralisApi: Retrieved native token price for chain ${chain}: $${response.usdPriceFormatted || response.usdPrice}`);
      
      return response;
    } catch (error) {
      console.error(`MoralisApi: Failed to get native token price for chain ${chain}:`, error);
      throw new Error(`Failed to get native token price: ${error}`);
    }
  }

  /**
   * Get wrapped native token contract address for a specific chain
   */
  private getWrappedNativeTokenAddress(chain: string): string | null {
    const wrappedTokenAddresses: Record<string, string> = {
      // Ethereum - WETH
      'eth': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      // Polygon - WMATIC
      'polygon': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      // BSC - WBNB
      'bsc': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      // Arbitrum - WETH
      'arbitrum': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      // Optimism - WETH
      'optimism': '0x4200000000000000000000000000000000000006',
      // Avalanche - WAVAX
      'avalanche': '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      // Fantom - WFTM
      'fantom': '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83',
      // Base - WETH
      'base': '0x4200000000000000000000000000000000000006',
    };
    
    return wrappedTokenAddresses[chain] || null;
  }

  /**
   * Convert Moralis chain name to hex chain ID for API calls
   */
  private getChainHexFromMoralisChain(chain: string): string | null {
    const chainHexMap: Record<string, string> = {
      'eth': '0x1',
      'polygon': '0x89',
      'bsc': '0x38',
      'arbitrum': '0xa4b1',
      'optimism': '0xa',
      'avalanche': '0xa86a',
      'fantom': '0xfa',
      'base': '0x2105',
    };
    
    return chainHexMap[chain] || null;
  }

  /**
   * Check if service is initialized
   */
  getIsInitialized(): boolean {
    return this.apiKey !== null;
  }
}

// ===== SINGLETON INSTANCE =====

export const moralisApi = new MoralisApiService();

// ===== UTILITY FUNCTIONS =====
// No utility functions needed - Moralis API is self-initializing