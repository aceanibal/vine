import { moralisApi, type TokenPriceResponse } from './services/moralisApi';
import { useGlobalStore, type ChainId, type TokenInfo, type TransactionInfo, type TokenHashTable, type TransactionHashTable } from './stores/useGlobalStore';
import { clearTransactionsAndChains } from './clearStore';

// ===== TYPES =====

// ===== DATA MANAGER =====

class DataManager {
  private tokenHashTable: TokenHashTable = {};
  private transactionHashTable: TransactionHashTable = {};


  /**
   * Main function to initialize and load all data for a wallet
   * Handles all initialization logic internally
   */
  async initializeWalletData(walletAddress: string): Promise<void> {
    try {
      console.log('DataManager: Starting wallet data initialization');
      
      // Clear transactions and chains for testing
      // clearTransactionsAndChains();
      
      // Check if data exists in global store (which persists across app restarts)
      const globalState = useGlobalStore.getState();
      const hasActiveChains = globalState.activeChains.length > 0 && globalState.isActiveChainsLoaded;
      
      const isInitialized = hasActiveChains;
      
      if (isInitialized) {
        console.log('DataManager: Data exists in global store, skipping initialization');
      } else {
        console.log('DataManager: Initializing - fetching active chains');
        await this.fetchActiveChains(walletAddress);
      }

      // Always fetch transactions (either for first time or to get latest data)
      console.log('DataManager: Fetching transactions');
      await this.fetchAllTransactions(walletAddress);

      // Parse tokens from transactions and create token hash table
      console.log('DataManager: Parsing tokens from transactions');
      this.parseTokensFromTransactions();

      // Update token prices after parsing
      console.log('DataManager: Updating token prices');
      await this.updateTokenPrices();

      console.log('DataManager: Wallet data initialization complete');
      
    } catch (error) {
      console.error('DataManager: Error during wallet data initialization:', error);
      throw error;
    }
  }

  /**
   * Fetch active chains for the wallet
   */
  private async fetchActiveChains(walletAddress: string): Promise<void> {
    try {
      console.log('DataManager: Fetching active chains');
      
      // Call Moralis API to get and store active chains
      await moralisApi.getWalletActiveChains(walletAddress);
      
      console.log('DataManager: Active chains fetched and stored by Moralis API');
      
    } catch (error) {
      console.error('DataManager: Error fetching active chains:', error);
      throw error;
    }
  }



  /**
   * Parse tokens from transaction hash table and create token hash table
   */
  private parseTokensFromTransactions(): void {
    try {
      console.log('DataManager: Parsing tokens from transactions');
      
      const globalState = useGlobalStore.getState();
      const transactions = globalState.transactions;
      
      // Log transaction table for debugging
      console.log('DataManager: Transaction table contents:');
      console.log(`DataManager: Total transactions in store: ${Object.keys(transactions).length}`);
      Object.entries(transactions).forEach(([key, tx]) => {
        console.log(`DataManager: Transaction ${key}:`, {
          hash: tx.hash,
          transactionType: tx.transactionType,
          direction: tx.direction,
          tokenAddress: tx.tokenAddress,
          tokenSymbol: tx.tokenSymbol,
          value: tx.value,
          chainId: tx.chainId
        });
      });
      
      // Create token hash table directly
      const tokenHashTable: TokenHashTable = {};
      
      // Process each transaction
      Object.values(transactions).forEach(tx => {
        // Use the token data that was already extracted during transaction processing
        if (tx.tokenSymbol) {
          const tokenAddress = tx.tokenAddress || 'native';
          const tokenSymbol = tx.tokenSymbol;
          const isNative = !tx.tokenAddress;
          
          console.log(`DataManager: Processing token transaction:`, {
            tokenAddress,
            tokenSymbol,
            isNative,
            value: tx.value,
            direction: tx.direction
          });
          
          // Create unique key for token (chainId + address)
          const tokenKey = `${tx.chainId}-${tokenAddress}`;
          
          // Get or create token data
          let tokenInfo = tokenHashTable[tokenKey];
          if (!tokenInfo) {
            tokenInfo = {
              address: tokenAddress,
              name: tx.tokenName || tokenSymbol,
              symbol: tokenSymbol,
              decimals: tx.tokenDecimals || 18,
              chainId: tx.chainId,
              chainName: this.getChainName(tx.chainId),
              logoURI: tx.tokenLogo,
              isNative,
              balance: '0',
              price: undefined,
              tokenValue: undefined,
              color: '', // Not used per user request
              addedAt: new Date(tx.timestamp),
            };
            tokenHashTable[tokenKey] = tokenInfo;
          }
          
          // Parse transaction value
          const txValue = BigInt(tx.value || '0');
          const currentBalance = BigInt(tokenInfo.balance);
          
          // Update balance based on transaction direction
          if (tx.direction === 'receive') {
            tokenInfo.balance = (currentBalance + txValue).toString();
          } else if (tx.direction === 'send') {
            tokenInfo.balance = (currentBalance - txValue).toString();
          }
          
          // Update addedAt to earliest transaction
          const txDate = new Date(tx.timestamp);
          if (txDate < tokenInfo.addedAt) {
            tokenInfo.addedAt = txDate;
          }
        }
      });
      
      // Update global store with token hash table
      useGlobalStore.setState({ 
        tokens: tokenHashTable
      });
      
      console.log(`DataManager: Parsed ${Object.keys(tokenHashTable).length} unique tokens from transactions`);
      
      // Log detailed token information
      Object.entries(tokenHashTable).forEach(([tokenKey, token]) => {
        const balanceInTokens = parseFloat(token.balance) / Math.pow(10, token.decimals);
        console.log(`DataManager: Token ${tokenKey}:`, {
          symbol: token.symbol,
          balance: balanceInTokens.toFixed(6),
          chainId: token.chainId,
          isNative: token.isNative,
          addedAt: token.addedAt.toISOString()
        });
      });
      
    } catch (error) {
      console.error('DataManager: Error parsing tokens from transactions:', error);
      throw error;
    }
  }

