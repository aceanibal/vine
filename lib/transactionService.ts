// Import secure random source (BEFORE the shims)
import "react-native-get-random-values";

// Import the ethers shims (BEFORE importing ethers)
import "@ethersproject/shims";

import { ethers } from 'ethers';
import { blockchainService } from './blockchainService';
import { BlockchainErrorHandler, withErrorHandling } from './blockchainErrorHandler';
import { BlockchainUtils } from './blockchainUtils';
import type { TransactionRequest, TransactionResult } from './blockchainService';

/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Enhanced transaction information
 */
export interface Transaction {
  id: string;
  hash?: string;
  type: 'send' | 'receive' | 'contract' | 'token_transfer';
  status: TransactionStatus;
  from: string;
  to: string;
  amount: string;
  currency: string;
  gasUsed?: string;
  gasPrice?: string;
  fee?: string;
  timestamp: number;
  confirmations: number;
  blockNumber?: number;
  error?: string;
  metadata?: {
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
    contractMethod?: string;
    description?: string;
  };
}

/**
 * Transaction progress callback
 */
export type TransactionProgressCallback = (transaction: Transaction) => void;

/**
 * Gas estimation options
 */
export interface GasOptions {
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  mode?: 'slow' | 'standard' | 'fast' | 'custom';
}

/**
 * Token transfer options
 */
export interface TokenTransferOptions {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  amount: string;
  to: string;
  gasOptions?: GasOptions;
}

/**
 * Transaction service class
 */
export class TransactionService {
  private static instance: TransactionService;
  private transactions: Map<string, Transaction> = new Map();
  private progressCallbacks: Map<string, TransactionProgressCallback> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  /**
   * Singleton pattern
   */
  public static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  /**
   * Send native currency (ETH, MATIC, etc.)
   */
  public async sendTransaction(
    to: string,
    amount: string,
    gasOptions?: GasOptions,
    onProgress?: TransactionProgressCallback
  ): Promise<Transaction | null> {
    return withErrorHandling(async () => {
      // Validate inputs
      const validationError = BlockchainErrorHandler.validateTransaction(to, amount);
      if (validationError) {
        throw validationError;
      }

      // Create transaction record
      const transaction: Transaction = {
        id: this.generateTransactionId(),
        type: 'send',
        status: TransactionStatus.PENDING,
        from: await blockchainService.getWalletAddress() || '',
        to: BlockchainUtils.Address.toChecksumAddress(to),
        amount,
        currency: blockchainService.getCurrentNetwork().symbol,
        timestamp: Date.now(),
        confirmations: 0
      };

      // Register progress callback
      if (onProgress) {
        this.progressCallbacks.set(transaction.id, onProgress);
      }

      try {
        // Check balance
        const balance = await blockchainService.getBalance();
        const requiredAmount = parseFloat(amount);
        const availableAmount = parseFloat(balance);

        if (requiredAmount > availableAmount) {
          throw new Error('Insufficient funds for transaction');
        }

        // Estimate gas if not provided
        let finalGasOptions = gasOptions;
        if (!finalGasOptions) {
          finalGasOptions = await this.estimateGas({ to, value: amount });
        }

        // Send transaction
        const result = await blockchainService.sendTransaction(to, amount, {
          gasLimit: finalGasOptions.gasLimit,
          gasPrice: finalGasOptions.gasPrice,
          maxFeePerGas: finalGasOptions.maxFeePerGas,
          maxPriorityFeePerGas: finalGasOptions.maxPriorityFeePerGas
        });

        // Update transaction with hash
        transaction.hash = result.hash;
        transaction.gasPrice = result.gasPrice;
        this.transactions.set(transaction.id, transaction);

        // Notify progress
        this.notifyProgress(transaction);

        // Start monitoring
        this.startTransactionMonitoring(transaction.id);

        // Show success notification
        BlockchainErrorHandler.showSuccess(
          `Transaction sent! Amount: ${amount} ${transaction.currency}`,
          result.hash
        );

        return transaction;
      } catch (error) {
        transaction.status = TransactionStatus.FAILED;
        transaction.error = error instanceof Error ? error.message : String(error);
        this.transactions.set(transaction.id, transaction);
        this.notifyProgress(transaction);
        throw error;
      }
    }, 'Send Transaction');
  }

