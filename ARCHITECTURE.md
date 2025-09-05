# Vine Wallet - Unified Architecture

## Overview

This document describes the unified architecture of Vine Wallet after consolidating all state management into a single global store and integrating with Moralis API for all blockchain interactions. The system now implements a comprehensive transaction data management approach that fetches and maintains complete wallet transaction history as a single source of truth across multiple active chains.

## 🏗️ Architecture Principles

1. **Single Source of Truth** - All app state managed by Zustand global store
2. **Unified API Integration** - All blockchain data via Moralis API
3. **Complete Transaction History** - Full wallet transaction history maintained as single source of truth
4. **Multi-Chain Support** - Dynamic support for all chains with transaction activity
5. **Clean Separation of Concerns** - Clear boundaries between UI, state, and data layers
6. **Performance Optimized** - Efficient caching and state management
7. **Type Safe** - Full TypeScript support throughout

## 📁 File Structure

```
lib/
├── stores/
│   └── useGlobalStore.ts          # 🎯 Single source of truth for ALL app state
├── hooks/
│   └── useBlocknativeGasEstimation.ts # Gas estimation via BlockNative
├── services/
│   └── moralisApi.ts              # Moralis API integration layer
├── transactionStore.ts            # 🆕 Separate transaction data store
├── getData.ts                     # 🆕 Global transaction data management function
├── tokenUtils.ts                  # Token utility functions for global store
├── transactionManager.ts          # Transaction management (simplified)
├── transactionTypeMapping.ts      # Transaction type mapping utilities
├── transactions.ts                # Transaction utilities & mock data
├── blockchainUtils.ts             # Blockchain utility functions
├── blockchainErrorHandler.ts      # Error handling system
├── blockchainConfig.ts            # Blockchain configuration
├── profileStorage.ts              # Profile storage utilities
├── cn.ts                          # Utility functions
├── useColorScheme.tsx             # Theme utilities
└── providers/
```

## 🎯 Global Store Architecture

### Core State Management

The `useGlobalStore.ts` is the heart of the application, managing:

#### Wallet State
```typescript
interface Wallet {
  address: string;
  privateKey: string;
  mnemonic?: string;
  isImported: boolean;
  createdAt: Date;
}
```

#### Token State
```typescript
interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: ChainId;
  chainName: string;
  logoURI?: string;
  isNative: boolean;
  addedAt: Date;
  price?: number;
  balance?: string;
  color?: string;
}
```

#### Transaction State
```typescript
interface Transaction {
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
}
```

#### Gas Estimation State
```typescript
interface GasPrice {
  slow: string;
  standard: string;
  fast: string;
}

interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  priority: 'slow' | 'standard' | 'fast';
}
```

#### App State
```typescript
interface AppState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isOnline: boolean;
}
```

### Key Features

1. **Persistent Storage** - All critical data persisted with AsyncStorage
2. **Automatic Rehydration** - State restored on app startup
3. **Optimized Selectors** - Efficient data access patterns
4. **Type Safety** - Full TypeScript support
5. **Debug Logging** - Comprehensive logging for development

## 🔌 Moralis API Integration

### Core Data Management Function

#### Global `getData` Function
A centralized function that manages transaction data fetching and storage:

```typescript
// Global transaction data management
const getData = async (walletAddress: string) => {
  // 1. Check if transactions exist in storage
  // 2. If no transactions: fetch entire wallet history for all active chains
  // 3. If transactions exist: fetch new transactions from most recent date
  // 4. Merge with existing data (avoiding duplicates)
  // 5. Store updated transaction data
};
```

### Moralis API Endpoints

#### Wallet History Endpoint
```typescript
import Moralis from 'moralis';

const response = await Moralis.EvmApi.wallets.getWalletHistory({
  "chain": "0x89", // Chain ID (e.g., "0x89" for Polygon)
  "order": "DESC",
  "address": "0x1aeddD4fA751C41CCB5EDF7D8c93E8E2d9EC5851"
});
```

#### Active Chains Endpoint
```typescript
const response = await Moralis.EvmApi.wallets.getWalletActiveChains({
  "chains": ["0x1", "0x89", "0x2105"], // Ethereum, Polygon, Base
  "address": "0x2584Ce54DCa457dE0bc0BF89659f3360344862A3"
});
```

#### Token Price Endpoint
```typescript
// Batch price fetching for multiple tokens
const response = await Moralis.EvmApi.token.getTokenPrice({
  "chain": "0x89",
  "address": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" // USDC
});
```

### Data Management Approach

#### getData Function Scope
`getData` function handles ONLY Moralis-related data:

```typescript
// getData handles ONLY: Moralis transactions, tokens, and token balances
const getData = async (walletAddress: string) => {
  // 1. Fetch complete transaction history from Moralis
  // 2. Parse transactions for token discovery
  // 3. Calculate token balances from transaction data
  // 4. Fetch live token prices from Moralis
  // 5. Update global store with processed Moralis data
};
```

#### Other Store Operations
Other store operations are handled directly by the global store:

