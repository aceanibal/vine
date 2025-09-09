import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { dataManager } from '../dataManager';

// ===== TYPES =====

// Chain ID type definition
export type ChainId = 'eth' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'fantom' | 'base';

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

// ===== UTILITY FUNCTIONS =====

/**
 * Format token balance with proper decimals
 */
function formatTokenBalance(balance: string, decimals: number): string {
  try {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balanceBigInt / divisor;
    const fractionalPart = balanceBigInt % divisor;
    
    if (fractionalPart === BigInt(0)) {
      return wholePart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    if (trimmedFractional === '') {
      return wholePart.toString();
    }
    
    return `${wholePart}.${trimmedFractional}`;
  } catch (error) {
    console.error('Error formatting token balance:', error);
    return '0';
  }
}
