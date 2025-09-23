import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { dataManager } from '../dataManager';

// ===== TYPES =====

// Chain ID type definition
export type ChainId = 'eth' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'fantom' | 'base' | 'sepolia';

// Chain configuration interface
export interface ChainConfig {
  chainId: ChainId;
  name: string;
  numericId: number;
  hexId: string;
  isTestnet?: boolean;
}

// Centralized chain configurations - Single source of truth
export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  polygon: {
    chainId: 'polygon',
    name: 'Polygon',
    numericId: 137,
    hexId: '0x89',
    isTestnet: false,
  },
};

export interface TokenPriceInfo {
  usd: number;
  usdFormatted: string;
  percentChange24h?: number | null;
  usdPrice24hr?: number | null;
  usdPrice24hrUsdChange?: number | null;
  usdPrice24hrPercentChange?: number | null;
  nativePrice?: {
    value: string;
    decimals: number;
    name: string;
    symbol: string;
    address?: string;
  };
  exchangeAddress?: string;
  exchangeName?: string;
  pairAddress?: string;
  pairTotalLiquidityUsd?: string;
  securityScore?: number;
  lastUpdated: Date;
  possibleSpam: boolean;
  verifiedContract: boolean;
}

export interface TokenInfo {
  color: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: ChainId;
  chainName: string;
  logoURI?: string;
  isNative: boolean;
  balance: string;
  price?: TokenPriceInfo;
  tokenValue?: string;
  formattedBalance?: string;
  addedAt: Date;
}

export interface TransactionInfo {
  // Basic transaction data
  hash: string;
  from: string;
  to: string;
  value: string;
  chainId: ChainId;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  timestamp: number;
  nonce: number;
  
  // Gas and fee data
  gas?: string;
  gasPrice?: string;
  gasUsed?: string;
  transactionFee?: string;
  cumulativeGasUsed?: string;
  
  // Block data
  blockHash?: string;
  transactionIndex?: string;
  
  // Contract data
  contractAddress?: string;
  methodLabel?: string;
  
  // Token data
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  tokenName?: string;
  tokenLogo?: string;
  formattedValue?: string;
  
  // Classification
  category: 'send' | 'receive' | 'contract_interaction' | 'token send' | 'token receive';
  direction: 'send' | 'receive';
  transactionType: 'native' | 'erc20' | 'nft' | 'contract';
  
  // Metadata
  summary?: string;
  possibleSpam?: boolean;
  isInternal?: boolean;
  
  // Transfer data (raw for reference)
  nativeTransfers?: any[];
  erc20Transfers?: any[];
  nftTransfers?: any[];
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

export interface PendingTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  chainId: ChainId;
  tokenAddress?: string;
  tokenSymbol?: string;
  isNative: boolean;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
}

export interface PendingTransactionHashTable {
  [key: string]: PendingTransaction; // key format: "chainId-hash"
}

export interface Wallet {
  address: string;
  privateKey: string;
  mnemonic?: string;
  isImported: boolean;
  createdAt: Date;
}


export interface GasPrice {
  slow: string;
  standard: string;
  fast: string;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  priority: 'slow' | 'standard' | 'fast';
}

export interface AppState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isOnline: boolean;
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


// ===== GLOBAL STORE STATE =====

export interface GlobalState {
  // ===== WALLET STATE =====
  wallets: Wallet[];
  currentWallet: Wallet | null;
  isWalletCreated: boolean;
  isUnlocked: boolean;
  _hasHydrated: boolean;

  // ===== TOKEN STATE =====
  tokens: TokenHashTable;

  // ===== TRANSACTION STATE =====
  transactions: TransactionHashTable;
  lastUpdatedTransaction: number | null; // timestamp of the most recent transaction
  latestBlockNumbers: Record<ChainId, number | null>; // latest block number for each chain

  // ===== PENDING TRANSACTION STATE =====
  pendingTransactions: PendingTransactionHashTable;

  // ===== GAS ESTIMATION STATE =====
  gasPrices: Record<ChainId, GasPrice | null>;
  gasEstimates: Record<string, GasEstimate | null>;
  selectedGasPriority: 'slow' | 'standard' | 'fast';

  // ===== APP STATE =====
  appState: AppState;

  // ===== ACTIVE CHAINS STATE =====
  activeChains: ActiveChain[];
  isActiveChainsLoaded: boolean;

  // ===== WALLET ACTIONS =====
  addWallet: (wallet: Wallet) => void;
  setCurrentWallet: (wallet: Wallet | null) => void;
  removeWallet: (address: string) => void;
  setWalletCreated: (created: boolean) => void;
  unlockWallet: () => void;
  lockWallet: () => void;
  clearWallets: () => void;


