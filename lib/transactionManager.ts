import { Transaction, MOCK_TRANSACTIONS } from './transactions';
import { transactionService } from './transactionService';
import { convertServiceToUITransaction } from './transactionTypeMapping';
import { blockchainService } from './blockchainService';
import { WalletStorage } from './walletStorage';
// Import secure random source (BEFORE the shims)
import "react-native-get-random-values";

// Import the ethers shims (BEFORE importing ethers)
import "@ethersproject/shims";

import { ethers } from 'ethers';

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
    // Automatically load transactions on startup
    this.initializeTransactions();
  }

  /**
   * Initialize transactions on startup
   */
  private async initializeTransactions(): Promise<void> {
    try {
      await this.refreshTransactions();
    } catch (error) {
      console.error('Failed to initialize transactions:', error);
      // Don't throw - app should still work without transactions
    }
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
   * Convert blockchain transaction to UI transaction
   */
  private convertBlockchainToUITransaction(blockchainTx: any, walletAddress: string): Transaction {
    const isReceived = blockchainTx.to.toLowerCase() === walletAddress.toLowerCase();
    
    // Determine if this is an ERC-20 token transaction or native MATIC
    const isERC20 = blockchainTx.tokenAddress && blockchainTx.tokenSymbol;
    let tokenId: string;
    let amount: number;
    let tokenPrice: number;
    let tokenSymbol: string;
    let tokenName: string;
    let tokenDecimals: number;

    if (isERC20) {
      // Handle ERC-20 token transactions
      amount = parseFloat(blockchainTx.value); // Already formatted by blockchain service
      tokenSymbol = blockchainTx.tokenSymbol;
      tokenDecimals = blockchainTx.tokenDecimals;
      
      // Map token symbols to our internal token IDs and get prices
      switch (tokenSymbol) {
        case 'USDC':
          tokenId = 'usd';
          tokenPrice = 1.00; // USDC price
          tokenName = 'USD Coin';
          break;
        case 'PAXG':
          tokenId = 'gold';
          tokenPrice = 1950.00; // PAXG price estimate
          tokenName = 'PAX Gold';
          break;
        default:
          tokenId = 'unknown';
          tokenPrice = 0;
          tokenName = tokenSymbol;
      }
    } else {
      // Handle native MATIC transactions
      tokenId = 'gas';
      amount = parseFloat(ethers.formatEther(blockchainTx.value));
      tokenPrice = 500.00; // MATIC price estimate
      tokenSymbol = 'MATIC';
      tokenName = 'Polygon';
      tokenDecimals = 18;
    }

    // Calculate gas fee (always in MATIC)
    const gasFee = blockchainTx.gasUsed && blockchainTx.gasPrice 
      ? parseFloat(ethers.formatEther((BigInt(blockchainTx.gasUsed) * BigInt(blockchainTx.gasPrice)).toString()))
      : 0;

    return {
      id: `blockchain_${blockchainTx.hash}`,
      type: isReceived ? 'receive' : 'send',
      tokenId,
      amount,
      value: amount * tokenPrice,
      timestamp: new Date(blockchainTx.timestamp * 1000),
      status: blockchainTx.status === 1 ? 'completed' : 'failed',
      sender: blockchainTx.from,
      recipient: blockchainTx.to,
      txHash: blockchainTx.hash,
      blockNumber: blockchainTx.blockNumber,
      gasUsed: blockchainTx.gasUsed ? parseInt(blockchainTx.gasUsed) : undefined,
      gasPrice: blockchainTx.gasPrice ? parseInt(blockchainTx.gasPrice) : undefined,
      gasFee,
      metadata: {
        description: isReceived ? `Received ${tokenSymbol}` : `Sent ${tokenSymbol}`,
        tokenSymbol,
        tokenDecimals,
        tokenName,
        ...(isERC20 && { tokenAddress: blockchainTx.tokenAddress })
      }
    };
  }

  /**
   * Refresh transactions from blockchain service
   * Fetches real transaction data from the blockchain
   */
  public async refreshTransactions(): Promise<void> {
    try {
      console.log('Refreshing transactions from blockchain...');
      
      // Get current wallet address
      const walletAddress = await WalletStorage.getWalletAddress();
      if (!walletAddress) {
        console.log('No wallet address found, cannot fetch transactions');
        return;
      }

      console.log(`Refreshing transactions for wallet: ${walletAddress}`);

      // Ensure blockchain service is initialized
      let blockchainTransactions: any[] = [];
      try {
        await blockchainService.initialize('polygon'); // Initialize with Polygon network
        console.log('Blockchain service initialized successfully');
        
        // Fetch transactions from blockchain
        blockchainTransactions = await blockchainService.getTransactionHistory(walletAddress, 20);
        console.log(`Fetched ${blockchainTransactions.length} transactions from blockchain`);
      } catch (error) {
        console.error('Failed to initialize blockchain service or fetch transactions:', error);
        // Continue without blockchain transactions if initialization or fetching fails
        blockchainTransactions = [];
      }
      
      // Convert blockchain transactions to UI transactions
      const uiTransactions = blockchainTransactions.map(tx => 
        this.convertBlockchainToUITransaction(tx, walletAddress)
      );
      
      // Get transactions from transaction service
      const serviceTransactions = transactionService.getAllTransactions();
      const serviceUITransactions = serviceTransactions.map(convertServiceToUITransaction);
      
      // Combine all transactions
      const allTransactions = [...uiTransactions, ...serviceUITransactions, ...MOCK_TRANSACTIONS];
      
      // Remove duplicates by txHash
      const uniqueTransactions = allTransactions.filter((tx, index, self) => 
        index === self.findIndex(t => t.txHash === tx.txHash)
      );
      
      this.transactions = uniqueTransactions;
      this.notifyListeners();
      
      console.log(`Loaded ${uiTransactions.length} blockchain transactions, ${serviceUITransactions.length} service transactions, total: ${uniqueTransactions.length}`);
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
