import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';


export interface Wallet {
  address: string;
  privateKey: string;
  mnemonic?: string;
  isImported: boolean;
  createdAt: Date;
}


// Predefined single-token configuration kept in global store
export interface PredefinedTokenConfig {
  address: string; // ERC-20 contract address on the default chain
  symbol: string;
  name: string;
  decimals: number;
  price: number; // Token price in USD
}


export interface AppState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isOnline: boolean;
}

// Transaction data interfaces
export interface Transfer {
  blockNumber: number;
  hash: string;
  from: string;
  to: string;
  value: number;
  asset: string;
  category: string;
  timestamp: string | null;
  rawValue: string;
}

export interface TokenBalance {
  walletAddress: string;
  tokenContract: string;
  balance: {
    contractAddress: string;
    tokenBalance: string;
    tokenBalanceDecimal?: string; // Normalized decimal string from alchemy proxy
  };
  error: string | null;
}

export interface TransactionData {
  transfers: {
    toAddress: {
      count: number;
      transfers: Transfer[];
      pageKey: string | null;
    };
    fromAddress: {
      count: number;
      transfers: Transfer[];
      pageKey: string | null;
    };
    total: number;
  };
  tokenBalances: TokenBalance;
  metadata: {
    address: string;
    fromBlock: string;
    toBlock: string;
    timestamp: string;
    tokenAddress: string;
  };
}


// ===== GLOBAL STORE STATE =====

export interface GlobalState {
  // ===== WALLET STATE =====
  wallets: Wallet[];
  currentWallet: Wallet | null;
  isWalletCreated: boolean;
  isUnlocked: boolean;
  _hasHydrated: boolean;

  // ===== APP CONFIG (SINGLE TOKEN) =====
  defaultChainIdNumeric: number; // e.g., 137 for Polygon mainnet
  predefinedToken: PredefinedTokenConfig | null;
  backendURL: string;

  // ===== TRANSACTION DATA =====
  transactionData: TransactionData | null;
  allTransfers: Transfer[]; // Combined and sorted transfers
  tokenBalance: TokenBalance | null;

  // ===== APP STATE =====
  appState: AppState;


  // ===== WALLET ACTIONS =====
  addWallet: (wallet: Wallet) => void;
  setCurrentWallet: (wallet: Wallet | null) => void;
  removeWallet: (address: string) => void;
  setWalletCreated: (created: boolean) => void;
  unlockWallet: () => void;
  lockWallet: () => void;
  clearWallets: () => void;



