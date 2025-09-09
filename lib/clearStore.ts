import { useGlobalStore, type ChainId } from './stores/useGlobalStore';

/**
 * Clear transactions and active chains for testing
 * Preserves wallet data, gas estimates, and app state
 */
export const clearTransactionsAndChains = (): void => {
  console.log('Clearing transactions and active chains for testing');
  
  // Clear active chains
  useGlobalStore.getState().clearActiveChains();
  
  // Clear transaction data
  useGlobalStore.setState({
    transactions: {},
    lastUpdatedTransaction: null,
    latestBlockNumbers: {} as Record<ChainId, number | null>,
  });
  
  console.log('Transactions and active chains cleared');
};

// Re-export ChainId type for convenience
export type { ChainId };
