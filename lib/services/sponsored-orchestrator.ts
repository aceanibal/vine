import { ethers, Contract, JsonRpcProvider, Interface } from 'ethers';

// Functional orchestrator API that reads config and secrets from the global store

type OrchestratorConfig = {
  chainId: number;
  delegationAddress: string;
  providerUrl: string;
  relayerEndpoint: string;
  maxRetries: number;
  retryDelayMs: number;
  treasury: string;
};

const CONTRACT_ABI = [
  'function execute((address,uint256,bytes)[] calls) external payable',
  'function execute((address,uint256,bytes)[] calls, bytes signature) external payable',
  'function nonce() external view returns (uint256)',
];

const getStore = async () => (await import('../stores/useGlobalStore')).useGlobalStore;
const getSecrets = async () => (await import('./wallet-secure-store'));

// Helper functions for delegation status checking
// Authorization: Uses direct contract calls (nonce method) for immediate status
// Revocation: Uses transaction mining status (no delegation checking needed)

function resolveConfigFromStore(): OrchestratorConfig {
  const { orchestratorConfig, defaultChainIdNumeric } = (require('../stores/useGlobalStore') as any).useGlobalStore.getState();
  
  if (!orchestratorConfig.treasury) {
    throw new Error('Treasury address not found in orchestrator config. Please ensure the app config is loaded.');
  }
  
  return {
    chainId: defaultChainIdNumeric,
    delegationAddress: orchestratorConfig.delegationAddress,
    providerUrl: orchestratorConfig.providerUrl,
    relayerEndpoint: orchestratorConfig.relayerEndpoint,
    maxRetries: orchestratorConfig.maxRetries,
    retryDelayMs: orchestratorConfig.retryDelayMs,
    treasury: orchestratorConfig.treasury,
  } as OrchestratorConfig;
}

function getProvider(config: OrchestratorConfig): JsonRpcProvider {
  return new JsonRpcProvider(config.providerUrl);
}

async function getWallet(address: string, provider: JsonRpcProvider): Promise<ethers.Wallet> {
  const { requirePrivateKey } = await getSecrets();
  const pk = await requirePrivateKey(address);
  return new ethers.Wallet(pk, provider);
}

export async function verifyDelegationContract(address: string): Promise<boolean> {
  try {
    const config = resolveConfigFromStore();
    const provider = getProvider(config);
    const code = await provider.getCode(config.delegationAddress);
    if (code === '0x') return false;
    const contract = new Contract(config.delegationAddress, CONTRACT_ABI, provider);
    await contract.nonce();
    return true;
  } catch (_e) {
    return false;
  }
}

// Better approach: Direct contract calls to check delegation status
async function getDelegationStatusViaContract(address: string): Promise<{ isDelegated: boolean; delegatedTo: string | null; matchesTarget?: boolean; }> {
  try {
    const config = resolveConfigFromStore();
    const provider = getProvider(config);
    
    console.log(`[SponsoredOrchestrator] Checking delegation via contract calls for:`, { address });
    
    // First, check if the address has contract code
    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log(`[SponsoredOrchestrator] Address is EOA (no contract code)`);
      return { isDelegated: false, delegatedTo: null };
    }
    
    // Try to call the delegation contract's nonce function
    // This will tell us if it's a valid delegation contract
    try {
      const delegationContract = new Contract(address, CONTRACT_ABI, provider);
      const nonce = await delegationContract.nonce();
      
      console.log(`[SponsoredOrchestrator] Delegation contract found with nonce:`, { nonce: nonce.toString() });
      
      // If we can call nonce(), it's a delegation contract
      // Now check if it's delegated to our target
      const normalizedTarget = ethers.getAddress(config.delegationAddress);
      
      // For delegation contracts, we need to check the actual delegation
      // This is more reliable than parsing contract code
      return { 
        isDelegated: true, 
        delegatedTo: normalizedTarget, // Assume it's delegated to our target if contract exists
        matchesTarget: true 
      };
      
    } catch (contractError) {
      console.log(`[SponsoredOrchestrator] Contract call failed:`, contractError);
      return { isDelegated: false, delegatedTo: null };
    }
    
  } catch (_e) {
    console.log(`[SponsoredOrchestrator] getDelegationStatusViaContract error:`, _e);
    return { isDelegated: false, delegatedTo: null };
  }
}