  /**
   * Send ERC-20 tokens
   */
  public async sendToken(
    options: TokenTransferOptions,
    onProgress?: TransactionProgressCallback
  ): Promise<Transaction | null> {
    return withErrorHandling(async () => {
      // Validate inputs
      const validationError = BlockchainErrorHandler.validateTransaction(options.to, options.amount);
      if (validationError) {
        throw validationError;
      }

      // Create transaction record
      const transaction: Transaction = {
        id: this.generateTransactionId(),
        type: 'token_transfer',
        status: TransactionStatus.PENDING,
        from: await blockchainService.getWalletAddress() || '',
        to: BlockchainUtils.Address.toChecksumAddress(options.to),
        amount: options.amount,
        currency: options.tokenSymbol,
        timestamp: Date.now(),
        confirmations: 0,
        metadata: {
          tokenAddress: options.tokenAddress,
          tokenSymbol: options.tokenSymbol,
          tokenDecimals: options.tokenDecimals
        }
      };

      // Register progress callback
      if (onProgress) {
        this.progressCallbacks.set(transaction.id, onProgress);
      }

      try {
        // Check token balance
        const balance = await blockchainService.getTokenBalance(options.tokenAddress);
        const requiredAmount = parseFloat(options.amount);
        const availableAmount = parseFloat(balance);

        if (requiredAmount > availableAmount) {
          throw new Error(`Insufficient ${options.tokenSymbol} balance`);
        }

        // Estimate gas if not provided
        let finalGasOptions = options.gasOptions;
        if (!finalGasOptions) {
          finalGasOptions = await this.estimateTokenGas(options);
        }

        // Send token transfer
        const result = await blockchainService.sendToken(
          options.tokenAddress,
          options.to,
          options.amount,
          options.tokenDecimals,
          {
            gasLimit: finalGasOptions.gasLimit,
            gasPrice: finalGasOptions.gasPrice,
            maxFeePerGas: finalGasOptions.maxFeePerGas,
            maxPriorityFeePerGas: finalGasOptions.maxPriorityFeePerGas
          }
        );

        // Update transaction with hash
        transaction.hash = result.hash;
        transaction.gasPrice = result.gasPrice;
        this.transactions.set(transaction.id, transaction);

        // Notify progress
        this.notifyProgress(transaction);

        // Start monitoring
        this.startTransactionMonitoring(transaction.id);

        // Show success notification
        BlockchainErrorHandler.showSuccess(
          `Token transfer sent! Amount: ${options.amount} ${options.tokenSymbol}`,
          result.hash
        );

        return transaction;
      } catch (error) {
        transaction.status = TransactionStatus.FAILED;
        transaction.error = error instanceof Error ? error.message : String(error);
        this.transactions.set(transaction.id, transaction);
        this.notifyProgress(transaction);
        throw error;
      }
    }, 'Send Token');
  }

  /**
   * Execute smart contract method
   */
  public async executeContract(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[] = [],
    value?: string,
    gasOptions?: GasOptions,
    onProgress?: TransactionProgressCallback
  ): Promise<Transaction | null> {
    return withErrorHandling(async () => {
      // Create transaction record
      const transaction: Transaction = {
        id: this.generateTransactionId(),
        type: 'contract',
        status: TransactionStatus.PENDING,
        from: await blockchainService.getWalletAddress() || '',
        to: BlockchainUtils.Address.toChecksumAddress(contractAddress),
        amount: value || '0',
        currency: blockchainService.getCurrentNetwork().symbol,
        timestamp: Date.now(),
        confirmations: 0,
        metadata: {
          contractMethod: methodName,
          description: `Execute ${methodName} on contract`
        }
      };

      // Register progress callback
      if (onProgress) {
        this.progressCallbacks.set(transaction.id, onProgress);
      }

      try {
        // Estimate gas if not provided
        let finalGasOptions = gasOptions;
        if (!finalGasOptions) {
          finalGasOptions = await this.estimateContractGas(
            contractAddress,
            abi,
            methodName,
            params,
            value
          );
        }

        // Execute contract method
        const result = await blockchainService.executeContract({
          contractAddress,
          abi,
          methodName,
          params,
          value,
          gasLimit: finalGasOptions.gasLimit,
          gasPrice: finalGasOptions.gasPrice,
          maxFeePerGas: finalGasOptions.maxFeePerGas,
          maxPriorityFeePerGas: finalGasOptions.maxPriorityFeePerGas
        });

        // Update transaction with hash
        transaction.hash = result.hash;
        transaction.gasPrice = result.gasPrice;
        this.transactions.set(transaction.id, transaction);

        // Notify progress
        this.notifyProgress(transaction);

        // Start monitoring
        this.startTransactionMonitoring(transaction.id);

        // Show success notification
        BlockchainErrorHandler.showSuccess(
          `Contract interaction sent! Method: ${methodName}`,
          result.hash
        );

        return transaction;
      } catch (error) {
        transaction.status = TransactionStatus.FAILED;
        transaction.error = error instanceof Error ? error.message : String(error);
        this.transactions.set(transaction.id, transaction);
        this.notifyProgress(transaction);
        throw error;
      }
    }, 'Execute Contract');
  }

