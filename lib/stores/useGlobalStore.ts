import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveWalletSecrets, removeWalletSecrets } from '../services/wallet-secure-store';
import { requirePrivateKey } from '../services/wallet-secure-store';
import { SponsoredOrchestrator } from '../services/sponsored-orchestrator';


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

type AuthorizationStatus = {
  isDelegated: boolean;
  delegatedTo: string | null;
  matchesTarget?: boolean;
  verifiedDelegationContract?: boolean;
};

export interface GlobalState {
  // ===== WALLET STATE =====
  wallets: Wallet[];
  currentWallet: Wallet | null;
  isWalletCreated: boolean;
  isUnlocked: boolean;
  _hasHydrated: boolean;

  // ===== AUTHORIZATION STATE =====
  authorizationStatus: AuthorizationStatus | null;
  isWalletAuthorized: boolean;

  // ===== ACTIVE TRANSACTION STATE =====
  activeTransaction: {
    hash: string | null;
    operation: 'Delegation' | 'Token Transfer' | null;
    status: 'idle' | 'pending' | 'success' | 'failed';
    startedAt: string | null;
    completedAt: string | null;
    step?: string | null;
    progress?: number | null;
    logs?: { at: string; message: string; data?: any }[];
    context?: {
      chainId?: number;
      tokenAddress?: string;
      toAddress?: string;
      amount?: string;
    } | null;
  };

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

  // ===== AUTHORIZATION ACTIONS =====
  checkWalletAuthorization: () => Promise<void>;
  authorizeWallet: () => Promise<boolean>;

  // ===== ACTIVE TRANSACTION ACTIONS =====
  setActiveTransaction: (tx: Partial<GlobalState['activeTransaction']>) => void;
  updateActiveTransactionStatus: (status: GlobalState['activeTransaction']['status'], hash?: string | null) => void;
  addActiveTransactionLog: (message: string, data?: any) => void;
  setActiveTransactionStep: (step: string, progress?: number | null) => void;
  setActiveTransactionContext: (ctx: Partial<GlobalState['activeTransaction']['context']>) => void;
  clearActiveTransaction: () => void;
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

      // Authorization state
      authorizationStatus: null,
      isWalletAuthorized: false,