```typescript
// Direct store operations (not through getData)
const addWallet = useGlobalStore(state => state.addWallet);
const setGasPriority = useGlobalStore(state => state.setGasPriority);
const setError = useGlobalStore(state => state.setError);
const setLoading = useGlobalStore(state => state.setLoading);

// Store access for all data
const tokens = useAllTokens();
const currentWallet = useCurrentWallet();
const gasPriority = useGasPriority();
```

## 🧩 Component Architecture

### State Access Patterns

#### Direct Store Access
```typescript
// For simple state access
const currentWallet = useCurrentWallet();
const allTokens = useAllTokens();
const gasPriority = useGasPriority();
```

#### Complex State Access
```typescript
// For complex state operations
const { addToken, removeToken, setGasPriority } = useGlobalStore();
```

#### Computed State
```typescript
// For derived state
const tokensByChain = useTokensByChain('polygon');
const pendingTransactions = usePendingTransactions();
```

### Simplified Data Flow

#### Moralis Data Flow (via getData)
1. **Moralis Data Need** → `getData` Function
2. **getData** → Handles Moralis API calls and data processing
3. **Data Processing** → Token discovery, balance calculation, price fetching
4. **Global Store Update** → Processed Moralis data goes to global store
5. **Component Re-render** → Components automatically update via store

#### Other Store Operations (Direct)
1. **Wallet Operations** → Direct store actions (addWallet, setCurrentWallet)
2. **Gas Operations** → Direct store actions (setGasPriority, setGasPrice)
3. **App State** → Direct store actions (setLoading, setError)
4. **Component Re-render** → Components automatically update via store

#### No Hooks, No Utilities - Just Store
- **Components** → Only access global store
- **getData** → Only handles Moralis transactions, tokens, and balances
- **Global Store** → Single source of truth for all app data
- **Automatic Updates** → Components re-render when store updates

## 🆕 New Transaction Data Architecture

### Transaction Store (Separate from Global Store)

#### Purpose
- **Single Source of Truth** for all transaction data
- **Complete History** maintained across all active chains
- **Chronological Organization** with metadata tracking

#### Structure
```typescript
interface TransactionStore {
  // Organized by chain ID
  transactions: Record<ChainId, Transaction[]>;
  
  // Metadata for each chain
  metadata: Record<ChainId, {
    lastFetchDate: Date;
    paginationCursor?: string;
    totalTransactions: number;
  }>;
  
  // Operations
  storeTransactions: (chainId: ChainId, transactions: Transaction[]) => void;
  appendTransactions: (chainId: ChainId, newTransactions: Transaction[]) => void;
  getTransactionsByDateRange: (chainId: ChainId, from: Date, to: Date) => Transaction[];
  getMostRecentTransaction: (chainId: ChainId) => Transaction | null;
}
```

#### Global Store Integration
- **No Direct Storage** - Transaction data not stored in global store
- **Reference Only** - Global store references transaction store for data
- **Token Data** - Only processed token information stored in global store

### Data Processing Pipeline

#### 1. Transaction Parsing
```typescript
// Extract token information from transaction data
const parseTransactionForTokens = (transaction: MoralisTransaction) => {
  const tokens = [];
  
  // Native transfers
  if (transaction.native_transfers?.length > 0) {
    tokens.push(...extractNativeTokens(transaction.native_transfers));
  }
  
  // ERC-20 transfers
  if (transaction.erc20_transfers?.length > 0) {
    tokens.push(...extractERC20Tokens(transaction.erc20_transfers));
  }
  
  return tokens;
};
```

#### 2. Balance Calculation
```typescript
// Calculate current balances from transaction history
const calculateTokenBalances = (transactions: Transaction[]) => {
  const balances = new Map<string, string>();
  
  transactions.forEach(tx => {
    // Process send transactions (subtract)
    if (tx.category === 'send') {
      const currentBalance = balances.get(tx.tokenAddress) || '0';
      balances.set(tx.tokenAddress, subtractBalances(currentBalance, tx.value));
    }
    
    // Process receive transactions (add)
    if (tx.category === 'receive') {
      const currentBalance = balances.get(tx.tokenAddress) || '0';
      balances.set(tx.tokenAddress, addBalances(currentBalance, tx.value));
    }
  });
  
  return balances;
};
```

#### 3. Live Price Fetching
```typescript
// Batch price fetching for all discovered tokens
const fetchTokenPrices = async (tokens: Token[]) => {
  const pricePromises = tokens.map(token => 
    Moralis.EvmApi.token.getTokenPrice({
      chain: token.chainId,
      address: token.address
    })
  );
  
  const prices = await Promise.all(pricePromises);
  return prices.map((price, index) => ({
    ...tokens[index],
    price: price.result.usdPrice
  }));
};
```

## 🗑️ Removed Redundant Files

The following files were removed during the architecture consolidation:

1. **`lib/tokens.ts`** - Replaced with `lib/tokenUtils.ts`
2. **`lib/balanceService.ts`** - Replaced with Moralis API hooks
3. **`lib/transactionService.ts`** - Replaced with global store
4. **`lib/blockchainService.ts`** - Replaced with Moralis API
5. **`lib/useHeaderSearchBar.tsx`** - Unused hook
6. **`lib/stores/useTokenStore.ts`** - Consolidated into global store
7. **`lib/stores/useWalletStore.ts`** - Consolidated into global store
8. **`lib/stores/useTransactionStore.ts`** - Consolidated into global store