  /**
   * Estimate gas for native currency transaction
   */
  public async estimateGas(request: TransactionRequest): Promise<GasOptions> {
    return withErrorHandling(async () => {
      const gasEstimate = await blockchainService.estimateGas(request);
      const gasPrice = await blockchainService.getGasPrice();

      // Add 20% buffer to gas estimate
      const gasLimit = BlockchainUtils.Gas.addGasBuffer(gasEstimate, 20);

      return {
        gasLimit,
        ...gasPrice
      };
    }, 'Estimate Gas') || { gasLimit: BlockchainUtils.CONSTANTS.GAS_LIMITS.ETH_TRANSFER };
  }

  /**
   * Estimate gas for token transfer
   */
  public async estimateTokenGas(options: TokenTransferOptions): Promise<GasOptions> {
    return withErrorHandling(async () => {
      // Use standard ERC-20 gas limit as fallback
      const gasLimit = BlockchainUtils.CONSTANTS.GAS_LIMITS.ERC20_TRANSFER;
      const gasPrice = await blockchainService.getGasPrice();

      return {
        gasLimit,
        ...gasPrice
      };
    }, 'Estimate Token Gas') || { gasLimit: BlockchainUtils.CONSTANTS.GAS_LIMITS.ERC20_TRANSFER };
  }

  /**
   * Estimate gas for contract execution
   */
  public async estimateContractGas(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[],
    value?: string
  ): Promise<GasOptions> {
    return withErrorHandling(async () => {
      // For contract calls, use a higher default gas limit
      const gasLimit = '200000';
      const gasPrice = await blockchainService.getGasPrice();

      return {
        gasLimit,
        ...gasPrice
      };
    }, 'Estimate Contract Gas') || { gasLimit: '200000' };
  }

  /**
   * Get gas price recommendations
   */
  public async getGasPriceRecommendations(): Promise<{
    slow: GasOptions;
    standard: GasOptions;
    fast: GasOptions;
  }> {
    return withErrorHandling(async () => {
      const current = await blockchainService.getGasPrice();

      if (current.maxFeePerGas && current.maxPriorityFeePerGas) {
        // EIP-1559 network
        const baseFee = BigInt(current.maxFeePerGas) - BigInt(current.maxPriorityFeePerGas);
        const slowPriority = BigInt(current.maxPriorityFeePerGas) * BigInt(80) / BigInt(100);
        const fastPriority = BigInt(current.maxPriorityFeePerGas) * BigInt(150) / BigInt(100);

        return {
          slow: {
            maxFeePerGas: (baseFee + slowPriority).toString(),
            maxPriorityFeePerGas: slowPriority.toString(),
            mode: 'slow'
          },
          standard: {
            maxFeePerGas: current.maxFeePerGas,
            maxPriorityFeePerGas: current.maxPriorityFeePerGas,
            mode: 'standard'
          },
          fast: {
            maxFeePerGas: (baseFee + fastPriority).toString(),
            maxPriorityFeePerGas: fastPriority.toString(),
            mode: 'fast'
          }
        };
      } else if (current.gasPrice) {
        // Legacy network
        const baseGasPrice = BigInt(current.gasPrice);
        const slowGasPrice = baseGasPrice * BigInt(80) / BigInt(100);
        const fastGasPrice = baseGasPrice * BigInt(150) / BigInt(100);

        return {
          slow: { gasPrice: slowGasPrice.toString(), mode: 'slow' },
          standard: { gasPrice: current.gasPrice, mode: 'standard' },
          fast: { gasPrice: fastGasPrice.toString(), mode: 'fast' }
        };
      }

      throw new Error('Unable to get gas price');
    }, 'Gas Price Recommendations') || {
      slow: { gasPrice: BlockchainUtils.Gas.parseGasPrice(BlockchainUtils.CONSTANTS.DEFAULT_GAS_PRICES.SLOW), mode: 'slow' },
      standard: { gasPrice: BlockchainUtils.Gas.parseGasPrice(BlockchainUtils.CONSTANTS.DEFAULT_GAS_PRICES.STANDARD), mode: 'standard' },
      fast: { gasPrice: BlockchainUtils.Gas.parseGasPrice(BlockchainUtils.CONSTANTS.DEFAULT_GAS_PRICES.FAST), mode: 'fast' }
    };
  }

