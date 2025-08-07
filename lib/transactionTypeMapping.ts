import { Transaction as UITransaction } from './transactions';
import { Transaction as ServiceTransaction } from './transactionService';

/**
 * Type mapping utilities to bridge transaction service and UI transaction types
 */

/**
 * Map transaction service type to UI transaction type
 */
export function mapServiceTypeToUIType(serviceType: ServiceTransaction['type']): UITransaction['type'] {
  switch (serviceType) {
    case 'send':
      return 'send';
    case 'receive':
      return 'receive';
    case 'contract':
      return 'contract_interaction';
    case 'token_transfer':
      return 'send'; // Assume token transfers are sends for UI purposes
    default:
      return 'contract_interaction';
  }
}

/**
 * Map UI transaction type to service transaction type
 */
export function mapUITypeToServiceType(uiType: UITransaction['type']): ServiceTransaction['type'] {
  switch (uiType) {
    case 'send':
      return 'send';
    case 'receive':
      return 'receive';
    case 'contract_deployment':
    case 'contract_interaction':
    case 'approve':
      return 'contract';
    case 'swap':
    case 'stake':
    case 'unstake':
    case 'bridge':
    case 'liquidity_add':
    case 'liquidity_remove':
      return 'contract';
    default:
      return 'token_transfer';
  }
}

/**
 * Convert service transaction to UI transaction
 */
export function convertServiceToUITransaction(serviceTransaction: ServiceTransaction): UITransaction {
  const uiType = mapServiceTypeToUIType(serviceTransaction.type);
  
  return {
    id: serviceTransaction.id,
    type: uiType,
    tokenId: serviceTransaction.metadata?.tokenSymbol?.toLowerCase() || 'gas',
    amount: parseFloat(serviceTransaction.amount),
    value: parseFloat(serviceTransaction.amount), // Simplified - should calculate USD value
    timestamp: new Date(serviceTransaction.timestamp),
    status: mapServiceStatusToUIStatus(serviceTransaction.status),
    recipient: serviceTransaction.to,
    sender: serviceTransaction.from,
    txHash: serviceTransaction.hash || '',
    blockNumber: serviceTransaction.blockNumber,
    gasUsed: serviceTransaction.gasUsed ? parseInt(serviceTransaction.gasUsed) : undefined,
    gasPrice: serviceTransaction.gasPrice ? parseInt(serviceTransaction.gasPrice) : undefined,
    gasFee: serviceTransaction.fee ? parseFloat(serviceTransaction.fee) : undefined,
    contractAddress: serviceTransaction.metadata?.tokenAddress,
    methodName: serviceTransaction.metadata?.contractMethod,
    errorReason: serviceTransaction.error,
    metadata: {
      description: serviceTransaction.metadata?.description,
      tokenSymbol: serviceTransaction.metadata?.tokenSymbol,
      tokenDecimals: serviceTransaction.metadata?.tokenDecimals,
      tokenName: serviceTransaction.metadata?.tokenSymbol // Simplified
    }
  };
}

/**
 * Convert UI transaction to service transaction
 */
export function convertUIToServiceTransaction(uiTransaction: UITransaction): Partial<ServiceTransaction> {
  const serviceType = mapUITypeToServiceType(uiTransaction.type);
  
  return {
    id: uiTransaction.id,
    hash: uiTransaction.txHash,
    type: serviceType,
    status: mapUIStatusToServiceStatus(uiTransaction.status),
    from: uiTransaction.sender || '',
    to: uiTransaction.recipient || '',
    amount: uiTransaction.amount.toString(),
    currency: uiTransaction.metadata?.tokenSymbol || 'MATIC',
    gasUsed: uiTransaction.gasUsed?.toString(),
    gasPrice: uiTransaction.gasPrice?.toString(),
    fee: uiTransaction.gasFee?.toString(),
    timestamp: uiTransaction.timestamp.getTime(),
    confirmations: 1, // Simplified
    blockNumber: uiTransaction.blockNumber,
    error: uiTransaction.errorReason,
    metadata: {
      tokenAddress: uiTransaction.contractAddress,
      tokenSymbol: uiTransaction.metadata?.tokenSymbol,
      tokenDecimals: uiTransaction.metadata?.tokenDecimals,
      contractMethod: uiTransaction.methodName,
      description: uiTransaction.metadata?.description
    }
  };
}

/**
 * Map service transaction status to UI status
 */
function mapServiceStatusToUIStatus(serviceStatus: ServiceTransaction['status']): UITransaction['status'] {
  switch (serviceStatus.toString()) {
    case 'pending':
      return 'pending';
    case 'confirmed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'failed';
    default:
      return 'pending';
  }
}

/**
 * Map UI transaction status to service status
 */
function mapUIStatusToServiceStatus(uiStatus: UITransaction['status']): ServiceTransaction['status'] {
  switch (uiStatus) {
    case 'pending':
      return 'pending' as any;
    case 'completed':
      return 'confirmed' as any;
    case 'failed':
    case 'reverted':
      return 'failed' as any;
    default:
      return 'pending' as any;
  }
}

/**
 * Integration helper for transaction manager with transaction service
 */
export class TransactionServiceIntegration {
  /**
   * Sync service transactions to UI transaction manager
   */
  static syncServiceTransactionsToUI(
    serviceTransactions: ServiceTransaction[],
    onTransactionUpdate: (uiTransaction: UITransaction) => void
  ): void {
    serviceTransactions.forEach(serviceTransaction => {
      const uiTransaction = convertServiceToUITransaction(serviceTransaction);
      onTransactionUpdate(uiTransaction);
    });
  }

  /**
   * Create service transaction from UI transaction data
   */
  static createServiceTransactionFromUI(
    uiTransactionData: Partial<UITransaction>
  ): Partial<ServiceTransaction> {
    if (!uiTransactionData.id) {
      throw new Error('Transaction ID is required');
    }
    return convertUIToServiceTransaction(uiTransactionData as UITransaction);
  }
}