## 🔧 Simplified Architecture

### No Utility Functions
- **Removed**: All utility functions to reduce complexity
- **Approach**: Moralis data processing handled within `getData` function
- **Other Operations**: Direct store actions for non-Moralis operations
- **Benefit**: Simpler codebase, easier maintenance

### No Hooks
- **Removed**: All custom hooks for data fetching
- **Approach**: Components only access global store
- **Benefit**: Consistent data access pattern across all components

## 🚀 Simplified Performance

### Store-Only Approach

1. **Zustand Persist** - Persistent storage of critical state
2. **Optimized Selectors** - Efficient state access patterns
3. **Moralis Data Handler** - `getData` function manages Moralis transactions, tokens, and balances
4. **Direct Store Operations** - Other operations handled directly by store
5. **Automatic Updates** - Components re-render when store updates

### No Complex Caching
- **Removed**: React Query and complex caching strategies
- **Approach**: Simple store-based data management
- **Benefit**: Easier to understand and maintain

## 🔒 Security Considerations

1. **Private Key Storage** - Encrypted in AsyncStorage
2. **API Key Management** - Environment variables
3. **Error Handling** - Comprehensive error boundaries
4. **Input Validation** - All user inputs validated

## 📱 Component Integration

### Screen Components

All screen components now use the unified architecture:

```typescript
// Example: Send Screen
export default function SendScreen() {
  const tokens = useAllTokens();
  const gasPriority = useGasPriority();
  const setGasPriority = useGlobalStore(state => state.setGasPriority);
  
  // ... component logic
}
```

### Store-Only Components

```typescript
// Example: Send Screen - No hooks, just store access
export default function SendScreen() {
  const tokens = useAllTokens();
  const gasPriority = useGasPriority();
  const setGasPriority = useGlobalStore(state => state.setGasPriority);
  
  // All data comes from store, no external hooks
  // getData function handles Moralis data updates
  // Direct store actions handle other operations
};
```

## 🧪 Testing Strategy

### Unit Tests
- Global store actions and selectors
- Utility functions
- API integration functions

### Integration Tests
- Component state integration
- API data flow
- Error handling

### E2E Tests
- Complete user flows
- Cross-screen navigation
- Data persistence

## 📈 Monitoring & Analytics

### Performance Monitoring
- API response times
- State update performance
- Memory usage

### Error Tracking
- Global error boundaries
- API error handling
- User action tracking

## 🔄 Migration Guide

### From Old Architecture

1. **Replace Store Imports**
   ```typescript
   // Old
   import { useTokenStore } from '~/lib/stores/useTokenStore';
   
   // New
   import { useAllTokens } from '~/lib/stores/useGlobalStore';
   ```

2. **Update Data Access**
   ```typescript
   // Old
   const balances = await balanceService.getLiveBalances();
   
   // New
   const tokens = useAllTokens(); // Moralis data from store via getData
   const setGasPriority = useGlobalStore(state => state.setGasPriority); // Direct store action
   ```

3. **Use Store Selectors**
   ```typescript
   // Old
   const tokens = useTokenStore(state => state.tokens);
   
   // New
   const tokens = useAllTokens(); // Simple store access
   ```

## 🎯 Implementation Roadmap

### Phase 1: Core Transaction Management (Current)
1. ✅ **Global Store Consolidation** - Single source of truth for app state
2. ✅ **Moralis API Integration** - Basic API integration
3. 🔄 **Transaction Store Implementation** - Separate transaction data store
4. 🔄 **getData Function** - Global transaction data management

### Phase 2: Complete Data Pipeline
1. **Active Chains Detection** - Dynamic chain support based on transaction history
2. **Token Discovery** - Automatic token discovery from transaction data
3. **Balance Calculation** - Real-time balance calculation from transaction history
4. **Price Integration** - Live price fetching and portfolio value calculation

### Phase 3: Advanced Features
1. **Multi-chain Support** - Extended chain support (Arbitrum, Optimism, etc.)
2. **Advanced Gas Estimation** - ML-based gas prediction
3. **Portfolio Analytics** - Advanced portfolio tracking and performance metrics
4. **DeFi Integration** - DeFi protocol integration and yield tracking
5. **NFT Support** - NFT management and transaction tracking

### Phase 4: Performance & UX
1. **Offline Support** - Offline transaction queuing and sync
2. **Real-time Updates** - WebSocket integration for live updates
3. **Advanced Caching** - Intelligent cache invalidation and optimization
4. **Performance Monitoring** - Real-time performance tracking and optimization

## 📚 References

- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Moralis API Documentation](https://docs.moralis.io/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Expo Router Documentation](https://expo.github.io/router/)
- [Transaction Data Management Spec](./TRANSACTION_DATA_MANAGEMENT_SPEC.md)

---

**Last Updated**: January 2025  
**Version**: 2.1.0  
**Architecture**: Unified Global Store + Moralis API + Complete Transaction History Management