  // ===== GAS ESTIMATION ACTIONS =====
  setGasPrice: (chainId: ChainId, gasPrice: GasPrice) => void;
  setGasEstimate: (key: string, estimate: GasEstimate) => void;
  setGasPriority: (priority: 'slow' | 'standard' | 'fast') => void;
  getGasPrice: (chainId: ChainId, priority?: 'slow' | 'standard' | 'fast') => string | null;
  getGasEstimate: (key: string) => GasEstimate | null;


  // ===== TRANSACTION ACTIONS =====
  getTransactions: () => any[];

  // ===== PENDING TRANSACTION ACTIONS =====
  addPendingTransaction: (transaction: PendingTransaction) => void;
  updatePendingTransactionStatus: (chainId: ChainId, hash: string, status: 'pending' | 'confirmed' | 'failed') => void;
  removePendingTransaction: (chainId: ChainId, hash: string) => void;
  getPendingTransactions: () => PendingTransaction[];
  getPendingTransactionsByChain: (chainId: ChainId) => PendingTransaction[];

  // ===== ACTIVE CHAINS ACTIONS =====
  setActiveChains: (chains: ActiveChain[]) => void;
  clearActiveChains: () => void;
  setActiveChainsLoaded: (loaded: boolean) => void;

  // ===== APP STATE ACTIONS =====
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date) => void;
  setOnline: (online: boolean) => void;
  clearError: () => void;

  // ===== DATA REFRESH ACTIONS =====
  refreshWalletData: () => Promise<void>;
}