      // Active transaction default
      activeTransaction: {
        hash: null,
        operation: null,
        status: 'idle',
        startedAt: null,
        completedAt: null,
        step: null,
        progress: null,
        logs: [],
        context: null,
      },

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
        console.log('GlobalStore: Saving secrets to SecureStore...', { address: wallet.address, hasPk: !!wallet.privateKey, pkLen: wallet.privateKey ? String(wallet.privateKey).length : 0, hasMnemonic: !!wallet.mnemonic });
        (async () => {
          try {
            await saveWalletSecrets({ address: wallet.address, privateKey: wallet.privateKey || '', mnemonic: wallet.mnemonic });
            console.log('GlobalStore: SecureStore save complete');
          } catch (e) {
            console.error('GlobalStore: Failed saving wallet secrets to SecureStore', e);
          } finally {
            const walletMeta: Wallet = {
              address: wallet.address,
              isImported: wallet.isImported,
              createdAt: wallet.createdAt,
            } as Wallet;
            set((state) => ({
              wallets: [...state.wallets, walletMeta],
              currentWallet: walletMeta,
              isWalletCreated: true,
            }));
            console.log('GlobalStore: Wallet added successfully');
          }
        })();
      },

      setCurrentWallet: (wallet: Wallet | null) => {
        set({ currentWallet: wallet });
      },

      removeWallet: (address: string) => {
        set((state) => ({
          wallets: state.wallets.filter((w) => w.address !== address),
          currentWallet: state.currentWallet?.address === address ? null : state.currentWallet,
        }));
        removeWalletSecrets(address).catch((e) => {
          console.error('GlobalStore: Failed removing wallet secrets from SecureStore', e);
        });
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

      // ===== AUTHORIZATION ACTIONS =====
      checkWalletAuthorization: async () => {
        const state = get();
        const currentWallet = state.currentWallet;
        const chainId = state.defaultChainIdNumeric;
        if (!currentWallet?.address) {
          return;
        }
        try {
          set((s) => ({
            appState: { ...s.appState, isLoading: true, error: null },
          }));

          const privateKey = await requirePrivateKey(currentWallet.address);
          const orchestrator = new SponsoredOrchestrator(chainId, privateKey);
          const statusRaw = await orchestrator.checkDelegationStatus();
          const status: AuthorizationStatus = { ...statusRaw };
          const isAuthorized = !!(status.isDelegated && status.matchesTarget);

          set((s) => ({
            authorizationStatus: status,
            isWalletAuthorized: isAuthorized,
            appState: { ...s.appState, isLoading: false, lastUpdated: new Date() },
          }));
        } catch (error) {
          set((s) => ({
            appState: {
              ...s.appState,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Authorization check failed',
            },
          }));
        }
      },

      authorizeWallet: async () => {
        const state = get();
        const currentWallet = state.currentWallet;
        const chainId = state.defaultChainIdNumeric;
        if (!currentWallet?.address) {
          console.log('GlobalStore.authorizeWallet: no current wallet');
          return false;
        }
        if (!SponsoredOrchestrator.isChainSupported(chainId)) {
          set((s) => ({
            appState: { ...s.appState, error: `Chain ${chainId} not supported`, isLoading: false },
          }));
          console.log('GlobalStore.authorizeWallet: unsupported chain', { chainId });
          return false;
        }
        try {
          set((s) => ({
            appState: { ...s.appState, isLoading: true, error: null },
          }));
          console.log('GlobalStore.authorizeWallet: start', { chainId, address: currentWallet.address });
          const privateKey = await requirePrivateKey(currentWallet.address);
          console.log('GlobalStore.authorizeWallet: privateKey loaded (len)', privateKey ? String(privateKey).length : 0);
          const orchestrator = new SponsoredOrchestrator(chainId, privateKey);
          const ok = await orchestrator.verifyDelegationContract();
          console.log('GlobalStore.authorizeWallet: verifyDelegationContract ->', ok);
          if (!ok) {
            set((s) => ({
              appState: { ...s.appState, isLoading: false, error: 'Delegation contract verification failed' },
            }));
            return false;
          }
          const res = await orchestrator.approveAuthorizationWithTracking();
          console.log('GlobalStore.authorizeWallet: delegation result', { success: res.success, txHash: res.delegationTxHash });
          // After submitting, refresh authorization snapshot
          await get().checkWalletAuthorization();
          const authorized = get().isWalletAuthorized;
          set((s) => ({ appState: { ...s.appState, isLoading: false } }));
          console.log('GlobalStore.authorizeWallet: final authorized ->', authorized);
          return authorized;
        } catch (error) {
          console.log('GlobalStore.authorizeWallet: error', error);
          set((s) => ({
            appState: {
              ...s.appState,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Authorization failed',
            },
          }));
          return false;
        }
      },

      // ===== ACTIVE TRANSACTION ACTIONS =====
      setActiveTransaction: (tx) => {
        set((s) => ({
          activeTransaction: {
            hash: tx.hash ?? s.activeTransaction.hash,
            operation: (tx.operation as any) ?? s.activeTransaction.operation,
            status: (tx.status as any) ?? s.activeTransaction.status,
            startedAt: tx.startedAt ?? s.activeTransaction.startedAt,
            completedAt: tx.completedAt ?? s.activeTransaction.completedAt,
            step: (tx as any).step ?? s.activeTransaction.step,
            progress: (tx as any).progress ?? s.activeTransaction.progress,
            logs: (tx as any).logs ?? s.activeTransaction.logs,
            context: (tx as any).context ?? s.activeTransaction.context,
          },
        }));
      },
      updateActiveTransactionStatus: (status, hash) => {
        set((s) => ({
          activeTransaction: {
            ...s.activeTransaction,
            status,
            hash: typeof hash !== 'undefined' ? hash : s.activeTransaction.hash,
            completedAt: status === 'success' || status === 'failed' ? new Date().toISOString() : s.activeTransaction.completedAt,
          },
        }));
      },
      addActiveTransactionLog: (message: string, data?: any) => {
        set((s) => ({
          activeTransaction: {
            ...s.activeTransaction,
            logs: [...(s.activeTransaction.logs || []), { at: new Date().toISOString(), message, data }],
          },
        }));
      },
      setActiveTransactionStep: (step: string, progress?: number | null) => {
        set((s) => ({
          activeTransaction: {
            ...s.activeTransaction,
            step,
            progress: typeof progress === 'number' ? progress : s.activeTransaction.progress ?? null,
          },
        }));
      },
      setActiveTransactionContext: (ctx: Partial<GlobalState['activeTransaction']['context']>) => {
        set((s) => ({
          activeTransaction: {
            ...s.activeTransaction,
            context: { ...(s.activeTransaction.context || {}), ...ctx },
          },
        }));
      },
      clearActiveTransaction: () => {
        set({
          activeTransaction: {
            hash: null,
            operation: null,
            status: 'idle',
            startedAt: null,
            completedAt: null,
            step: null,
            progress: null,
            logs: [],
            context: null,
          },
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
        // Persist authorization snapshot
        authorizationStatus: state.authorizationStatus,
        isWalletAuthorized: state.isWalletAuthorized,
        // Persist active transaction to survive reloads
        activeTransaction: state.activeTransaction,
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