  /**
   * Update token prices for all tokens in the global store
   */
  private async updateTokenPrices(): Promise<void> {
    try {
      console.log('DataManager: Starting token price updates');
      
      const globalState = useGlobalStore.getState();
      let tokens = globalState.tokens; // Use let so we can update the reference
      
      if (Object.keys(tokens).length === 0) {
        console.log('DataManager: No tokens found to update prices for');
        return;
      }
      
      console.log(`DataManager: Updating prices for ${Object.keys(tokens).length} tokens`);
      
      // Separate native tokens from ERC20 tokens
      const erc20Tokens: Array<{ tokenKey: string; address: string; chain: string }> = [];
      const nativeTokenChains: Set<string> = new Set();
      
      Object.entries(tokens).forEach(([tokenKey, token]) => {
        if (token.isNative) {
          nativeTokenChains.add(token.chainId);
        } else {
          // Convert chainId to Moralis chain format
          const moralisChain = this.getMoralisChainFromChainId(token.chainId);
          if (moralisChain) {
            erc20Tokens.push({
              tokenKey,
              address: token.address,
              chain: moralisChain
            });
          }
        }
      });
      
      console.log(`DataManager: Found ${erc20Tokens.length} ERC20 tokens and ${nativeTokenChains.size} native token chains`);
      
      // Update prices for ERC20 tokens
      if (erc20Tokens.length > 0) {
        try {
          const erc20PriceRequests = erc20Tokens.map(({ address, chain }) => ({ address, chain }));
          console.log(`DataManager: Attempting to get ERC20 prices without exchange specification (let Moralis auto-select)`);
          const erc20PriceResults = await moralisApi.getMultipleTokenPrices(
            erc20PriceRequests,
            { includePercentChange: true }
          );
          
          // Update ERC20 token prices
          const updatedTokens = { ...tokens };
          
          erc20PriceResults.forEach(({ tokenKey, price }) => {
            if (price && updatedTokens[tokenKey]) {
              updatedTokens[tokenKey] = {
                ...updatedTokens[tokenKey],
                price: {
                  usd: price.usdPrice || 0,
                  usdFormatted: price.usdPriceFormatted || '0',
                  percentChange24h: price.usdPrice24hrPercentChange || (price['24hrPercentChange'] ? parseFloat(price['24hrPercentChange']) : undefined),
                  usdPrice24hr: price.usdPrice24hr,
                  usdPrice24hrUsdChange: price.usdPrice24hrUsdChange,
                  usdPrice24hrPercentChange: price.usdPrice24hrPercentChange,
                  nativePrice: price.nativePrice,
                  exchangeAddress: price.exchangeAddress,
                  exchangeName: price.exchangeName,
                  pairAddress: price.pairAddress,
                  pairTotalLiquidityUsd: price.pairTotalLiquidityUsd,
                  securityScore: price.securityScore,
                  lastUpdated: new Date(),
                  possibleSpam: price.possibleSpam,
                  verifiedContract: price.verifiedContract,
                },
                tokenValue: this.calculateTokenValue(updatedTokens[tokenKey].balance, updatedTokens[tokenKey].decimals, price.usdPrice || 0)
              };
              
              console.log(`DataManager: Updated price for ${updatedTokens[tokenKey].symbol}: $${price.usdPriceFormatted || price.usdPrice}`);
            }
          });
          
          // Update the tokens reference to use the updated version
          tokens = updatedTokens;
          
        } catch (error) {
          console.error('DataManager: Error updating ERC20 token prices:', error);
        }
      }
      
      // Update prices for native tokens using the latest token state
      if (nativeTokenChains.size > 0) {
        try {
          console.log(`DataManager: Getting native token prices for ${nativeTokenChains.size} chains using bulk endpoint`);
          
          // Group native tokens by chain and get wrapped token addresses
          const nativeTokenRequests: Array<{ address: string; chain: string; chainId: string }> = [];
          
          Array.from(nativeTokenChains).forEach((chainId) => {
            const moralisChain = this.getMoralisChainFromChainId(chainId as ChainId);
            if (moralisChain) {
              const wrappedAddress = this.getWrappedNativeTokenAddress(moralisChain);
              if (wrappedAddress) {
                nativeTokenRequests.push({
                  address: wrappedAddress,
                  chain: moralisChain,
                  chainId: chainId
                });
              }
            }
          });
          
          if (nativeTokenRequests.length > 0) {
            // Use the bulk endpoint for native tokens
            console.log(`DataManager: Attempting to get native token prices without exchange specification (let Moralis auto-select)`);
            const nativeTokenResults = await moralisApi.getMultipleTokenPrices(
              nativeTokenRequests.map(({ address, chain }) => ({ address, chain })),
              { includePercentChange: true }
            );
            
            // Use the most recent tokens state (which includes ERC20 updates)
            const updatedTokens = { ...tokens };
            
            
            nativeTokenResults.forEach(({ tokenKey, price }) => {
              if (price) {
                // Find the chain ID for this price result
                const nativeTokenRequest = nativeTokenRequests.find(req => 
                  tokenKey === `${req.chainId}-${req.address}`
                );
                
                if (nativeTokenRequest) {
                  const { chainId } = nativeTokenRequest;
                  
                  // Find native tokens for this chain and update them
                  Object.entries(updatedTokens).forEach(([tokenKey, token]) => {
                    if (token.isNative && token.chainId === chainId) {
                      updatedTokens[tokenKey] = {
                        ...token,
                        price: {
                          usd: price.usdPrice || 0,
                          usdFormatted: price.usdPriceFormatted || '0',
                          percentChange24h: price.usdPrice24hrPercentChange || (price['24hrPercentChange'] ? parseFloat(price['24hrPercentChange']) : undefined),
                          usdPrice24hr: price.usdPrice24hr,
                          usdPrice24hrUsdChange: price.usdPrice24hrUsdChange,
                          usdPrice24hrPercentChange: price.usdPrice24hrPercentChange,
                          nativePrice: price.nativePrice,
                          exchangeAddress: price.exchangeAddress,
                          exchangeName: price.exchangeName,
                          pairAddress: price.pairAddress,
                          pairTotalLiquidityUsd: price.pairTotalLiquidityUsd,
                          securityScore: price.securityScore,
                          lastUpdated: new Date(),
                          possibleSpam: price.possibleSpam,
                          verifiedContract: price.verifiedContract,
                        },
                        tokenValue: this.calculateTokenValue(token.balance, token.decimals, price.usdPrice || 0)
                      };
                      
                      console.log(`DataManager: Updated native token price for ${token.symbol}: $${price.usdPriceFormatted || price.usdPrice}`);
                    }
                  });
                }
              }
            });
            
            // Update the tokens reference
            tokens = updatedTokens;
          }
          
        } catch (error) {
          console.error('DataManager: Error updating native token prices:', error);
        }
      }
      
      // Single setState call at the end with all price updates
      useGlobalStore.setState({ tokens });
      
      console.log('DataManager: Token price updates complete');
      
    } catch (error) {
      console.error('DataManager: Error updating token prices:', error);
      // Don't throw the error - price updates are not critical for core functionality
    }
  }