// ===== GLOBAL STORE =====

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set, get) => ({
      // ===== INITIAL STATE =====
      // Wallet state
      wallets: [],
      currentWallet: null,
      isWalletCreated: false,
      isUnlocked: false,
      _hasHydrated: false,

      // Token state
      tokens: {},

      // Transaction state
      transactions: {},
      lastUpdatedTransaction: null,
      latestBlockNumbers: {} as Record<ChainId, number | null>,

      // Pending transaction state
      pendingTransactions: {},

      // Gas estimation state
      gasPrices: {} as Record<ChainId, GasPrice | null>,
      gasEstimates: {},
      selectedGasPriority: 'standard',

      // App state
      appState: {
        isLoading: false,
        error: null,
        lastUpdated: null,
        isOnline: true,
      },

      // Active chains state
      activeChains: [],
      isActiveChainsLoaded: false,

      // ===== WALLET ACTIONS =====
      addWallet: (wallet: Wallet) => {
        console.log('GlobalStore: Adding wallet:', wallet.address);
        set((state) => ({
          wallets: [...state.wallets, wallet],
          currentWallet: wallet,
          isWalletCreated: true,
        }));
        console.log('GlobalStore: Wallet added successfully');
      },

      setCurrentWallet: (wallet: Wallet | null) => {
        set({ currentWallet: wallet });
      },

      removeWallet: (address: string) => {
        set((state) => ({
          wallets: state.wallets.filter((w) => w.address !== address),
          currentWallet: state.currentWallet?.address === address ? null : state.currentWallet,
        }));
      },

      setWalletCreated: (created: boolean) => {
        set({ isWalletCreated: created });
      },

      unlockWallet: () => {
        set({ isUnlocked: true });
      },

      lockWallet: () => {
        set({ isUnlocked: false });
      },

      clearWallets: () => {
        set({
          wallets: [],
          currentWallet: null,
          isWalletCreated: false,
          isUnlocked: false,
          tokens: {},
          transactions: {},
          lastUpdatedTransaction: null,
          latestBlockNumbers: {} as Record<ChainId, number | null>,
          activeChains: [],
          isActiveChainsLoaded: false,
          pendingTransactions: {},
          gasPrices: {} as Record<ChainId, GasPrice | null>,
          gasEstimates: {}
        });
      },


      // ===== GAS ESTIMATION ACTIONS =====
      setGasPrice: (chainId: ChainId, gasPrice: GasPrice) => {
        set((state) => ({
          gasPrices: {
            ...state.gasPrices,
            [chainId]: gasPrice,
          },
        }));
      },

      setGasEstimate: (key: string, estimate: GasEstimate) => {
        set((state) => ({
          gasEstimates: {
            ...state.gasEstimates,
            [key]: estimate,
          },
        }));
      },

      setGasPriority: (priority: 'slow' | 'standard' | 'fast') => {
        set({ selectedGasPriority: priority });
      },

      getGasPrice: (chainId: ChainId, priority: 'slow' | 'standard' | 'fast' = 'standard') => {
        const gasPrice = get().gasPrices[chainId];
        return gasPrice ? gasPrice[priority] : null;
      },

      getGasEstimate: (key: string) => {
        return get().gasEstimates[key] || null;
      },

      // ===== TRANSACTION ACTIONS =====
      getTransactions: () => {
        return Object.values(get().transactions);
      },

      // ===== PENDING TRANSACTION ACTIONS =====
      addPendingTransaction: (transaction: PendingTransaction) => {
        console.log('GlobalStore: Adding pending transaction:', transaction.hash);
        set((state) => ({
          pendingTransactions: {
            ...state.pendingTransactions,
            [transaction.id]: transaction,
          },
        }));
      },

      updatePendingTransactionStatus: (chainId: ChainId, hash: string, status: 'pending' | 'confirmed' | 'failed') => {
        const transactionId = `${chainId}-${hash}`;
        console.log('GlobalStore: Updating pending transaction status:', transactionId, status);
        set((state) => {
          const transaction = state.pendingTransactions[transactionId];
          if (transaction) {
            return {
              pendingTransactions: {
                ...state.pendingTransactions,
                [transactionId]: {
                  ...transaction,
                  status,
                },
              },
            };
          }
          return state;
        });
      },

      removePendingTransaction: (chainId: ChainId, hash: string) => {
        const transactionId = `${chainId}-${hash}`;
        console.log('GlobalStore: Removing pending transaction:', transactionId);
        set((state) => {
          const { [transactionId]: removed, ...remaining } = state.pendingTransactions;
          return { pendingTransactions: remaining };
        });
      },

      getPendingTransactions: () => {
        return Object.values(get().pendingTransactions);
      },

      getPendingTransactionsByChain: (chainId: ChainId) => {
        return Object.values(get().pendingTransactions).filter(tx => tx.chainId === chainId);
      },



      // ===== APP STATE ACTIONS =====
      setLoading: (loading: boolean) => {
        set((state) => ({
          appState: {
            ...state.appState,
            isLoading: loading,
          },
        }));
      },

      setError: (error: string | null) => {
        set((state) => ({
          appState: {
            ...state.appState,
            error,
          },
        }));
      },

      setLastUpdated: (date: Date) => {
        set((state) => ({
          appState: {
            ...state.appState,
            lastUpdated: date,
          },
        }));
      },

      setOnline: (online: boolean) => {
        set((state) => ({
          appState: {
            ...state.appState,
            isOnline: online,
          },
        }));
      },

      clearError: () => {
        set((state) => ({
          appState: {
            ...state.appState,
            error: null,
          },
        }));
      },

      // ===== ACTIVE CHAINS ACTIONS =====
      setActiveChains: (chains: ActiveChain[]) => {
        set({ activeChains: chains, isActiveChainsLoaded: true });
      },

      clearActiveChains: () => {
        set({ activeChains: [], isActiveChainsLoaded: false });
      },

      setActiveChainsLoaded: (loaded: boolean) => {
        set({ isActiveChainsLoaded: loaded });
      },

      // ===== DATA REFRESH ACTIONS =====
      refreshWalletData: async () => {
        const state = get();
        const currentWallet = state.currentWallet;
        
        if (!currentWallet?.address) {
          console.log('GlobalStore: No current wallet found for refresh');
          return;
        }
        
        try {
          console.log('GlobalStore: Starting wallet data refresh...');
          
          // Set loading state
          set((state) => ({
            appState: {
              ...state.appState,
              isLoading: true,
              error: null,
            }
          }));
          
          // Call dataManager to reinitialize wallet data
          await dataManager.initializeWalletData(currentWallet.address);
          
          // Update app state with success
          set((state) => ({
            appState: {
              ...state.appState,
              isLoading: false,
              lastUpdated: new Date(),
            }
          }));
          
          console.log('GlobalStore: Wallet data refresh completed successfully');
          
        } catch (error) {
          console.error('GlobalStore: Failed to refresh wallet data:', error);
          
          // Update app state with error
          set((state) => ({
            appState: {
              ...state.appState,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to refresh wallet data',
            }
          }));
        }
      },
    }),
    {
      name: 'global-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist wallet data
        wallets: state.wallets,
        currentWallet: state.currentWallet,
        isWalletCreated: state.isWalletCreated,
        // Persist token and transaction hash tables
        tokens: state.tokens,
        transactions: state.transactions,
        lastUpdatedTransaction: state.lastUpdatedTransaction,
        latestBlockNumbers: state.latestBlockNumbers,
        // Persist pending transactions
        pendingTransactions: state.pendingTransactions,
        // Persist active chains data
        activeChains: state.activeChains,
        isActiveChainsLoaded: state.isActiveChainsLoaded,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('GlobalStore: Rehydration completed');
        if (state) {
          console.log('GlobalStore: Rehydrated state:', {
            walletsCount: state.wallets.length,
            currentWallet: state.currentWallet?.address,
            isWalletCreated: state.isWalletCreated,
            tokensCount: Object.keys(state.tokens).length,
            transactionsCount: Object.keys(state.transactions).length,
            lastUpdatedTransaction: state.lastUpdatedTransaction,
            latestBlockNumbers: state.latestBlockNumbers,
            pendingTransactionsCount: Object.keys(state.pendingTransactions || {}).length,
            activeChainsCount: state.activeChains.length,
            isActiveChainsLoaded: state.isActiveChainsLoaded,
          });
          // Mark as hydrated
          state._hasHydrated = true;
        }
      },
    }
  )
);

