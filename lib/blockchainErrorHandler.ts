import { blockchainService } from './blockchainService';

/**
 * Error types for blockchain operations
 */
export enum BlockchainErrorType {
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  USER_REJECTED = 'USER_REJECTED',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Structured error information
 */
export interface BlockchainError {
  type: BlockchainErrorType;
  severity: ErrorSeverity;
  title: string;
  message: string;
  details?: string;
  actionable: boolean;
  suggestedActions?: string[];
  technicalInfo?: {
    originalError: any;
    code?: string | number;
    txHash?: string;
    gasUsed?: string;
  };
}

/**
 * Modal configuration for error display
 */
export interface ErrorModalConfig {
  title: string;
  message: string;
  severity: ErrorSeverity;
  primaryAction?: {
    label: string;
    action: () => void;
  };
  secondaryAction?: {
    label: string;
    action: () => void;
  };
  showTechnicalDetails?: boolean;
  technicalDetails?: string;
  autoClose?: number; // milliseconds
}

/**
 * Blockchain error handler class
 */
export class BlockchainErrorHandler {
  private static errorModalCallback: ((config: ErrorModalConfig) => void) | null = null;
  private static toastCallback: ((message: string, type: 'success' | 'error' | 'warning' | 'info') => void) | null = null;

  /**
   * Set the callback for showing error modals (custom modal component)
   */
  static setErrorModalCallback(callback: (config: ErrorModalConfig) => void): void {
    this.errorModalCallback = callback;
  }

  /**
   * Set the callback for showing toast notifications
   */
  static setToastCallback(callback: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void): void {
    this.toastCallback = callback;
  }

  /**
   * Parse raw error into structured blockchain error
   */
  static parseError(error: any): BlockchainError {
    // Handle ethers.js specific errors
    if (error.code) {
      switch (error.code) {
        case 'INSUFFICIENT_FUNDS':
          return {
            type: BlockchainErrorType.INSUFFICIENT_FUNDS,
            severity: ErrorSeverity.HIGH,
            title: 'Insufficient Funds',
            message: 'You don\'t have enough funds to complete this transaction.',
            actionable: true,
            suggestedActions: [
              'Add more funds to your wallet',
              'Reduce the transaction amount',
              'Check network fees'
            ],
            technicalInfo: { originalError: error, code: error.code }
          };

        case 'UNPREDICTABLE_GAS_LIMIT':
          return {
            type: BlockchainErrorType.GAS_ESTIMATION_FAILED,
            severity: ErrorSeverity.MEDIUM,
            title: 'Gas Estimation Failed',
            message: 'Unable to estimate gas for this transaction. It may fail.',
            actionable: true,
            suggestedActions: [
              'Check contract parameters',
              'Verify recipient address',
              'Try again with manual gas limit'
            ],
            technicalInfo: { originalError: error, code: error.code }
          };

        case 'NONCE_EXPIRED':
          return {
            type: BlockchainErrorType.TRANSACTION_FAILED,
            severity: ErrorSeverity.MEDIUM,
            title: 'Transaction Nonce Error',
            message: 'Transaction nonce is outdated. Please try again.',
            actionable: true,
            suggestedActions: [
              'Wait a moment and retry',
              'Reset wallet connection'
            ],
            technicalInfo: { originalError: error, code: error.code }
          };

        case 'REPLACEMENT_UNDERPRICED':
          return {
            type: BlockchainErrorType.TRANSACTION_FAILED,
            severity: ErrorSeverity.MEDIUM,
            title: 'Gas Price Too Low',
            message: 'Transaction gas price is too low to replace pending transaction.',
            actionable: true,
            suggestedActions: [
              'Increase gas price',
              'Wait for pending transaction to complete'
            ],
            technicalInfo: { originalError: error, code: error.code }
          };

        case 'NETWORK_ERROR':
          return {
            type: BlockchainErrorType.NETWORK_ERROR,
            severity: ErrorSeverity.HIGH,
            title: 'Network Connection Error',
            message: 'Unable to connect to the blockchain network.',
            actionable: true,
            suggestedActions: [
              'Check your internet connection',
              'Try switching network providers',
              'Wait and try again'
            ],
            technicalInfo: { originalError: error, code: error.code }
          };

        case 'ACTION_REJECTED':
        case 'USER_REJECTED':
          return {
            type: BlockchainErrorType.USER_REJECTED,
            severity: ErrorSeverity.LOW,
            title: 'Transaction Cancelled',
            message: 'You cancelled the transaction.',
            actionable: false,
            technicalInfo: { originalError: error, code: error.code }
          };
      }
    }

    // Handle string error messages
    if (typeof error === 'string' || error.message) {
      const message = typeof error === 'string' ? error : error.message;
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('insufficient funds')) {
        return {
          type: BlockchainErrorType.INSUFFICIENT_FUNDS,
          severity: ErrorSeverity.HIGH,
          title: 'Insufficient Funds',
          message: 'You don\'t have enough funds to complete this transaction.',
          actionable: true,
          suggestedActions: ['Add more funds to your wallet'],
          technicalInfo: { originalError: error }
        };
      }

      if (lowerMessage.includes('user rejected') || lowerMessage.includes('user denied')) {
        return {
          type: BlockchainErrorType.USER_REJECTED,
          severity: ErrorSeverity.LOW,
          title: 'Transaction Cancelled',
          message: 'You cancelled the transaction.',
          actionable: false,
          technicalInfo: { originalError: error }
        };
      }

      if (lowerMessage.includes('invalid address')) {
        return {
          type: BlockchainErrorType.INVALID_ADDRESS,
          severity: ErrorSeverity.MEDIUM,
          title: 'Invalid Address',
          message: 'The provided address is not valid.',
          actionable: true,
          suggestedActions: ['Check the address format', 'Copy address from a trusted source'],
          technicalInfo: { originalError: error }
        };
      }

      if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
        return {
          type: BlockchainErrorType.NETWORK_ERROR,
          severity: ErrorSeverity.HIGH,
          title: 'Network Error',
          message: 'Failed to connect to the blockchain network.',
          actionable: true,
          suggestedActions: ['Check internet connection', 'Try again'],
          technicalInfo: { originalError: error }
        };
      }