  // ===== APP STATE ACTIONS =====
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date) => void;
  setOnline: (online: boolean) => void;
  clearError: () => void;

  // ===== TRANSACTION DATA ACTIONS =====
  setBackendURL: (url: string) => void;
  setTransactionData: (data: TransactionData) => void;
  fetchTransactionData: () => Promise<void>;

  // ===== DATA REFRESH ACTIONS =====
  refreshWalletData: () => Promise<void>;
  refreshGoldPrice: () => Promise<void>;
  startBackgroundGoldPriceService: () => void;
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

      // App config (single token)
      defaultChainIdNumeric: 137, // Default to Polygon mainnet
      predefinedToken: {
        address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        price: 121,
      },
      backendURL: 'https://cpprhb1jz6.execute-api.us-east-1.amazonaws.com',

      // Transaction data
      transactionData: null,
      allTransfers: [],
      tokenBalance: null,

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

      // ===== TRANSACTION DATA ACTIONS =====
      setBackendURL: (url: string) => {
        set({ backendURL: url });
      },

      setTransactionData: (data: TransactionData) => {
        // Combine and sort all transfers
        const allTransfers = [
          ...data.transfers.toAddress.transfers,
          ...data.transfers.fromAddress.transfers,
        ].sort((a, b) => b.blockNumber - a.blockNumber); // Sort by block number descending

        set({
          transactionData: data,
          allTransfers,
          tokenBalance: data.tokenBalances,
        });
      },

      fetchTransactionData: async () => {
        const state = get();
        const currentWallet = state.currentWallet;
        const predefinedToken = state.predefinedToken;
        const backendURL = state.backendURL;
        
        if (!currentWallet?.address || !predefinedToken?.address) {
          console.log('GlobalStore: Missing wallet address or predefined token for transaction data fetch');
          return;
        }
        
        try {
          console.log('GlobalStore: Fetching transaction data...');
          
          // Set loading state
          set((state) => ({
            appState: {
              ...state.appState,
              isLoading: true,
              error: null,
            }
          }));

          const url = `${backendURL}/alchemy-proxy?address=${currentWallet.address}&tokenAddress=${predefinedToken.address}`;
          
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data: TransactionData = await response.json();
          
          // Update the store with the fetched data
          get().setTransactionData(data);
          
          set((state) => ({
            appState: {
              ...state.appState,
              isLoading: false,
              lastUpdated: new Date(),
            }
          }));
          
          console.log('GlobalStore: Transaction data fetched successfully');
          
        } catch (error) {
          console.error('GlobalStore: Failed to fetch transaction data:', error);
          
          set((state) => ({
            appState: {
              ...state.appState,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to fetch transaction data',
            }
          }));
        }
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
          // In simplified XRBG branch we do not pull external data.
          // This refresh simply stamps the lastUpdated time.
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

      refreshGoldPrice: async () => {
        const state = get();
        const backendURL = state.backendURL;
        
        if (!backendURL) {
          console.log('GlobalStore: No backend URL configured for gold price refresh');
          return;
        }
        
        try {
          console.log('GlobalStore: Starting gold price refresh...');
          
          // Import and use the gold price service
          const { fetchAndUpdateGoldPrice } = await import('../services/gold-price');
          await fetchAndUpdateGoldPrice(backendURL);
          
          console.log('GlobalStore: Gold price refresh completed successfully');
          
        } catch (error) {
          console.error('GlobalStore: Failed to refresh gold price:', error);
          
          // Update app state with error
          set((state) => ({
            appState: {
              ...state.appState,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to refresh gold price',
            }
          }));
        }
      },

      startBackgroundGoldPriceService: () => {
        import('../services/background-gold-price').then(({ initializeBackgroundGoldPriceService }) => {
          initializeBackgroundGoldPriceService();
        }).catch((error) => {
          console.error('Failed to start background gold price service:', error);
        });
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
        // Persist app config (single token)
        defaultChainIdNumeric: state.defaultChainIdNumeric,
        predefinedToken: state.predefinedToken,
        backendURL: state.backendURL,
        // Persist transaction data
        transactionData: state.transactionData,
        allTransfers: state.allTransfers,
        tokenBalance: state.tokenBalance,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('GlobalStore: Rehydration completed');
        if (state) {
          // Ensure predefined token is set if it's missing or missing price
          if (!state.predefinedToken) {
            console.log('GlobalStore: Setting predefined token after rehydration');
            state.predefinedToken = {
              address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              price: 121,
            };
          } else if (typeof state.predefinedToken.price !== 'number') {
            console.log('GlobalStore: Setting predefined token price after rehydration');
            state.predefinedToken.price = 121;
          }
          
          console.log('GlobalStore: Rehydrated state:', {
            walletsCount: state.wallets.length,
            currentWallet: state.currentWallet?.address,
            isWalletCreated: state.isWalletCreated,
            defaultChainIdNumeric: state.defaultChainIdNumeric,
            hasPredefinedToken: !!state.predefinedToken,
          });
          // Mark as hydrated
          state._hasHydrated = true;

          // Initialize background gold price service after rehydration
          if (state.backendURL) {
            import('../services/background-gold-price').then(({ initializeBackgroundGoldPriceService }) => {
              initializeBackgroundGoldPriceService();
            }).catch((error) => {
              console.error('Failed to initialize background gold price service:', error);
            });
          }
        }
      },
    }
  )
);

// ===== UTILITY FUNCTIONS =====




// Wallet selectors
export const useCurrentWallet = () => useGlobalStore((state) => state.currentWallet);
export const useIsWalletCreated = () => useGlobalStore((state) => state.isWalletCreated);
export const useIsWalletUnlocked = () => useGlobalStore((state) => state.isUnlocked);

// Single-token config selectors
export const usePredefinedToken = () => useGlobalStore((state) => state.predefinedToken);
export const useDefaultChainIdNumeric = () => useGlobalStore((state) => state.defaultChainIdNumeric);

// App state selectors
export const useAppLoading = () => useGlobalStore((state) => state.appState.isLoading);
export const useAppError = () => useGlobalStore((state) => state.appState.error);
export const useAppOnline = () => useGlobalStore((state) => state.appState.isOnline);
export const useLastUpdated = () => useGlobalStore((state) => state.appState.lastUpdated);

// Transaction data selectors
export const useBackendURL = () => useGlobalStore((state) => state.backendURL);
export const useTransactionData = () => useGlobalStore((state) => state.transactionData);
export const useAllTransfers = () => useGlobalStore((state) => state.allTransfers);
export const useTokenBalance = () => useGlobalStore((state) => state.tokenBalance);