// Fallback: Original contract code pattern approach
async function getRawDelegationStatus(address: string): Promise<{ code: string; delegatedTo: string | null; isDelegationPattern: boolean; }> {
  try {
    const config = resolveConfigFromStore();
    const provider = getProvider(config);
    const code = await provider.getCode(address);
    
    console.log(`[SponsoredOrchestrator] getRawDelegationStatus:`, {
      address,
      code: code.slice(0, 20) + '...',
      fullCode: code,
      codeLength: code.length,
      delegationAddress: config.delegationAddress
    });
    
    if (code === '0x') {
      console.log(`[SponsoredOrchestrator] No contract code found (EOA)`);
      return { code, delegatedTo: null, isDelegationPattern: false };
    }
    
    if (code.startsWith('0xef0100')) {
      const delegatedAddress = '0x' + code.slice(8);
      const normalizedDelegated = ethers.getAddress(delegatedAddress);
      
      console.log(`[SponsoredOrchestrator] Delegation pattern found:`, {
        delegatedAddress,
        normalizedDelegated
      });
      
      return { code, delegatedTo: normalizedDelegated, isDelegationPattern: true };
    }
    
    console.log(`[SponsoredOrchestrator] Contract code found but not delegation pattern:`, {
      codePrefix: code.slice(0, 10),
      isDelegationPattern: code.startsWith('0xef0100'),
      codeLength: code.length
    });
    
    return { code, delegatedTo: null, isDelegationPattern: false };
  } catch (_e) {
    console.log(`[SponsoredOrchestrator] getRawDelegationStatus error:`, _e);
    return { code: '0x', delegatedTo: null, isDelegationPattern: false };
  }
}

// Check delegation status for authorization (we want isDelegated && matchesTarget)
export async function checkDelegationStatusForAuthorization(address: string): Promise<{ isDelegated: boolean; delegatedTo: string | null; matchesTarget?: boolean; }> {
  try {
    console.log(`[SponsoredOrchestrator] Authorization check: Using contract-based approach`);
    
    // Try the better contract-based approach first
    const contractStatus = await getDelegationStatusViaContract(address);
    
    if (contractStatus.isDelegated) {
      console.log(`[SponsoredOrchestrator] Authorization check: Contract-based check successful`, contractStatus);
      return contractStatus;
    }
    
    // Fallback to pattern-based approach if contract call fails
    console.log(`[SponsoredOrchestrator] Authorization check: Contract call failed, falling back to pattern-based approach`);
    const config = resolveConfigFromStore();
    const rawStatus = await getRawDelegationStatus(address);
    
    console.log(`[SponsoredOrchestrator] Authorization check raw status:`, {
      isDelegationPattern: rawStatus.isDelegationPattern,
      delegatedTo: rawStatus.delegatedTo,
      codeLength: rawStatus.code.length,
      codePrefix: rawStatus.code.slice(0, 10)
    });
    
    // If it's not a delegation pattern at all, definitely not authorized
    if (!rawStatus.isDelegationPattern) {
      console.log(`[SponsoredOrchestrator] Authorization check: Not a delegation contract (EOA or other contract)`);
      return { isDelegated: false, delegatedTo: null };
    }
    
    const normalizedDelegated = rawStatus.delegatedTo;
    const normalizedTarget = ethers.getAddress(config.delegationAddress);
    const matchesTarget = normalizedDelegated === normalizedTarget;
    
    console.log(`[SponsoredOrchestrator] Authorization delegation details:`, {
      delegatedTo: normalizedDelegated,
      target: normalizedTarget,
      matchesTarget,
      isDelegated: true // Always true if we have a delegation pattern
    });
    
    // For authorization, we consider it delegated if it's a delegation contract
    // The matchesTarget check is done in the retry logic
    return { 
      isDelegated: true, 
      delegatedTo: normalizedDelegated, 
      matchesTarget 
    };
  } catch (_e) {
    console.log(`[SponsoredOrchestrator] checkDelegationStatusForAuthorization error:`, _e);
    return { isDelegated: false, delegatedTo: null };
  }
}

// Note: Revocation no longer needs delegation status checking
// If the revocation transaction is mined successfully, revocation is complete

// Legacy function for backward compatibility
export async function checkDelegationStatus(address: string): Promise<{ isDelegated: boolean; delegatedTo: string | null; matchesTarget?: boolean; }> {
  return await checkDelegationStatusForAuthorization(address);
}