// ===== UTILITY FUNCTIONS =====

/**
 * Get numeric chain ID from ChainId
 */
export const getNumericChainId = (chainId: ChainId): number => {
  return CHAIN_CONFIGS[chainId]?.numericId || 137; // Default to Polygon
};

/**
 * Get hex chain ID from ChainId
 */
export const getHexChainId = (chainId: ChainId): string => {
  return CHAIN_CONFIGS[chainId]?.hexId || '0x89'; // Default to Polygon
};

/**
 * Get chain configuration from ChainId
 */
export const getChainConfig = (chainId: ChainId): ChainConfig => {
  return CHAIN_CONFIGS[chainId] || CHAIN_CONFIGS.polygon; // Default to Polygon
};

/**
 * Get ChainId from numeric chain ID
 */
export const getChainIdFromNumeric = (numericId: number): ChainId => {
  const chainEntry = Object.entries(CHAIN_CONFIGS).find(([, config]) => config.numericId === numericId);
  return chainEntry ? (chainEntry[0] as ChainId) : 'polygon';
};

/**
 * Get ChainId from hex chain ID
 */
export const getChainIdFromHex = (hexId: string): ChainId => {
  const chainEntry = Object.entries(CHAIN_CONFIGS).find(([, config]) => config.hexId === hexId);
  return chainEntry ? (chainEntry[0] as ChainId) : 'polygon';
};

// ===== SELECTORS =====

// Wallet selectors
export const useCurrentWallet = () => useGlobalStore((state) => state.currentWallet);
export const useIsWalletCreated = () => useGlobalStore((state) => state.isWalletCreated);
export const useIsWalletUnlocked = () => useGlobalStore((state) => state.isUnlocked);

// Token selectors
export const useAllTokens = () => {
  const tokens = useGlobalStore((state) => state.tokens);
  return useMemo(() => Object.values(tokens), [tokens]);
};


// Transaction selectors
export const useAllTransactions = () => {
  const transactions = useGlobalStore((state) => state.transactions);
  return useMemo(() => Object.values(transactions), [transactions]);
};

export const useLastUpdatedTransaction = () => useGlobalStore((state) => state.lastUpdatedTransaction);
export const useLatestBlockNumbers = () => useGlobalStore((state) => state.latestBlockNumbers);

// Pending transaction selectors
export const usePendingTransactions = () => {
  const pendingTransactions = useGlobalStore((state) => state.pendingTransactions);
  return useMemo(() => Object.values(pendingTransactions), [pendingTransactions]);
};

export const usePendingTransactionsByChain = (chainId: ChainId) => {
  const pendingTransactions = useGlobalStore((state) => state.pendingTransactions);
  return useMemo(
    () => Object.values(pendingTransactions).filter(tx => tx.chainId === chainId),
    [pendingTransactions, chainId]
  );
};


// Gas estimation selectors
export const useGasPrice = (chainId: ChainId, priority?: 'slow' | 'standard' | 'fast') => 
  useGlobalStore((state) => state.getGasPrice(chainId, priority));
export const useGasPriority = () => useGlobalStore((state) => state.selectedGasPriority);


// Active chains selectors
export const useActiveChains = () => useGlobalStore((state) => state.activeChains);
export const useIsActiveChainsLoaded = () => useGlobalStore((state) => state.isActiveChainsLoaded);

// App state selectors
export const useAppLoading = () => useGlobalStore((state) => state.appState.isLoading);
export const useAppError = () => useGlobalStore((state) => state.appState.error);
export const useAppOnline = () => useGlobalStore((state) => state.appState.isOnline);
export const useLastUpdated = () => useGlobalStore((state) => state.appState.lastUpdated);

