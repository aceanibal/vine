import { Transaction, MOCK_TRANSACTIONS } from './transactions';
import { transactionService } from './transactionService';
import { convertServiceToUITransaction } from './transactionTypeMapping';

/**
 * TransactionManager - Single source of truth for transaction data throughout the app
 * Provides unified access to transactions with filtering, sorting, and real-time updates
 */
export class TransactionManager {
  private static instance: TransactionManager;
  private transactions: Transaction[] = [];
  private listeners: Set<(transactions: Transaction[]) => void> = new Set();

  private constructor() {
    // Initialize with empty transactions - will be populated from blockchain service
    this.transactions = [...MOCK_TRANSACTIONS];
  }

  /**
   * Singleton pattern to ensure single source of truth
   */
  public static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  /**
   * Get all transactions
   */
  public getAllTransactions(): Transaction[] {
    return [...this.transactions].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get transactions by type with advanced filtering
   */
  public getTransactionsByType(type: string): Transaction[] {
    const allTransactions = this.getAllTransactions();
    
    switch (type) {
      case 'all':
        return allTransactions;
      case 'gas':
        return allTransactions.filter(tx => tx.tokenId === 'gas');
      case 'defi':
        return allTransactions.filter(tx => 
          ['swap', 'stake', 'unstake', 'liquidity_add', 'liquidity_remove', 'bridge'].includes(tx.type)
        );
      case 'nft':
        return allTransactions.filter(tx => 
          ['nft_mint', 'nft_transfer'].includes(tx.type)
        );
      case 'failed':
        return allTransactions.filter(tx => 
          tx.status === 'failed' || tx.status === 'reverted' || tx.type === 'failed'
        );
      case 'contracts':
        return allTransactions.filter(tx => 
          ['approve', 'contract_deployment', 'contract_interaction'].includes(tx.type)
        );
      case 'internal':
        return allTransactions.filter(tx => tx.isInternal === true);
      default:
        return allTransactions.filter(tx => tx.type === type);
    }
  }

  /**
   * Get transactions by token ID
   */
  public getTransactionsByToken(tokenId: string): Transaction[] {
    return this.getAllTransactions().filter(tx => tx.tokenId === tokenId);
  }

  /**
   * Get transactions by status
   */
  public getTransactionsByStatus(status: Transaction['status']): Transaction[] {
    return this.getAllTransactions().filter(tx => tx.status === status);
  }

  /**
   * Get recent transactions (last N transactions)
   */
  public getRecentTransactions(limit: number = 5): Transaction[] {
    return this.getAllTransactions().slice(0, limit);
  }

  /**
   * Get pending transactions
   */
  public getPendingTransactions(): Transaction[] {
    return this.getTransactionsByStatus('pending');
  }

  /**
   * Get failed transactions
   */
  public getFailedTransactions(): Transaction[] {
    return this.getAllTransactions().filter(tx => 
      tx.status === 'failed' || tx.status === 'reverted'
    );
  }

  /**
   * Get transaction by hash
   */
  public getTransactionByHash(txHash: string): Transaction | undefined {
    return this.transactions.find(tx => tx.txHash === txHash);
  }

  /**
   * Get transaction by ID
   */
  public getTransactionById(id: string): Transaction | undefined {
    return this.transactions.find(tx => tx.id === id);
  }

  /**
   * Add new transaction
   */
  public addTransaction(transaction: Transaction): void {
    this.transactions.unshift(transaction);
    this.notifyListeners();
  }

  /**
   * Update existing transaction
   */
  public updateTransaction(id: string, updates: Partial<Transaction>): void {
    const index = this.transactions.findIndex(tx => tx.id === id);
    if (index !== -1) {
      this.transactions[index] = { ...this.transactions[index], ...updates };
      this.notifyListeners();
    }
  }

  /**
   * Update transaction by hash
   */
  public updateTransactionByHash(txHash: string, updates: Partial<Transaction>): void {
    const index = this.transactions.findIndex(tx => tx.txHash === txHash);
    if (index !== -1) {
      this.transactions[index] = { ...this.transactions[index], ...updates };
      this.notifyListeners();
    }
  }

  /**
   * Remove transaction
   */
  public removeTransaction(id: string): void {
    this.transactions = this.transactions.filter(tx => tx.id !== id);
    this.notifyListeners();
  }

  /**
   * Get transaction statistics
   */
  public getTransactionStats(): {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalValue: number;
    totalGasFees: number;
    byType: Record<string, number>;
  } {
    const transactions = this.getAllTransactions();
    
    const stats = {
      total: transactions.length,
      completed: transactions.filter(tx => tx.status === 'completed').length,
      pending: transactions.filter(tx => tx.status === 'pending').length,
      failed: transactions.filter(tx => tx.status === 'failed' || tx.status === 'reverted').length,
      totalValue: transactions.reduce((sum, tx) => sum + tx.value, 0),
      totalGasFees: transactions.reduce((sum, tx) => sum + (tx.gasFee || 0), 0),
      byType: {} as Record<string, number>
    };

    // Count by type
    transactions.forEach(tx => {
      stats.byType[tx.type] = (stats.byType[tx.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Subscribe to transaction updates
   */
  public subscribe(listener: (transactions: Transaction[]) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of transaction updates
   */
  private notifyListeners(): void {
    const transactions = this.getAllTransactions();
    this.listeners.forEach(listener => listener(transactions));
  }

  /**
   * Refresh transactions from blockchain service
   * Integrates with the transaction service to get real transaction data
   */
  public async refreshTransactions(): Promise<void> {
    try {
      console.log('Refreshing transactions from blockchain...');
      
      // Get transactions from service
      const serviceTransactions = transactionService.getAllTransactions();
      
      // Convert service transactions to UI transactions
      const uiTransactions = serviceTransactions.map(convertServiceToUITransaction);
      
      // Merge with existing mock transactions (in production, replace completely)
      const allTransactions = [...uiTransactions, ...MOCK_TRANSACTIONS];
      
      // Remove duplicates by txHash
      const uniqueTransactions = allTransactions.filter((tx, index, self) => 
        index === self.findIndex(t => t.txHash === tx.txHash)
      );
      
      this.transactions = uniqueTransactions;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
      throw error;
    }
  }

  /**
   * Sync a service transaction to UI transaction
   */
  public syncServiceTransaction(serviceTransaction: any): void {
    try {
      const uiTransaction = convertServiceToUITransaction(serviceTransaction);
      
      // Update existing transaction or add new one
      const existingIndex = this.transactions.findIndex(tx => tx.txHash === uiTransaction.txHash);
      if (existingIndex !== -1) {
        this.transactions[existingIndex] = uiTransaction;
      } else {
        this.transactions.unshift(uiTransaction);
      }
      
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to sync service transaction:', error);
    }
  }

  /**
   * Clear all transactions (useful for wallet switching)
   */
  public clearTransactions(): void {
    this.transactions = [];
    this.notifyListeners();
  }

  /**
   * Get transactions in date range
   */
  public getTransactionsInDateRange(startDate: Date, endDate: Date): Transaction[] {
    return this.getAllTransactions().filter(tx => {
      const txDate = tx.timestamp;
      return txDate >= startDate && txDate <= endDate;
    });
  }

  /**
   * Search transactions by various criteria
   */
  public searchTransactions(query: string): Transaction[] {
    const searchQuery = query.toLowerCase();
    return this.getAllTransactions().filter(tx => {
      return (
        tx.txHash.toLowerCase().includes(searchQuery) ||
        tx.metadata?.description?.toLowerCase().includes(searchQuery) ||
        tx.metadata?.tokenSymbol?.toLowerCase().includes(searchQuery) ||
        tx.type.toLowerCase().includes(searchQuery) ||
        tx.recipient?.toLowerCase().includes(searchQuery) ||
        tx.sender?.toLowerCase().includes(searchQuery)
      );
    });
  }
}

/**
 * Default singleton instance
 */
export const transactionManager = TransactionManager.getInstance();
