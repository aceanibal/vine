import { ChainId } from '../dataManager';
import { useGlobalStore } from '../stores/useGlobalStore';

// ===== TYPES =====

export interface MoralisConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ActiveChain {
  chain: string;
  chain_id: string;
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
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    this.checkInitialized();
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    console.log(`MoralisApi: Making request to: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey!,
        'Content-Type': 'application/json',
      },
    });

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
              first_transaction: {
                block_number: "0",
                block_timestamp: new Date().toISOString(),
                transaction_hash: "active"
              },
              last_transaction: null
            };
            
            activeChains.push(activeChain);
            console.log(`MoralisApi: Chain ${chainName} is active`);
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
      cursor?: string;
      limit?: number;
      order?: 'ASC' | 'DESC';
    } = {}
  ): Promise<WalletHistoryResponse> {
    try {
      const {
        fromDate,
        toDate,
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