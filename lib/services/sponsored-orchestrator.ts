import { ethers, Contract, JsonRpcProvider, Interface } from 'ethers';
import { authorizationTracker } from './authorization-tracker';

// Functional orchestrator API that reads config and secrets from the global store

type OrchestratorConfig = {
  chainId: number;
  delegationAddress: string;
  providerUrl: string;
  relayerEndpoint: string;
  maxRetries: number;
  retryDelayMs: number;
};

const CONTRACT_ABI = [
  'function execute((address,uint256,bytes)[] calls) external payable',
  'function execute((address,uint256,bytes)[] calls, bytes signature) external payable',
  'function nonce() external view returns (uint256)',
];

const getStore = async () => (await import('../stores/useGlobalStore')).useGlobalStore;
const getSecrets = async () => (await import('./wallet-secure-store'));

function resolveConfigFromStore(): OrchestratorConfig {
  const { orchestratorConfig, defaultChainIdNumeric } = (require('../stores/useGlobalStore') as any).useGlobalStore.getState();
  return {
    chainId: defaultChainIdNumeric,
    delegationAddress: orchestratorConfig.delegationAddress,
    providerUrl: orchestratorConfig.providerUrl,
    relayerEndpoint: orchestratorConfig.relayerEndpoint,
    maxRetries: orchestratorConfig.maxRetries,
    retryDelayMs: orchestratorConfig.retryDelayMs,
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

export async function checkDelegationStatus(address: string): Promise<{ isDelegated: boolean; delegatedTo: string | null; matchesTarget?: boolean; }>{
  try {
    const config = resolveConfigFromStore();
    const provider = getProvider(config);
    const code = await provider.getCode(address);
    if (code === '0x') return { isDelegated: false, delegatedTo: null };
    if (code.startsWith('0xef0100')) {
      const delegatedAddress = '0x' + code.slice(8);
      const normalizedDelegated = ethers.getAddress(delegatedAddress);
      const normalizedTarget = ethers.getAddress(config.delegationAddress);
      return { isDelegated: true, delegatedTo: normalizedDelegated, matchesTarget: normalizedDelegated === normalizedTarget };
    }
    return { isDelegated: true, delegatedTo: null };
  } catch (_e) {
    return { isDelegated: false, delegatedTo: null };
  }
}

export async function approveAuthorizationWithTracking(address: string): Promise<{ success: boolean; delegationTxHash: string; }>{
  const config = resolveConfigFromStore();
  const provider = getProvider(config);
  const wallet = await getWallet(address, provider);
  const ok = await verifyDelegationContract(address);
  if (!ok) throw new Error('Delegation contract verification failed');

  // Start tracking the authorization transaction
  authorizationTracker.startAuthorization(address, config.delegationAddress);

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
    authorizationTracker.setTransactionHash(delegationTxHash);
    
    const mined = await monitorTransaction(delegationTxHash, 'Delegation', config);
    if (!mined) {
      console.log(`[SponsoredOrchestrator] Authorization transaction failed to mine: ${delegationTxHash}`);
      authorizationTracker.failAuthorization('Transaction failed to mine');
      return { success: false, delegationTxHash };
    }
    
    console.log(`[SponsoredOrchestrator] Authorization transaction mined: ${delegationTxHash}`);
    authorizationTracker.setTransactionMined();
    
    await new Promise((r) => setTimeout(r, 3000));
    
    authorizationTracker.setCheckingDelegation();
    const status = await checkDelegationStatus(wallet.address);
    const success = !!(status.isDelegated && status.matchesTarget);
    
    console.log(`[SponsoredOrchestrator] Authorization result:`, {
      success,
      delegationTxHash,
      status,
      address: wallet.address
    });
    
    if (success) {
      authorizationTracker.completeAuthorization();
    } else {
      authorizationTracker.failAuthorization('Delegation status verification failed');
    }
    
    return { success, delegationTxHash };
  } catch (error) {
    console.error(`[SponsoredOrchestrator] Authorization error:`, error);
    authorizationTracker.failAuthorization(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export async function revokeAuthorizationWithTracking(address: string): Promise<{ success: boolean; revokeTxHash: string; }>{
  const config = resolveConfigFromStore();
  const provider = getProvider(config);
  const wallet = await getWallet(address, provider);
  const ok = await verifyDelegationContract(address);
  if (!ok) throw new Error('Delegation contract verification failed');

  // Start tracking the revocation transaction
  authorizationTracker.startRevocation(address, config.delegationAddress);

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
    authorizationTracker.setTransactionHash(revokeTxHash);
    
    const mined = await monitorTransaction(revokeTxHash, 'Delegation Revoke', config);
    if (!mined) {
      console.log(`[SponsoredOrchestrator] Revocation transaction failed to mine: ${revokeTxHash}`);
      authorizationTracker.failRevocation('Transaction failed to mine');
      return { success: false, revokeTxHash };
    }
    
    console.log(`[SponsoredOrchestrator] Revocation transaction mined: ${revokeTxHash}`);
    authorizationTracker.setTransactionMined();
    
    await new Promise((r) => setTimeout(r, 3000));
    
    authorizationTracker.setCheckingDelegation();
    const status = await checkDelegationStatus(wallet.address);
    const success = !status.isDelegated || !status.matchesTarget;
    
    console.log(`[SponsoredOrchestrator] Revocation result:`, {
      success,
      revokeTxHash,
      status,
      address: wallet.address
    });
    
    if (success) {
      authorizationTracker.completeRevocation();
    } else {
      authorizationTracker.failRevocation('Delegation status verification failed');
    }
    
    return { success, revokeTxHash };
  } catch (error) {
    console.error(`[SponsoredOrchestrator] Revocation error:`, error);
    authorizationTracker.failRevocation(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export async function executeSponsoredTransfer(params: { fromAddress: string; tokenAddress: string; toAddress: string; amount: string; }): Promise<{ success: boolean; transferTxHash: string; }>{
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

  const calls = buildTokenTransferCalls({ tokenAddress, toAddress, amount });
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

function buildTokenTransferCalls(params: { tokenAddress: string; toAddress: string; amount: string; }): [string, number, string][] {
  const erc20Iface = new Interface(['function transfer(address to, uint256 amount) external returns (bool)']);
  const decimals = 18; // TODO: fetch dynamically
  const data = erc20Iface.encodeFunctionData('transfer', [params.toAddress, ethers.parseUnits(params.amount, decimals)]);
  return [[params.tokenAddress, 0, data]];
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