      if (lowerMessage.includes('contract') || lowerMessage.includes('revert')) {
        return {
          type: BlockchainErrorType.CONTRACT_ERROR,
          severity: ErrorSeverity.MEDIUM,
          title: 'Smart Contract Error',
          message: 'The smart contract rejected the transaction.',
          details: message,
          actionable: true,
          suggestedActions: ['Check transaction parameters', 'Contact support if issue persists'],
          technicalInfo: { originalError: error }
        };
      }
    }

    // Default unknown error
    return {
      type: BlockchainErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again.',
      details: typeof error === 'string' ? error : error.message || 'Unknown error',
      actionable: true,
      suggestedActions: ['Try again', 'Contact support if issue persists'],
      technicalInfo: { originalError: error }
    };
  }

  /**
   * Handle error with appropriate UI feedback
   */
  static async handleError(error: any, context?: string): Promise<void> {
    const structuredError = this.parseError(error);

    // Log error for debugging
    console.error(`Blockchain Error${context ? ` (${context})` : ''}:`, {
      type: structuredError.type,
      severity: structuredError.severity,
      message: structuredError.message,
      details: structuredError.details,
      technicalInfo: structuredError.technicalInfo
    });

    // Show appropriate UI feedback based on severity
    switch (structuredError.severity) {
      case ErrorSeverity.LOW:
        // Show toast for low severity errors
        if (this.toastCallback) {
          this.toastCallback(structuredError.message, 'warning');
        }
        break;

      case ErrorSeverity.MEDIUM:
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        // Show modal for medium+ severity errors
        this.showErrorModal(structuredError);
        break;
    }
  }

  /**
   * Show error modal with custom modal component
   */
  private static showErrorModal(error: BlockchainError): void {
    if (!this.errorModalCallback) {
      // Fallback to console if no modal callback is set
      console.error('No error modal callback set:', error);
      return;
    }

    const modalConfig: ErrorModalConfig = {
      title: error.title,
      message: error.message,
      severity: error.severity,
      showTechnicalDetails: Boolean(error.details || error.technicalInfo),
      technicalDetails: error.details || JSON.stringify(error.technicalInfo, null, 2),
    };

    // Add action buttons based on error type
    if (error.actionable && error.suggestedActions) {
      modalConfig.primaryAction = {
        label: 'Got it',
        action: () => {} // Close modal
      };

      if (error.suggestedActions.length > 0) {
        modalConfig.secondaryAction = {
          label: 'Get Help',
          action: () => {
            // Could open help documentation or support
            console.log('Help requested for error:', error.type);
          }
        };
      }
    }

    // Auto-close for low severity errors
    if (error.severity === ErrorSeverity.LOW) {
      modalConfig.autoClose = 3000;
    }

    this.errorModalCallback(modalConfig);
  }

  /**
   * Show success notification
   */
  static showSuccess(message: string, txHash?: string): void {
    if (this.toastCallback) {
      this.toastCallback(message, 'success');
    }

    // Optionally show additional info for transactions
    if (txHash && this.errorModalCallback) {
      const network = blockchainService.getCurrentNetwork();
      const explorerUrl = `${network.blockExplorerUrls[0]}/tx/${txHash}`;

      this.errorModalCallback({
        title: 'Transaction Successful',
        message: message,
        severity: ErrorSeverity.LOW,
        primaryAction: {
          label: 'View on Explorer',
          action: () => {
            // Open block explorer (would need proper linking implementation)
            console.log('Open explorer:', explorerUrl);
          }
        },
        secondaryAction: {
          label: 'Close',
          action: () => {}
        },
        autoClose: 5000
      });
    }
  }

  /**
   * Validate transaction before sending
   */
  static validateTransaction(to: string, amount: string): BlockchainError | null {
    // Validate address
    try {
      if (!to || !to.trim()) {
        return {
          type: BlockchainErrorType.INVALID_ADDRESS,
          severity: ErrorSeverity.HIGH,
          title: 'Missing Address',
          message: 'Please enter a recipient address.',
          actionable: true,
          suggestedActions: ['Enter a valid address']
        };
      }

      // Use ethers.js to validate address
      const { ethers } = require('ethers');
      if (!ethers.isAddress(to)) {
        return {
          type: BlockchainErrorType.INVALID_ADDRESS,
          severity: ErrorSeverity.HIGH,
          title: 'Invalid Address',
          message: 'The recipient address is not valid.',
          actionable: true,
          suggestedActions: ['Check the address format', 'Copy from a trusted source']
        };
      }
    } catch (error) {
      return {
        type: BlockchainErrorType.INVALID_ADDRESS,
        severity: ErrorSeverity.HIGH,
        title: 'Invalid Address',
        message: 'The recipient address is not valid.',
        actionable: true,
        suggestedActions: ['Check the address format']
      };
    }

    // Validate amount
    try {
      if (!amount || !amount.trim()) {
        return {
          type: BlockchainErrorType.INVALID_AMOUNT,
          severity: ErrorSeverity.HIGH,
          title: 'Missing Amount',
          message: 'Please enter a transaction amount.',
          actionable: true,
          suggestedActions: ['Enter a valid amount']
        };
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return {
          type: BlockchainErrorType.INVALID_AMOUNT,
          severity: ErrorSeverity.HIGH,
          title: 'Invalid Amount',
          message: 'Please enter a valid amount greater than 0.',
          actionable: true,
          suggestedActions: ['Enter a positive number']
        };
      }

      if (numAmount > Number.MAX_SAFE_INTEGER) {
        return {
          type: BlockchainErrorType.INVALID_AMOUNT,
          severity: ErrorSeverity.HIGH,
          title: 'Amount Too Large',
          message: 'The amount is too large to process.',
          actionable: true,
          suggestedActions: ['Enter a smaller amount']
        };
      }
    } catch (error) {
      return {
        type: BlockchainErrorType.INVALID_AMOUNT,
        severity: ErrorSeverity.HIGH,
        title: 'Invalid Amount',
        message: 'Please enter a valid amount.',
        actionable: true,
        suggestedActions: ['Enter a valid number']
      };
    }

    return null; // No validation errors
  }

  /**
   * Handle wallet connection errors
   */
  static handleWalletError(error: any): void {
    const walletError: BlockchainError = {
      type: BlockchainErrorType.WALLET_NOT_CONNECTED,
      severity: ErrorSeverity.HIGH,
      title: 'Wallet Connection Error',
      message: 'Unable to connect to your wallet.',
      actionable: true,
      suggestedActions: [
        'Check if wallet is created',
        'Restart the app',
        'Contact support if issue persists'
      ],
      technicalInfo: { originalError: error }
    };

    this.showErrorModal(walletError);
  }

  /**
   * Handle provider connection errors
   */
  static handleProviderError(error: any): void {
    const providerError: BlockchainError = {
      type: BlockchainErrorType.PROVIDER_ERROR,
      severity: ErrorSeverity.CRITICAL,
      title: 'Blockchain Connection Error',
      message: 'Unable to connect to the blockchain network.',
      actionable: true,
      suggestedActions: [
        'Check internet connection',
        'Try switching networks',
        'Contact support if issue persists'
      ],
      technicalInfo: { originalError: error }
    };

    this.showErrorModal(providerError);
  }

  /**
   * Create transaction error with specific details
   */
  static createTransactionError(txHash: string, error: any): BlockchainError {
    return {
      type: BlockchainErrorType.TRANSACTION_FAILED,
      severity: ErrorSeverity.HIGH,
      title: 'Transaction Failed',
      message: 'Your transaction was submitted but failed to execute.',
      details: typeof error === 'string' ? error : error.message,
      actionable: true,
      suggestedActions: [
        'Check transaction on block explorer',
        'Try again with higher gas price',
        'Contact support if needed'
      ],
      technicalInfo: {
        originalError: error,
        txHash: txHash
      }
    };
  }

  /**
   * Get user-friendly error message for specific error types
   */
  static getErrorMessage(errorType: BlockchainErrorType): string {
    const messages: Record<BlockchainErrorType, string> = {
      [BlockchainErrorType.WALLET_NOT_CONNECTED]: 'Please connect your wallet to continue.',
      [BlockchainErrorType.INSUFFICIENT_FUNDS]: 'You don\'t have enough funds for this transaction.',
      [BlockchainErrorType.NETWORK_ERROR]: 'Network connection failed. Please try again.',
      [BlockchainErrorType.TRANSACTION_FAILED]: 'Transaction failed. Please try again.',
      [BlockchainErrorType.INVALID_ADDRESS]: 'Please enter a valid address.',
      [BlockchainErrorType.INVALID_AMOUNT]: 'Please enter a valid amount.',
      [BlockchainErrorType.USER_REJECTED]: 'Transaction was cancelled.',
      [BlockchainErrorType.GAS_ESTIMATION_FAILED]: 'Unable to estimate gas for this transaction.',
      [BlockchainErrorType.CONTRACT_ERROR]: 'Smart contract error occurred.',
      [BlockchainErrorType.PROVIDER_ERROR]: 'Blockchain provider error.',
      [BlockchainErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred.'
    };

    return messages[errorType] || 'An error occurred.';
  }
}

/**
 * Convenience function for handling errors in async operations
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    await BlockchainErrorHandler.handleError(error, context);
    return null;
  }
}

/**
 * Export for easy usage
 */
export { BlockchainErrorHandler as ErrorHandler };