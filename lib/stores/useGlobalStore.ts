import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveWalletSecrets, removeWalletSecrets } from '../services/wallet-secure-store';
import { DEFAULT_APP_CONFIG } from '../services/app-config';
import type { GlobalState, Wallet, TransactionData, Transfer, TokenBalance, AuthorizationStatus, PredefinedTokenConfig } from './types';



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

      // Authorization state
      authorizationStatus: null,
      isWalletAuthorized: false,
      unofficialAuthorizationStatus: null,
      authorizationPending: false,

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

      // Authorization transaction default
      authorizationTransaction: {
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

      // App config (single token) - using DEFAULT_APP_CONFIG
      defaultChainIdNumeric: DEFAULT_APP_CONFIG.defaultChainIdNumeric,
      predefinedToken: DEFAULT_APP_CONFIG.predefinedToken,
      backendURL: 'https://cpprhb1jz6.execute-api.us-east-1.amazonaws.com',

      // Orchestrator config (single source of truth) - using DEFAULT_APP_CONFIG
      orchestratorConfig: DEFAULT_APP_CONFIG.orchestratorConfig,

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
        goldPrice: {
          history: null,
          lastHistoryFetch: null,
        },
      },

      // Configuration loading state
      isConfigLoaded: false,
      configLastFetched: null,

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

      setGoldPriceHistory: (history: Array<{ date: string; price: number }> | null) => {
        set((state) => ({
          appState: {
            ...state.appState,
            goldPrice: {
              ...state.appState.goldPrice,
              history,
            },
          },
        }));
      },

      refreshPriceHistory: async () => {
        const state = get();
        const backendURL = state.backendURL;

        if (!backendURL) {
          console.log('GlobalStore: No backend URL configured for price history refresh');
          return;
        }

        try {
          console.log('GlobalStore: Starting gold price history refresh...');

          // Import and use the gold price history service
          // For manual refresh, we call fetchGoldPriceHistory directly (not checkAndRefreshGoldPriceHistory)
          // The time check is only for background automatic updates
          const { fetchGoldPriceHistory } = await import('../services/gold-price');
          const priceHistory = await fetchGoldPriceHistory(backendURL);

          console.log('GlobalStore: fetchGoldPriceHistory returned:', {
            pointsCount: priceHistory?.length,
          });

          if (priceHistory && priceHistory.length > 0) {
            set((state) => ({
              appState: {
                ...state.appState,
                goldPrice: {
                  history: priceHistory,
                  lastHistoryFetch: new Date(),
                },
              },
            }));
            console.log('GlobalStore: Gold price history refresh completed successfully', {
              pointsCount: priceHistory.length,
              firstPoint: priceHistory[0],
              lastPoint: priceHistory[priceHistory.length - 1],
            });
          } else {
            console.log('GlobalStore: Gold price history returned empty data');
          }

        } catch (error) {
          console.error('GlobalStore: Failed to refresh gold price history:', error);

          // Update app state with error
          set((state) => ({
            appState: {
              ...state.appState,
              error: error instanceof Error ? error.message : 'Failed to refresh gold price history',
            }
          }));
        }
      },

      // ===== AUTHORIZATION ACTIONS =====
      checkWalletAuthorization: async () => {
        const state = get();
        const currentWallet = state.currentWallet;
        if (!currentWallet?.address) {
          console.log('[GlobalStore] checkWalletAuthorization: no wallet address');
          return;
        }
        try {
          console.log('[GlobalStore] checkWalletAuthorization: checking for', currentWallet.address);
          set((s) => ({
            appState: { ...s.appState, isLoading: true, error: null },
          }));
          
          // Import and call checkDelegationStatus
          const { checkDelegationStatus } = await import('../services/sponsored-orchestrator');
          const status = await checkDelegationStatus(currentWallet.address);
          
          console.log('[GlobalStore] checkWalletAuthorization: result', status);
          
          // Update authorization snapshot
          const isAuthorized = !!(status.isDelegated && status.matchesTarget);
          const state = get();
          const unofficial = state.unofficialAuthorizationStatus;
          
          // Check if unofficial and actual status match
          const pending = unofficial !== null && unofficial !== isAuthorized;
          
          // Clear unofficial status if it matches actual status
          const shouldClearUnofficial = unofficial !== null && unofficial === isAuthorized;
          
          set((s) => ({
            authorizationStatus: status,
            isWalletAuthorized: isAuthorized,
            authorizationPending: pending,
            unofficialAuthorizationStatus: shouldClearUnofficial ? null : s.unofficialAuthorizationStatus,
            appState: { 
              ...s.appState, 
              isLoading: false,
              lastUpdated: new Date(),
            },
          }));
        } catch (error) {
          console.error('[GlobalStore] checkWalletAuthorization: error', error);
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
        // Deprecated: Authorization is handled directly in UI components
        console.warn('[GlobalStore] authorizeWallet is deprecated - use approveAuthorizationWithTracking from sponsored-orchestrator');
        return false;
      },

      setAuthorizationSnapshot: (status: AuthorizationStatus) => {
        const isAuthorized = !!(status.isDelegated && status.matchesTarget);
        set((s) => ({
          authorizationStatus: status,
          isWalletAuthorized: isAuthorized,
          appState: { ...s.appState, lastUpdated: new Date() },
        }));
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

      // ===== AUTHORIZATION TRANSACTION ACTIONS =====
      setAuthorizationTransaction: (tx) => {
        set((s) => ({
          authorizationTransaction: {
            hash: tx.hash ?? s.authorizationTransaction.hash,
            operation: (tx.operation as any) ?? s.authorizationTransaction.operation,
            status: (tx.status as any) ?? s.authorizationTransaction.status,
            startedAt: tx.startedAt ?? s.authorizationTransaction.startedAt,
            completedAt: tx.completedAt ?? s.authorizationTransaction.completedAt,
            step: (tx as any).step ?? s.authorizationTransaction.step,
            progress: (tx as any).progress ?? s.authorizationTransaction.progress,
            logs: (tx as any).logs ?? s.authorizationTransaction.logs,
            context: (tx as any).context ?? s.authorizationTransaction.context,
          },
        }));
      },
      updateAuthorizationStatus: (status, hash) => {
        set((s) => ({
          authorizationTransaction: {
            ...s.authorizationTransaction,
            status,
            hash: typeof hash !== 'undefined' ? hash : s.authorizationTransaction.hash,
            completedAt: status === 'success' || status === 'failed' ? new Date().toISOString() : s.authorizationTransaction.completedAt,
          },
        }));
      },
      addAuthorizationLog: (message: string, data?: any) => {
        set((s) => ({
          authorizationTransaction: {
            ...s.authorizationTransaction,
            logs: [...(s.authorizationTransaction.logs || []), { at: new Date().toISOString(), message, data }],
          },
        }));
      },
      setAuthorizationStep: (step: string, progress?: number | null) => {
        set((s) => ({
          authorizationTransaction: {
            ...s.authorizationTransaction,
            step,
            progress: typeof progress === 'number' ? progress : s.authorizationTransaction.progress ?? null,
          },
        }));
      },
      setAuthorizationContext: (ctx: Partial<GlobalState['authorizationTransaction']['context']>) => {
        set((s) => ({
          authorizationTransaction: {
            ...s.authorizationTransaction,
            context: { ...(s.authorizationTransaction.context || {}), ...ctx },
          },
        }));
      },
      clearAuthorizationTransaction: () => {
        set({
          authorizationTransaction: {
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

      // Unofficial authorization methods
      setUnofficialAuthorization: (status: boolean) => {
        set({ unofficialAuthorizationStatus: status });
      },
      clearUnofficialAuthorization: () => {
        set({ unofficialAuthorizationStatus: null, authorizationPending: false });
      },

      // ===== CONFIGURATION ACTIONS =====
      fetchAppConfig: async () => {
        const state = get();
        if (!state.backendURL) return;
        
        const { fetchConfigFromBackend } = await import('../services/app-config');
        const config = await fetchConfigFromBackend(state.backendURL);
        console.log('GlobalStore: fetchAppConfig: config', config);

        set({
          defaultChainIdNumeric: config.defaultChainIdNumeric,
          predefinedToken: config.predefinedToken as PredefinedTokenConfig,
          orchestratorConfig: config.orchestratorConfig,
          isConfigLoaded: true,
          configLastFetched: new Date(),
        });
      },

      updateAppConfig: (config: any) => {
        set({
          defaultChainIdNumeric: config.defaultChainIdNumeric ?? get().defaultChainIdNumeric,
          predefinedToken: config.predefinedToken ?? get().predefinedToken,
          orchestratorConfig: config.orchestratorConfig ?? get().orchestratorConfig,
          isConfigLoaded: true,
          configLastFetched: new Date(),
        });
      },

    }),
    {
      name: 'global-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: any, version: number) => {
        // Minimal migration for backward compatibility
        // Only ensure data structure, not specific values
        return persisted;
      },
      partialize: (state) => ({
        // Persist wallet data
        wallets: state.wallets,
        currentWallet: state.currentWallet,
        isWalletCreated: state.isWalletCreated,
        // Persist app config (single token)
        defaultChainIdNumeric: state.defaultChainIdNumeric,
        predefinedToken: state.predefinedToken,
        backendURL: state.backendURL,
        // Persist config loading state
        isConfigLoaded: state.isConfigLoaded,
        configLastFetched: state.configLastFetched,
        // Persist transaction data
        transactionData: state.transactionData,
        allTransfers: state.allTransfers,
        tokenBalance: state.tokenBalance,
        // Persist authorization snapshot
        authorizationStatus: state.authorizationStatus,
        isWalletAuthorized: state.isWalletAuthorized,
        // Persist active transaction to survive reloads
        activeTransaction: state.activeTransaction,
        // Persist authorization transaction to survive reloads
        authorizationTransaction: state.authorizationTransaction,
        // Persist gold price history
        appState: {
          ...state.appState,
          goldPrice: state.appState.goldPrice,
        },
      }),
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

// Price history selectors
export const usePriceHistory = () => useGlobalStore((state) => state.appState.goldPrice.history);
export const useLastHistoryFetch = () => useGlobalStore((state) => state.appState.goldPrice.lastHistoryFetch);



