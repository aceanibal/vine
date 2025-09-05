import { moralisApi } from './services/moralisApi';
import { useGlobalStore } from './stores/useGlobalStore';

// ===== TYPES =====

export type ChainId = 'eth' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'fantom' | 'base';

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: ChainId;
  chainName: string;
  logoURI?: string;
  isNative: boolean;
  balance: string;
  price?: number;
  tokenValue?: number;
  addedAt: Date;
}

export interface TransactionInfo {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  chainId: ChainId;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  timestamp: number;
  gasUsed?: string;
  gasPrice?: string;
  nonce: number;
  category: 'send' | 'receive' | 'contract_interaction';
  direction: 'send' | 'receive';
  formattedValue?: string;
  summary?: string;
}

export interface HashTableSummary {
  totalCount: number;
  lastUpdated: Date | null;
  chains: ChainId[];
  firstTransactionDate?: Date;
  lastTransactionDate?: Date;
}

export interface TokenHashTable {
  [key: string]: TokenInfo; // key format: "chainId-address"
}

export interface TransactionHashTable {
  [key: string]: TransactionInfo; // key format: "chainId-hash"
}

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
   * Fetch all transactions from Moralis for active chains
   */
  async fetchAllTransactions(walletAddress: string): Promise<void> {
    try {
      console.log('DataManager: Fetching transactions from Moralis');
      
      // Get all transactions across all active chains
      const allTransactions = await moralisApi.getAllWalletTransactions(walletAddress);
      
      console.log(`DataManager: Received transactions for ${allTransactions.length} chains`);
      
      // Store raw transaction data in global store hash table
      const globalState = useGlobalStore.getState();
      let updatedTransactions = { ...globalState.transactions };
      let newTransactionCount = 0;
      let existingTransactionCount = 0;
      let latestTransactionTimestamp = globalState.lastUpdatedTransaction || 0;
      
      for (const { chainId, transactions } of allTransactions) {
        if (transactions.length > 0) {
          console.log(`DataManager: Processing ${transactions.length} transactions for chain ${chainId}`);
          
          // Store each transaction in global store hash table
          transactions.forEach(tx => {
            const key = `${chainId}-${tx.hash}`;
            
            // Check if transaction already exists
            if (updatedTransactions[key]) {
              existingTransactionCount++;
              console.log(`DataManager: Transaction ${tx.hash} already exists, skipping`);
            } else {
              newTransactionCount++;
              const transactionTimestamp = new Date(tx.block_timestamp).getTime();
              
              // Track the latest transaction timestamp
              if (transactionTimestamp > latestTransactionTimestamp) {
                latestTransactionTimestamp = transactionTimestamp;
              }
              
              updatedTransactions[key] = {
                hash: tx.hash,
                from: tx.from_address,
                to: tx.to_address,
                value: tx.value,
                chainId: chainId,
                status: tx.receipt_status === '1' ? 'confirmed' : 'failed',
                blockNumber: parseInt(tx.block_number),
                timestamp: transactionTimestamp,
                gasUsed: tx.receipt_gas_used,
                gasPrice: tx.gas_price,
                nonce: parseInt(tx.nonce),
                category: tx.category,
                direction: 'send', // Default, will be determined later
                summary: tx.summary,
                // Store raw transfer data for later processing
                tokenAddress: tx.erc20_transfers?.[0]?.token_address,
                tokenSymbol: tx.erc20_transfers?.[0]?.token_symbol || tx.native_transfers?.[0]?.token_symbol,
                formattedValue: tx.erc20_transfers?.[0]?.value_formatted || tx.native_transfers?.[0]?.value_formatted,
              };
            }
          });
        }
      }
      
      // Update global store with all transactions and latest timestamp
      useGlobalStore.setState({ 
        transactions: updatedTransactions,
        lastUpdatedTransaction: latestTransactionTimestamp
      });

      
      console.log('DataManager: Transaction fetching complete');
      console.log(`DataManager: Added ${newTransactionCount} new transactions, skipped ${existingTransactionCount} existing transactions`);
      console.log('DataManager: Total transactions in global store:', Object.keys(updatedTransactions).length);
      console.log('DataManager: Latest transaction timestamp:', new Date(latestTransactionTimestamp).toISOString());
      
    } catch (error) {
      console.error('DataManager: Error fetching transactions:', error);
      throw error;
    }
  }


}

// ===== SINGLETON INSTANCE =====

export const dataManager = new DataManager();