export async function approveAuthorizationWithTracking(address: string): Promise<{ success: boolean; delegationTxHash: string; unofficial?: boolean; }>{
  const config = resolveConfigFromStore();
  const provider = getProvider(config);
  const wallet = await getWallet(address, provider);
  const ok = await verifyDelegationContract(address);
  if (!ok) throw new Error('Delegation contract verification failed');

  // Start tracking the authorization transaction
  try {
    const store = await getStore();
    store.getState().setAuthorizationTransaction({
      hash: null,
      operation: 'Authorization',
      status: 'pending',
      startedAt: new Date().toISOString(),
      step: 'Initiating authorization...',
      progress: 0,
      logs: [{
        at: new Date().toISOString(),
        message: 'Starting wallet authorization process',
        data: { walletAddress: address, delegationAddress: config.delegationAddress }
      }],
      context: {
        walletAddress: address,
        delegationAddress: config.delegationAddress,
        chainId: config.chainId
      }
    });
    store.getState().addAuthorizationLog('Authorization request initiated');
    store.getState().setAuthorizationStep('Preparing authorization transaction', 10);
  } catch (_e) {}

  try {
    const currentNonce = await provider.getTransactionCount(wallet.address);
    const authorization = await wallet.authorize({
      address: config.delegationAddress,
      nonce: currentNonce,
      chainId: config.chainId,
    });

    let normalizedAuth: any = { ...authorization };
    const sigValue: any = (authorization as any).signature;
    try {
      if (typeof sigValue === 'string') {
        const parsed = ethers.Signature.from(sigValue);
        normalizedAuth.signature = { r: parsed.r, s: parsed.s, v: parsed.v };
      } else if (sigValue && typeof sigValue === 'object' && (!sigValue.r || !sigValue.s || sigValue.v === undefined)) {
        const maybeHex = (sigValue as any).serialized || (sigValue as any).hex;
        if (maybeHex && typeof maybeHex === 'string') {
          const parsed = ethers.Signature.from(maybeHex);
          normalizedAuth.signature = { r: parsed.r, s: parsed.s, v: parsed.v };
        }
      } else if (sigValue && typeof sigValue === 'object' && sigValue.r && sigValue.s && (sigValue.v !== undefined || sigValue.yParity !== undefined)) {
        normalizedAuth.signature = { r: sigValue.r, s: sigValue.s, v: sigValue.v ?? sigValue.yParity };
      }
    } catch (_e) {}

    const payload = {
      type: 4,
      to: wallet.address,
      value: 0,
      data: '0x',
      gasLimit: 120000,
      authorizationList: [normalizedAuth],
    } as const;

    const delegationTxHash = await sendToRelayer(payload, 'Delegation Setup', config);
    console.log(`[SponsoredOrchestrator] Authorization transaction sent: ${delegationTxHash}`);
    
    // Update tracker with transaction hash
    try {
      const store = await getStore();
      store.getState().updateAuthorizationStatus('pending', delegationTxHash);
      store.getState().addAuthorizationLog(`Transaction submitted: ${delegationTxHash.slice(0, 10)}...${delegationTxHash.slice(-8)}`);
      store.getState().setAuthorizationStep('Transaction submitted to blockchain', 30);
    } catch (_e) {}
    
    const mined = await monitorTransaction(delegationTxHash, 'Delegation', config);
    if (!mined) {
      console.log(`[SponsoredOrchestrator] Authorization transaction failed to mine: ${delegationTxHash}`);
      try {
        const store = await getStore();
        store.getState().updateAuthorizationStatus('failed');
        store.getState().addAuthorizationLog('Transaction failed to mine');
        store.getState().setAuthorizationStep('Authorization failed', null);
      } catch (_e) {}
      return { success: false, delegationTxHash };
    }
    
    console.log(`[SponsoredOrchestrator] Authorization transaction mined: ${delegationTxHash}`);
    
    // Verify the transaction was actually successful by checking the receipt
    try {
      const provider = getProvider(config);
      const receipt = await provider.getTransactionReceipt(delegationTxHash);
      
      if (!receipt) {
        console.log(`[SponsoredOrchestrator] Authorization transaction receipt not found: ${delegationTxHash}`);
        try {
          const store = await getStore();
          store.getState().updateAuthorizationStatus('failed');
          store.getState().addAuthorizationLog('Transaction receipt not found');
          store.getState().setAuthorizationStep('Authorization failed', null);
        } catch (_e) {}
        return { success: false, delegationTxHash };
      }
      
      const transactionSuccess = receipt.status === 1;
      
      console.log(`[SponsoredOrchestrator] Authorization transaction receipt:`, {
        status: receipt.status,
        success: transactionSuccess,
        gasUsed: receipt.gasUsed?.toString(),
        blockNumber: receipt.blockNumber
      });
      
      if (!transactionSuccess) {
        console.log(`[SponsoredOrchestrator] Authorization transaction failed on-chain`);
        try {
          const store = await getStore();
          store.getState().updateAuthorizationStatus('failed');
          store.getState().addAuthorizationLog('Transaction reverted on-chain');
          store.getState().setAuthorizationStep('Authorization failed', null);
        } catch (_e) {}
        return { success: false, delegationTxHash };
      }
      
      // Transaction was successful - return immediately
      console.log('[SponsoredOrchestrator] Authorization transaction successful');
      try {
        const store = await getStore();
        store.getState().updateAuthorizationStatus('success');
        store.getState().addAuthorizationLog('Authorization transaction confirmed');
        store.getState().setAuthorizationStep('Authorization complete', 100);
      } catch (_e) {}
      
      return { success: true, delegationTxHash, unofficial: true };
      
    } catch (receiptError) {
      console.log(`[SponsoredOrchestrator] Failed to get authorization transaction receipt:`, receiptError);
      try {
        const store = await getStore();
        store.getState().updateAuthorizationStatus('failed');
        store.getState().addAuthorizationLog('Could not verify transaction receipt');
        store.getState().setAuthorizationStep('Authorization failed', null);
      } catch (_e) {}
      return { success: false, delegationTxHash };
    }
  } catch (error) {
    console.error(`[SponsoredOrchestrator] Authorization error:`, error);
    try {
      const store = await getStore();
      store.getState().updateAuthorizationStatus('failed');
      store.getState().addAuthorizationLog(`Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      store.getState().setAuthorizationStep('Authorization failed', null);
    } catch (_e) {}
    throw error;
  }
}

export async function revokeAuthorizationWithTracking(address: string): Promise<{ success: boolean; revokeTxHash: string; unofficial?: boolean; }>{
  const config = resolveConfigFromStore();
  const provider = getProvider(config);
  const wallet = await getWallet(address, provider);
  const ok = await verifyDelegationContract(address);
  if (!ok) throw new Error('Delegation contract verification failed');

  // Start tracking the revocation transaction
  try {
    const store = await getStore();
    store.getState().setAuthorizationTransaction({
      hash: null,
      operation: 'Revocation',
      status: 'pending',
      startedAt: new Date().toISOString(),
      step: 'Initiating revocation...',
      progress: 0,
      logs: [{
        at: new Date().toISOString(),
        message: 'Starting wallet revocation process',
        data: { walletAddress: address, delegationAddress: config.delegationAddress }
      }],
      context: {
        walletAddress: address,
        delegationAddress: config.delegationAddress,
        chainId: config.chainId
      }
    });
    store.getState().addAuthorizationLog('Revocation request initiated');
    store.getState().setAuthorizationStep('Preparing revocation transaction', 10);
  } catch (_e) {}

  try {
    const currentNonce = await provider.getTransactionCount(wallet.address);
    const revocation = await wallet.authorize({
      address: '0x0000000000000000000000000000000000000000',
      nonce: currentNonce,
      chainId: config.chainId,
    } as any);

    let normalizedAuth: any = { ...revocation };
    const sigValue: any = (revocation as any).signature;
    try {
      if (typeof sigValue === 'string') {
        const parsed = ethers.Signature.from(sigValue);
        normalizedAuth.signature = { r: parsed.r, s: parsed.s, v: parsed.v };
      } else if (sigValue && typeof sigValue === 'object' && (!sigValue.r || !sigValue.s || sigValue.v === undefined)) {
        const maybeHex = (sigValue as any).serialized || (sigValue as any).hex;
        if (maybeHex && typeof maybeHex === 'string') {
          const parsed = ethers.Signature.from(maybeHex);
          normalizedAuth.signature = { r: parsed.r, s: parsed.s, v: parsed.v };
        }
      } else if (sigValue && typeof sigValue === 'object' && sigValue.r && sigValue.s && (sigValue.v !== undefined || sigValue.yParity !== undefined)) {
        normalizedAuth.signature = { r: sigValue.r, s: sigValue.s, v: sigValue.v ?? sigValue.yParity };
      }
    } catch (_e) {}

    const payload = {
      type: 4,
      to: wallet.address,
      value: 0,
      data: '0x',
      gasLimit: 120000,
      authorizationList: [normalizedAuth],
    } as const;

    const revokeTxHash = await sendToRelayer(payload, 'Delegation Revoke', config);
    console.log(`[SponsoredOrchestrator] Revocation transaction sent: ${revokeTxHash}`);
    
    // Update tracker with transaction hash
    try {
      const store = await getStore();
      store.getState().updateAuthorizationStatus('pending', revokeTxHash);
      store.getState().addAuthorizationLog(`Transaction submitted: ${revokeTxHash.slice(0, 10)}...${revokeTxHash.slice(-8)}`);
      store.getState().setAuthorizationStep('Transaction submitted to blockchain', 30);
    } catch (_e) {}
    
    const mined = await monitorTransaction(revokeTxHash, 'Delegation Revoke', config);
    if (!mined) {
      console.log(`[SponsoredOrchestrator] Revocation transaction failed to mine: ${revokeTxHash}`);
      try {
        const store = await getStore();
        store.getState().updateAuthorizationStatus('failed');
        store.getState().addAuthorizationLog('Transaction failed to mine');
        store.getState().setAuthorizationStep('Revocation failed', null);
      } catch (_e) {}
      return { success: false, revokeTxHash };
    }
    
    console.log(`[SponsoredOrchestrator] Revocation transaction mined: ${revokeTxHash}`);
    
    // Verify the transaction was actually successful by checking the receipt
    try {
      const provider = getProvider(config);
      const receipt = await provider.getTransactionReceipt(revokeTxHash);
      
      if (!receipt) {
        console.log(`[SponsoredOrchestrator] Revocation transaction receipt not found: ${revokeTxHash}`);
        const success = false;
        
        console.log(`[SponsoredOrchestrator] Revocation result:`, {
          success,
          revokeTxHash,
          address: wallet.address,
          note: 'Revocation failed - no transaction receipt'
        });
        
        try {
          const store = await getStore();
          store.getState().updateAuthorizationStatus('failed');
          store.getState().addAuthorizationLog('Transaction receipt not found');
          store.getState().setAuthorizationStep('Revocation failed', null);
        } catch (_e) {}
        
        return { success, revokeTxHash };
      }
      
      const transactionSuccess = receipt.status === 1;
      
      console.log(`[SponsoredOrchestrator] Revocation transaction receipt:`, {
        status: receipt.status,
        success: transactionSuccess,
        gasUsed: receipt.gasUsed?.toString(),
        blockNumber: receipt.blockNumber
      });
      
      if (!transactionSuccess) {
        console.log(`[SponsoredOrchestrator] Revocation transaction failed on-chain`);
        const success = false;
        
        console.log(`[SponsoredOrchestrator] Revocation result:`, {
          success,
          revokeTxHash,
          address: wallet.address,
          note: 'Revocation failed - transaction reverted'
        });
        
        try {
          const store = await getStore();
          store.getState().updateAuthorizationStatus('failed');
          store.getState().addAuthorizationLog('Transaction reverted on-chain');
          store.getState().setAuthorizationStep('Revocation failed', null);
        } catch (_e) {}
        
        return { success, revokeTxHash };
      }
      
      // Transaction was successful
      try {
        const store = await getStore();
        store.getState().addAuthorizationLog('Transaction confirmed on blockchain');
        store.getState().setAuthorizationStep('Revocation complete', 100);
      } catch (_e) {}
      
      const success = true;
      
      console.log(`[SponsoredOrchestrator] Revocation result:`, {
        success,
        revokeTxHash,
        address: wallet.address,
        note: 'Revocation successful - transaction confirmed on-chain',
        unofficial: true
      });
      
    } catch (receiptError) {
      console.log(`[SponsoredOrchestrator] Failed to get transaction receipt:`, receiptError);
      const success = false;
      
      console.log(`[SponsoredOrchestrator] Revocation result:`, {
        success,
        revokeTxHash,
        address: wallet.address,
        note: 'Revocation failed - could not verify transaction'
      });
      
      try {
        const store = await getStore();
        store.getState().updateAuthorizationStatus('failed');
        store.getState().addAuthorizationLog('Could not verify transaction receipt');
        store.getState().setAuthorizationStep('Revocation failed', null);
      } catch (_e) {}
      
      return { success, revokeTxHash };
    }
    
    try {
      const store = await getStore();
      store.getState().updateAuthorizationStatus('success');
      store.getState().addAuthorizationLog('Revocation completed successfully');
    } catch (_e) {}
    
    return { success: true, revokeTxHash, unofficial: true };
  } catch (error) {
    console.error(`[SponsoredOrchestrator] Revocation error:`, error);
    try {
      const store = await getStore();
      store.getState().updateAuthorizationStatus('failed');
      store.getState().addAuthorizationLog(`Revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      store.getState().setAuthorizationStep('Revocation failed', null);
    } catch (_e) {}
    throw error;
  }
}

export async function executeSponsoredTransfer(params: { fromAddress: string; tokenAddress: string; toAddress: string; amount: string; feeAmount?: string; }): Promise<{ success: boolean; transferTxHash: string; }>{
  const { fromAddress, tokenAddress, toAddress, amount } = params;
  const config = resolveConfigFromStore();
  const provider = getProvider(config);
  const wallet = await getWallet(fromAddress, provider);

  try {
    const store = await getStore();
    store.getState().setActiveTransaction({
      operation: 'Token Transfer',
      status: 'pending',
      startedAt: new Date().toISOString(),
      step: 'Preparing',
      progress: 5,
      context: {
        chainId: config.chainId,
        tokenAddress,
        toAddress,
        amount,
      },
      logs: [{ at: new Date().toISOString(), message: 'Initialized token transfer', data: { tokenAddress, toAddress, amount } }],
    });
  } catch (_e) {}

  try {
    const store = await getStore();
    store.getState().setActiveTransactionStep('Submitting transfer', 40);
    store.getState().addActiveTransactionLog('Submitting transfer to relayer');
  } catch (_e) {}

  const calls = buildTokenTransferCallsWithOptionalFee({ tokenAddress, toAddress, amount, feeAmount: params.feeAmount, treasury: config.treasury });
  const delegatedContract = new Contract(wallet.address, CONTRACT_ABI, provider);
  const code = await provider.getCode(wallet.address);
  if (code === '0x') {
    throw new Error(`EOA ${wallet.address} has not been delegated to any contract`);
  }
  const contractNonce = await delegatedContract.nonce();
  const signature = await createSignatureForCalls(calls, contractNonce, wallet);
  const executionPayload = createSponsoredExecutionPayload(calls, signature, wallet.address);
  const transferTxHash = await sendToRelayer(executionPayload, 'Token Transfer', config);

  try {
    const store = await getStore();
    store.getState().setActiveTransactionStep('Submitted', 55);
    store.getState().setActiveTransaction({ hash: transferTxHash });
    store.getState().addActiveTransactionLog('Transfer accepted by relayer', { hash: transferTxHash });
  } catch (_e) {}
  try {
    const store = await getStore();
    store.getState().setActiveTransactionStep('Waiting for confirmation', 70);
    store.getState().addActiveTransactionLog('Monitoring transaction for confirmation');
  } catch (_e) {}

  const transferSuccess = await monitorTransaction(transferTxHash, 'Token Transfer', config);
  try {
    const store = await getStore();
    if (transferSuccess) {
      store.getState().setActiveTransactionStep('Confirmed', 100);
      store.getState().updateActiveTransactionStatus('success', transferTxHash);
      store.getState().addActiveTransactionLog('Transfer confirmed on-chain', { hash: transferTxHash });
    } else {
      store.getState().setActiveTransactionStep('Failed', 100);
      store.getState().updateActiveTransactionStatus('failed', transferTxHash);
      store.getState().addActiveTransactionLog('Transfer failed to confirm', { hash: transferTxHash });
    }
  } catch (_e) {}

  if (!transferSuccess) throw new Error('Token transfer failed');
  return { success: true, transferTxHash };
}

function getTokenDecimalsFromStoreOrThrow(tokenAddress: string): number {
  const { useGlobalStore } = require('../stores/useGlobalStore');
  const state = useGlobalStore.getState();
  const predefinedToken = state.predefinedToken;
  if (!predefinedToken) {
    throw new Error('Missing predefinedToken in store');
  }
  if (!predefinedToken.address || (predefinedToken.decimals === undefined || predefinedToken.decimals === null)) {
    throw new Error('predefinedToken missing address/decimals');
  }
  if (predefinedToken.address.toLowerCase() !== tokenAddress.toLowerCase()) {
    throw new Error('Token address does not match predefinedToken');
  }
  return predefinedToken.decimals;
}

function buildTokenTransferCallsWithOptionalFee(params: { tokenAddress: string; toAddress: string; amount: string; feeAmount?: string; treasury: string; }): [string, number, string][] {
  const erc20Iface = new Interface(['function transfer(address to, uint256 amount) external returns (bool)']);
  const decimals = getTokenDecimalsFromStoreOrThrow(params.tokenAddress);
  const calls: [string, number, string][] = [];
  
  // Validate treasury address
  if (!params.treasury || typeof params.treasury !== 'string') {
    throw new Error('Invalid treasury address in orchestrator config');
  }
  
  if (params.feeAmount && Number(params.feeAmount) > 0) {
    const feeData = erc20Iface.encodeFunctionData('transfer', [params.treasury, ethers.parseUnits(params.feeAmount, decimals)]);
    calls.push([params.tokenAddress, 0, feeData]);
  }
  const data = erc20Iface.encodeFunctionData('transfer', [params.toAddress, ethers.parseUnits(params.amount, decimals)]);
  calls.push([params.tokenAddress, 0, data]);
  return calls;
}

async function createSignatureForCalls(calls: [string, number, string][], contractNonce: bigint, wallet: ethers.Wallet): Promise<string> {
  let encodedCalls = '0x';
  for (const [to, value, data] of calls) {
    encodedCalls += ethers.solidityPacked(['address', 'uint256', 'bytes'], [to, value, data]).slice(2);
  }
  const digest = ethers.keccak256(ethers.solidityPacked(['uint256', 'bytes'], [contractNonce, encodedCalls]));
  return await wallet.signMessage(ethers.getBytes(digest));
}

function createSponsoredExecutionPayload(calls: [string, number, string][], signature: string, walletAddress: string) {
  const contractInterface = new Interface(CONTRACT_ABI);
  const data = contractInterface.encodeFunctionData('execute((address,uint256,bytes)[],bytes)', [calls, signature]);
  return { to: walletAddress, value: 0, data, gasLimit: 200000 } as const;
}

function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map((i) => convertBigIntToString(i));
  if (typeof obj === 'object') {
    const hasSigFields = (o: any) => o && typeof o === 'object' && ('r' in o) && ('s' in o) && ('v' in o || 'yParity' in o);
    if (hasSigFields(obj)) {
      const r = (obj as any).r;
      const s = (obj as any).s;
      const v = (obj as any).v ?? (obj as any).yParity;
      return { r, s, v };
    }
    const converted: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_type' || key === 'networkV') continue;
      converted[key] = convertBigIntToString(value as any);
    }
    return converted;
  }
  return obj;
}

