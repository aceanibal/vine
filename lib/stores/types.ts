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
  // Optional local logo identifier for rendering bundled assets
  logo?: string;
}

export interface AppState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isOnline: boolean;
  goldPrice: {
    history: Array<{ date: string; price: number }> | null;
    lastHistoryFetch: Date | null;
  };
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

export type AuthorizationStatus = {
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

  // ===== AUTHORIZATION STATE =====
  authorizationStatus: AuthorizationStatus | null;
  isWalletAuthorized: boolean;
  unofficialAuthorizationStatus: boolean | null;
  authorizationPending: boolean;

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

  // ===== AUTHORIZATION TRANSACTION STATE =====
  authorizationTransaction: {
    hash: string | null;
    operation: 'Authorization' | 'Revocation' | null;
    status: 'idle' | 'pending' | 'success' | 'failed';
    startedAt: string | null;
    completedAt: string | null;
    step?: string | null;
    progress?: number | null;
    logs?: { at: string; message: string; data?: any }[];
    context?: {
      walletAddress?: string;
      delegationAddress?: string;
      chainId?: number;
    } | null;
  };

  // ===== APP CONFIG (SINGLE TOKEN) =====
  defaultChainIdNumeric: number; // e.g., 137 for Polygon mainnet
  predefinedToken: PredefinedTokenConfig | null;
  backendURL: string;

  // ===== ORCHESTRATOR CONFIG =====
  orchestratorConfig: {
    delegationAddress: string;
    providerUrl: string;
    relayerEndpoint: string;
    maxRetries: number;
    retryDelayMs: number;
    supportedChains: number[];
  };

  // ===== CONFIGURATION LOADING STATE =====
  isConfigLoaded: boolean;
  configLastFetched: Date | null;

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
  setGoldPriceHistory: (history: Array<{ date: string; price: number }> | null) => void;
  refreshPriceHistory: () => Promise<void>;

  // ===== AUTHORIZATION ACTIONS =====
  checkWalletAuthorization: () => Promise<void>;
  authorizeWallet: () => Promise<boolean>;
  setAuthorizationSnapshot: (status: AuthorizationStatus) => void;

  // ===== ACTIVE TRANSACTION ACTIONS =====
  setActiveTransaction: (tx: Partial<GlobalState['activeTransaction']>) => void;
  updateActiveTransactionStatus: (status: GlobalState['activeTransaction']['status'], hash?: string | null) => void;
  addActiveTransactionLog: (message: string, data?: any) => void;
  setActiveTransactionStep: (step: string, progress?: number | null) => void;
  setActiveTransactionContext: (ctx: Partial<GlobalState['activeTransaction']['context']>) => void;
  clearActiveTransaction: () => void;

  // ===== AUTHORIZATION TRANSACTION ACTIONS =====
  setAuthorizationTransaction: (tx: Partial<GlobalState['authorizationTransaction']>) => void;
  updateAuthorizationStatus: (status: GlobalState['authorizationTransaction']['status'], hash?: string | null) => void;
  addAuthorizationLog: (message: string, data?: any) => void;
  setAuthorizationStep: (step: string, progress?: number | null) => void;
  setAuthorizationContext: (ctx: Partial<GlobalState['authorizationTransaction']['context']>) => void;
  clearAuthorizationTransaction: () => void;
  
  // ===== UNOFFICIAL AUTHORIZATION ACTIONS =====
  setUnofficialAuthorization: (status: boolean) => void;
  clearUnofficialAuthorization: () => void;

  // ===== CONFIGURATION ACTIONS =====
  fetchAppConfig: () => Promise<void>;
  updateAppConfig: (config: any) => void;
}