  /**
   * Get transaction by ID
   */
  public getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  /**
   * Get all transactions
   */
  public getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get transactions by status
   */
  public getTransactionsByStatus(status: TransactionStatus): Transaction[] {
    return this.getAllTransactions().filter(tx => tx.status === status);
  }

  /**
   * Cancel transaction monitoring
   */
  public cancelTransaction(id: string): void {
    const interval = this.monitoringIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(interval);
    }

    const transaction = this.transactions.get(id);
    if (transaction && transaction.status === TransactionStatus.PENDING) {
      transaction.status = TransactionStatus.CANCELLED;
      this.transactions.set(id, transaction);
      this.notifyProgress(transaction);
    }

    this.progressCallbacks.delete(id);
  }

  /**
   * Clear completed transactions
   */
  public clearCompletedTransactions(): void {
    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.status === TransactionStatus.CONFIRMED || transaction.status === TransactionStatus.FAILED) {
        this.transactions.delete(id);
        this.progressCallbacks.delete(id);
        
        const interval = this.monitoringIntervals.get(id);
        if (interval) {
          clearInterval(interval);
          this.monitoringIntervals.delete(id);
        }
      }
    }
  }

  /**
   * Start monitoring a transaction
   */
  private startTransactionMonitoring(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || !transaction.hash) return;

    const interval = setInterval(async () => {
      try {
        const result = await blockchainService.getTransaction(transaction.hash!);
        if (result) {
          transaction.confirmations = result.confirmations;
          transaction.gasUsed = result.gasUsed;
          transaction.blockNumber = result.blockNumber;

          // Calculate fee
          if (result.gasUsed && result.gasPrice) {
            transaction.fee = BlockchainUtils.Gas.calculateGasCost(result.gasUsed, result.gasPrice);
          }

          // Update status based on confirmations
          if (result.status === 0) {
            transaction.status = TransactionStatus.FAILED;
            transaction.error = 'Transaction failed on blockchain';
          } else if (result.confirmations >= 1) {
            transaction.status = TransactionStatus.CONFIRMED;
          }

          this.transactions.set(transactionId, transaction);
          this.notifyProgress(transaction);

          // Stop monitoring if confirmed or failed
          if (transaction.status !== TransactionStatus.PENDING) {
            clearInterval(interval);
            this.monitoringIntervals.delete(transactionId);
            
            // Clean up callback after completion
            setTimeout(() => {
              this.progressCallbacks.delete(transactionId);
            }, 30000); // Keep callback for 30 seconds after completion
          }
        }
      } catch (error) {
        console.error('Error monitoring transaction:', error);
      }
    }, 10000); // Check every 10 seconds

    this.monitoringIntervals.set(transactionId, interval);

    // Timeout after 10 minutes
    setTimeout(() => {
      if (this.monitoringIntervals.has(transactionId)) {
        clearInterval(interval);
        this.monitoringIntervals.delete(transactionId);
        
        const tx = this.transactions.get(transactionId);
        if (tx && tx.status === TransactionStatus.PENDING) {
          tx.status = TransactionStatus.FAILED;
          tx.error = 'Transaction monitoring timeout';
          this.transactions.set(transactionId, tx);
          this.notifyProgress(tx);
        }
      }
    }, 600000); // 10 minutes
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(transaction: Transaction): void {
    const callback = this.progressCallbacks.get(transaction.id);
    if (callback) {
      callback(transaction);
    }
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup all monitoring
   */
  public cleanup(): void {
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
    this.progressCallbacks.clear();
  }
}

/**
 * Default service instance
 */
export const transactionService = TransactionService.getInstance();