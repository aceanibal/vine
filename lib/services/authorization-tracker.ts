import { useGlobalStore } from '../stores/useGlobalStore';

export interface AuthorizationTransaction {
  hash: string;
  operation: 'Authorization' | 'Revocation';
  status: 'idle' | 'pending' | 'success' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
  step?: string | null;
  progress?: number | null;
  logs?: { at: string; message: string; data?: any }[];
  context?: {
    walletAddress?: string;
    delegationAddress?: string;
  } | null;
}

/**
 * Track authorization transaction progress in the global store
 * Similar to active transaction tracking but specifically for authorization/revocation
 */
export class AuthorizationTracker {
  private static instance: AuthorizationTracker;
  private store = useGlobalStore.getState();

  static getInstance(): AuthorizationTracker {
    if (!AuthorizationTracker.instance) {
      AuthorizationTracker.instance = new AuthorizationTracker();
    }
    return AuthorizationTracker.instance;
  }

  /**
   * Start tracking a new authorization transaction
   */
  startAuthorization(walletAddress: string, delegationAddress: string): void {
    console.log('[AuthorizationTracker] Starting authorization tracking for:', walletAddress);
    
    this.store.setActiveTransaction({
      hash: null,
      operation: 'Delegation',
      status: 'pending',
      startedAt: new Date().toISOString(),
      step: 'Initiating authorization...',
      progress: 0,
      logs: [{
        at: new Date().toISOString(),
        message: 'Starting wallet authorization process',
        data: { walletAddress, delegationAddress }
      }],
      context: {
        toAddress: walletAddress,
        chainId: 137, // Polygon
        tokenAddress: delegationAddress
      }
    });

    this.addLog('Authorization request initiated');
    this.setStep('Preparing authorization transaction', 10);
  }

  /**
   * Update transaction hash when received
   */
  setTransactionHash(hash: string): void {
    console.log('[AuthorizationTracker] Setting transaction hash:', hash);
    
    this.store.updateActiveTransactionStatus('pending', hash);
    this.addLog(`Transaction submitted: ${hash.slice(0, 10)}...${hash.slice(-8)}`);
    this.setStep('Transaction submitted to blockchain', 30);
  }

  /**
   * Update when transaction is mined
   */
  setTransactionMined(): void {
    console.log('[AuthorizationTracker] Transaction mined');
    
    this.addLog('Transaction confirmed on blockchain');
    this.setStep('Transaction confirmed', 60);
  }

  /**
   * Update when delegation status is being checked
   */
  setCheckingDelegation(): void {
    console.log('[AuthorizationTracker] Checking delegation status');
    
    this.addLog('Verifying delegation status');
    this.setStep('Verifying authorization', 80);
  }

  /**
   * Complete authorization successfully
   */
  completeAuthorization(): void {
    console.log('[AuthorizationTracker] Authorization completed successfully');
    
    this.store.updateActiveTransactionStatus('success');
    this.addLog('Authorization completed successfully');
    this.setStep('Authorization complete', 100);
  }

  /**
   * Fail authorization
   */
  failAuthorization(error: string): void {
    console.log('[AuthorizationTracker] Authorization failed:', error);
    
    this.store.updateActiveTransactionStatus('failed');
    this.addLog(`Authorization failed: ${error}`);
    this.setStep('Authorization failed', null);
  }

  /**
   * Start tracking a revocation transaction
   */
  startRevocation(walletAddress: string, delegationAddress: string): void {
    console.log('[AuthorizationTracker] Starting revocation tracking for:', walletAddress);
    
    this.store.setActiveTransaction({
      hash: null,
      operation: 'Delegation',
      status: 'pending',
      startedAt: new Date().toISOString(),
      step: 'Initiating revocation...',
      progress: 0,
      logs: [{
        at: new Date().toISOString(),
        message: 'Starting wallet revocation process',
        data: { walletAddress, delegationAddress }
      }],
      context: {
        toAddress: walletAddress,
        chainId: 137, // Polygon
        tokenAddress: delegationAddress
      }
    });

    this.addLog('Revocation request initiated');
    this.setStep('Preparing revocation transaction', 10);
  }

  /**
   * Complete revocation successfully
   */
  completeRevocation(): void {
    console.log('[AuthorizationTracker] Revocation completed successfully');
    
    this.store.updateActiveTransactionStatus('success');
    this.addLog('Revocation completed successfully');
    this.setStep('Revocation complete', 100);
  }

  /**
   * Fail revocation
   */
  failRevocation(error: string): void {
    console.log('[AuthorizationTracker] Revocation failed:', error);
    
    this.store.updateActiveTransactionStatus('failed');
    this.addLog(`Revocation failed: ${error}`);
    this.setStep('Revocation failed', null);
  }

  /**
   * Get the current transaction hash
   */
  getCurrentTransactionHash(): string | null {
    return this.store.activeTransaction.hash;
  }

  /**
   * Get the current transaction status
   */
  getCurrentTransactionStatus(): string {
    return this.store.activeTransaction.status;
  }

  /**
   * Get the current transaction details
   */
  getCurrentTransactionDetails(): {
    hash: string | null;
    status: string;
    operation: string | null;
    step: string | null;
    progress: number | null;
    logs: { at: string; message: string; data?: any }[];
  } {
    const tx = this.store.activeTransaction;
    return {
      hash: tx.hash,
      status: tx.status,
      operation: tx.operation,
      step: tx.step,
      progress: tx.progress,
      logs: tx.logs || []
    };
  }

  /**
   * Clear the current authorization transaction
   */
  clear(): void {
    console.log('[AuthorizationTracker] Clearing authorization transaction');
    this.store.clearActiveTransaction();
  }

  /**
   * Add a log entry to the current transaction
   */
  private addLog(message: string, data?: any): void {
    this.store.addActiveTransactionLog(message, data);
  }

  /**
   * Update the current step and progress
   */
  private setStep(step: string, progress: number | null): void {
    this.store.setActiveTransactionStep(step, progress);
  }
}

// Export singleton instance
export const authorizationTracker = AuthorizationTracker.getInstance();