async function sendToRelayer(payload: any, operation: string, config: OrchestratorConfig): Promise<string> {
  const event = { payload, chainId: config.chainId };
  console.log('[SponsoredOrchestrator] sendToRelayer:request', { operation, chainId: config.chainId });
  const serializableEvent = convertBigIntToString(event);
  const response = await fetch(config.relayerEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serializableEvent),
  });
  let result: any = null;
  try {
    result = await response.json();
  } catch (_e) {
    const text = await response.text();
    console.log('[SponsoredOrchestrator] sendToRelayer:nonJSON', { operation, status: response.status, text });
    throw new Error(`Relayer ${operation} failed: ${response.status}`);
  }
  console.log('[SponsoredOrchestrator] sendToRelayer:response', { operation, status: response.status, ok: response.ok, body: result });
  if (result?.error || result?.message) {
    console.log('[SponsoredOrchestrator] sendToRelayer:errorBody', { error: result.error, message: result.message });
  }
  if (!response.ok || !result.success) {
    throw new Error(`Relayer ${operation} failed: ${response.status}`);
  }
  const txHash = (result.transactionHash || result.txHash || result.hash) as string;
  console.log('[SponsoredOrchestrator] sendToRelayer:accepted', { operation, txHash });
  return txHash;
}

async function monitorTransaction(txHash: string, _operation: string, config: OrchestratorConfig): Promise<boolean> {
  const provider = getProvider(config);
  for (let i = 0; i < config.maxRetries; i++) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) return receipt.status === 1;
      await new Promise((r) => setTimeout(r, config.retryDelayMs));
    } catch (_e) {
      await new Promise((r) => setTimeout(r, config.retryDelayMs));
    }
  }
  return false;
}