  /**
   * Calculate the total value of a token holding in USD
   */
  private calculateTokenValue(balance: string, decimals: number, usdPrice: number): string {
    try {
      const tokenAmount = parseFloat(balance) / Math.pow(10, decimals);
      const totalValue = tokenAmount * usdPrice;
      return totalValue.toString();
    } catch (error) {
      console.warn('DataManager: Error calculating token value:', error);
      return '0';
    }
  }

  /**
   * Convert ChainId to Moralis chain format
   */
  private getMoralisChainFromChainId(chainId: ChainId): string | null {
    const chainMap: Record<ChainId, string> = {
      'eth': 'eth',
      'polygon': 'polygon',
      'bsc': 'bsc',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'avalanche': 'avalanche',
      'fantom': 'fantom',
      'base': 'base',
    };
    
    return chainMap[chainId] || null;
  }

  /**
   * Convert Moralis chain format back to ChainId
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
   * Fetch all transactions from Moralis for active chains
   */
  async fetchAllTransactions(walletAddress: string): Promise<void> {
    try {
      console.log('DataManager: Fetching transactions from Moralis');
      
      // Check if active chains are already initialized
      const globalState = useGlobalStore.getState();
      const hasActiveChains = globalState.activeChains.length > 0 && globalState.isActiveChainsLoaded;
      
      let allTransactions;
      
      if (hasActiveChains) {
        console.log('DataManager: Active chains initialized, using incremental fetching');
        // Use incremental fetching from latest blocks
        allTransactions = await moralisApi.getAllWalletTransactionsFromLatestBlocks(walletAddress);
      } else {
        console.log('DataManager: Active chains not initialized, fetching all transactions');
        // Use full fetching for initial load
        allTransactions = await moralisApi.getAllWalletTransactions(walletAddress);
      }
      
      console.log(`DataManager: Received transactions for ${allTransactions.length} chains`);
      
      // Store raw transaction data in global store hash table
      let updatedTransactions = { ...globalState.transactions };
      let updatedLatestBlockNumbers = { ...globalState.latestBlockNumbers };
      let updatedActiveChains = [...globalState.activeChains];
      let newTransactionCount = 0;
      let existingTransactionCount = 0;
      let latestTransactionTimestamp = globalState.lastUpdatedTransaction || 0;
      
      // Track running sum of transactions per chain
      const chainTransactionCounts: Record<string, number> = {};
      
      for (const { chainId, transactions } of allTransactions) {
        if (transactions.length > 0) {
          console.log(`DataManager: Processing ${transactions.length} transactions for chain ${chainId}`);
          
          // Initialize chain count if not exists
          if (!chainTransactionCounts[chainId]) {
            chainTransactionCounts[chainId] = 0;
          }
          
          // Track the latest block number for this chain
          let chainLatestBlock = (updatedLatestBlockNumbers as any)[chainId] || 0;
          
          // Store each transaction in global store hash table
          transactions.forEach(tx => {
            const key = `${chainId}-${tx.hash}`;
            
            // Check if transaction already exists
            if (updatedTransactions[key]) {
              existingTransactionCount++;
            } else {
              newTransactionCount++;
              chainTransactionCounts[chainId]++; // Increment running sum for this chain
              const transactionTimestamp = new Date(tx.block_timestamp).getTime();
              const blockNumber = parseInt(tx.block_number);
              
              // Track the latest transaction timestamp
              if (transactionTimestamp > latestTransactionTimestamp) {
                latestTransactionTimestamp = transactionTimestamp;
              }
              
              // Track the latest block number for this chain
              if (blockNumber > chainLatestBlock) {
                chainLatestBlock = blockNumber;
              }
              

              // Determine transaction type and direction based on transfer data
              let transactionType: 'native' | 'erc20' | 'nft' | 'contract' = 'contract';
              let direction: 'send' | 'receive' = 'send';
              let tokenAddress: string | undefined;
              let tokenSymbol: string | undefined;
              let tokenName: string | undefined;
              let tokenLogo: string | undefined;
              let formattedValue: string | undefined;
              let tokenDecimals: number | undefined;
              let isInternal: boolean = false;

              // Direction will be set from transfer data below

              // Check for native transfers first
              if (tx.native_transfers && tx.native_transfers.length > 0) {
                const nativeTransfer = tx.native_transfers[0];
                transactionType = 'native';
                direction = nativeTransfer.direction;
                tokenSymbol = nativeTransfer.token_symbol;
                tokenLogo = nativeTransfer.token_logo;
                formattedValue = nativeTransfer.value_formatted;
                tokenDecimals = 18; // Native tokens typically use 18 decimals
                isInternal = nativeTransfer.internal_transaction || false;
                // Use transfer value instead of main transaction value
                tx.value = nativeTransfer.value;
              }
              // Check for ERC20 transfers
              else if (tx.erc20_transfers && tx.erc20_transfers.length > 0) {
                const erc20Transfer = tx.erc20_transfers[0];
                transactionType = 'erc20';
                direction = erc20Transfer.direction;
                tokenAddress = erc20Transfer.address;
                tokenSymbol = erc20Transfer.token_symbol;
                tokenName = erc20Transfer.token_name;
                tokenLogo = erc20Transfer.token_logo;
                formattedValue = erc20Transfer.value_formatted;
                tokenDecimals = parseInt(erc20Transfer.token_decimals) || 18;
                // Use transfer value instead of main transaction value
                tx.value = erc20Transfer.value;
              }
              // Check for NFT transfers
              else if (tx.nft_transfers && tx.nft_transfers.length > 0) {
                transactionType = 'nft';
                // NFT direction would need to be determined from the transfer data
                direction = 'send'; // Default, could be enhanced
              }
              // Otherwise it's a contract interaction
              else {
                transactionType = 'contract';
                direction = 'send'; // Default for contract calls
              }

              const transactionData: TransactionInfo = {
                // Basic transaction data
                hash: tx.hash,
                from: tx.from_address,
                to: tx.to_address,
                value: tx.value,
                chainId: chainId,
                status: tx.receipt_status === '1' ? 'confirmed' : 'failed',
                blockNumber: parseInt(tx.block_number),
                timestamp: transactionTimestamp,
                nonce: parseInt(tx.nonce),
                
                // Gas and fee data
                gas: tx.gas,
                gasPrice: tx.gas_price,
                gasUsed: tx.receipt_gas_used,
                transactionFee: tx.transaction_fee,
                cumulativeGasUsed: tx.receipt_cumulative_gas_used,
                
                // Block data
                blockHash: tx.block_hash,
                transactionIndex: tx.transaction_index,
                
                // Contract data
                contractAddress: tx.receipt_contract_address || undefined,
                methodLabel: tx.method_label || undefined,
                
                // Token data
                tokenAddress: tokenAddress,
                tokenSymbol: tokenSymbol,
                tokenDecimals: tokenDecimals,
                tokenName: tokenName,
                tokenLogo: tokenLogo,
                formattedValue: formattedValue,
                
                // Classification
                category: tx.category,
                direction: direction,
                transactionType: transactionType,
                
                // Metadata
                summary: tx.summary,
                possibleSpam: tx.possible_spam,
                isInternal: isInternal,
                
                // Transfer data (raw for reference)
                nativeTransfers: tx.native_transfers,
                erc20Transfers: tx.erc20_transfers,
                nftTransfers: tx.nft_transfers,
              };
              
              updatedTransactions[key] = transactionData;
            }
          });
          
          // Update the latest block number for this chain
          (updatedLatestBlockNumbers as any)[chainId] = chainLatestBlock;
        }
      }
      
      // Update active chains with running sum of transactions per chain
      updatedActiveChains = updatedActiveChains.map(chain => {
        const chainName = chain.chain;
        const currentLoaded = chain.actual_loaded_transactions || 0;
        const newLoaded = chainTransactionCounts[chainName] || 0;
        
        return {
          ...chain,
          actual_loaded_transactions: currentLoaded + newLoaded
        };
      });
      
      // Update global store with all transactions, latest timestamp, latest block numbers, and active chains
      useGlobalStore.setState({ 
        transactions: updatedTransactions,
        lastUpdatedTransaction: latestTransactionTimestamp,
        latestBlockNumbers: updatedLatestBlockNumbers,
        activeChains: updatedActiveChains
      });

      
      console.log('DataManager: Transaction fetching complete');
      console.log(`DataManager: Added ${newTransactionCount} new transactions, skipped ${existingTransactionCount} existing transactions`);
      console.log('DataManager: Total transactions in global store:', Object.keys(updatedTransactions).length);
      
    } catch (error) {
      console.error('DataManager: Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Get human-readable chain name from chain ID
   */
  private getChainName(chainId: string): string {
    const chainNames: Record<string, string> = {
      'eth': 'Ethereum',
      'polygon': 'Polygon',
      'bsc': 'BNB Smart Chain',
      'arbitrum': 'Arbitrum',
      'optimism': 'Optimism',
      'avalanche': 'Avalanche',
      'fantom': 'Fantom',
      'base': 'Base',
    };
    return chainNames[chainId] || chainId.toUpperCase();
  }


}

// ===== SINGLETON INSTANCE =====

export const dataManager = new DataManager();
