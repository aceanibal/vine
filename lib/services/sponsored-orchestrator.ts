import { ethers, Contract, JsonRpcProvider, Interface } from 'ethers';

export type SponsoredConfig = {
  chainId: number;
  delegationAddress: string;
  providerUrl: string;
  relayerEndpoint: string;
  maxRetries: number;
  retryDelayMs: number;
};

const DEFAULT_CONFIG: SponsoredConfig = {
  chainId: 137,
  delegationAddress: '0x9a686f5eae58b62b435eaa034d48e57dc94bc36c',
  providerUrl: 'https://polygon-rpc.com',
  relayerEndpoint: 'https://cpprhb1jz6.execute-api.us-east-1.amazonaws.com/relay',
  maxRetries: 30,
  retryDelayMs: 2000,
};

export const DELEGATION_ADDRESS = DEFAULT_CONFIG.delegationAddress;

export const SPONSORED_CONFIG = {
  chainId: 137,
  supportedChains: [137],
};

const CONTRACT_ABI = [
  'function execute((address,uint256,bytes)[] calls) external payable',
  'function execute((address,uint256,bytes)[] calls, bytes signature) external payable',
  'function nonce() external view returns (uint256)',
];

export class SponsoredOrchestrator {
  private readonly provider: JsonRpcProvider;
  private readonly eoaWallet: ethers.Wallet;
  private readonly config: SponsoredConfig & Record<string, any>;

  constructor(chainId: number, privateKey: string, config: Partial<SponsoredConfig> = {}) {
    const merged: SponsoredConfig = { ...DEFAULT_CONFIG, chainId, ...config };
    if (!SPONSORED_CONFIG.supportedChains.includes(chainId)) {
      throw new Error(`Chain ID ${chainId} is not supported for sponsored transactions`);
    }
    this.config = merged as SponsoredConfig & Record<string, any>;
    this.provider = new JsonRpcProvider(this.config.providerUrl);
    this.eoaWallet = new ethers.Wallet(privateKey, this.provider);
    console.log('[SponsoredOrchestrator] ctor', { chainId: this.config.chainId, wallet: this.eoaWallet.address });
  }

  static isChainSupported(chainId: number): boolean {
    return SPONSORED_CONFIG.supportedChains.includes(chainId);
  }

  async verifyDelegationContract(): Promise<boolean> {
    try {
      console.log('[SponsoredOrchestrator] verifyDelegationContract:start', { delegationAddress: this.config.delegationAddress });
      const code = await this.provider.getCode(this.config.delegationAddress);
      if (code === '0x') return false;
      const contract = new Contract(this.config.delegationAddress, CONTRACT_ABI, this.provider);
      await contract.nonce();
      console.log('[SponsoredOrchestrator] verifyDelegationContract:ok');
      return true;
    } catch (_e) {
      console.log('[SponsoredOrchestrator] verifyDelegationContract:fail');
      return false;
    }
  }

  async executeSponsoredTransfer(params: { tokenAddress: string; toAddress: string; amount: string; }): Promise<{ success: boolean; transferTxHash: string; }>{
    const { tokenAddress, toAddress, amount } = params;
    this.config.tokenAddress = tokenAddress;
    this.config.toAddress = toAddress;
    this.config.amount = amount;

    // Detailed progress reporting to global store
    try {
      const store = await import('../stores/useGlobalStore');
      const { useGlobalStore } = store;
      // Initialize active transaction context
      useGlobalStore.getState().setActiveTransaction({
        operation: 'Token Transfer',
        status: 'pending',
        startedAt: new Date().toISOString(),
        step: 'Preparing',
        progress: 5,
        context: {
          chainId: this.config.chainId,
          tokenAddress: tokenAddress,
          toAddress: toAddress,
          amount: amount,
        },
        logs: [{ at: new Date().toISOString(), message: 'Initialized token transfer', data: { tokenAddress, toAddress, amount } }],
      });
    } catch (_e) {
      // Swallow store errors to avoid breaking core flow
    }

    /*
    // XRBG override: assume delegation is already set up
    const ok = await this.verifyDelegationContract();
    if (!ok) throw new Error('Delegation contract verification failed');

    const delegationStatus = await this.checkDelegationStatus();
    if (!delegationStatus.isDelegated || !delegationStatus.matchesTarget) {
      const delegationTxHash = await this.setupDelegation();
      const success = await this.monitorTransaction(delegationTxHash, 'Delegation');
      if (!success) throw new Error('Delegation setup failed');
      await new Promise((r) => setTimeout(r, 3000));
    }
    */

    // Step: building and sending transfer
    try {
      const store = await import('../stores/useGlobalStore');
      store.useGlobalStore.getState().setActiveTransactionStep('Submitting transfer', 40);
      store.useGlobalStore.getState().addActiveTransactionLog('Submitting transfer to relayer');
    } catch (_e) {}

    const transferTxHash = await this.executeTokenTransfer();

    try {
      const store = await import('../stores/useGlobalStore');
      store.useGlobalStore.getState().setActiveTransactionStep('Submitted', 55);
      store.useGlobalStore.getState().setActiveTransaction({ hash: transferTxHash });
      store.useGlobalStore.getState().addActiveTransactionLog('Transfer accepted by relayer', { hash: transferTxHash });
    } catch (_e) {}
    try {
      const store = await import('../stores/useGlobalStore');
      store.useGlobalStore.getState().setActiveTransactionStep('Waiting for confirmation', 70);
      store.useGlobalStore.getState().addActiveTransactionLog('Monitoring transaction for confirmation');
    } catch (_e) {}

    const transferSuccess = await this.monitorTransaction(transferTxHash, 'Token Transfer');

    try {
      const store = await import('../stores/useGlobalStore');
      if (transferSuccess) {
        store.useGlobalStore.getState().setActiveTransactionStep('Confirmed', 100);
        store.useGlobalStore.getState().updateActiveTransactionStatus('success', transferTxHash);
        store.useGlobalStore.getState().addActiveTransactionLog('Transfer confirmed on-chain', { hash: transferTxHash });
      } else {
        store.useGlobalStore.getState().setActiveTransactionStep('Failed', 100);
        store.useGlobalStore.getState().updateActiveTransactionStatus('failed', transferTxHash);
        store.useGlobalStore.getState().addActiveTransactionLog('Transfer failed to confirm', { hash: transferTxHash });
      }
    } catch (_e) {}
    if (!transferSuccess) throw new Error('Token transfer failed');
    return { success: true, transferTxHash };
  }

  public async checkDelegationStatus(): Promise<{ isDelegated: boolean; delegatedTo: string | null; matchesTarget?: boolean; }>{
    try {
      const code = await this.provider.getCode(this.eoaWallet.address);
      if (code === '0x') return { isDelegated: false, delegatedTo: null };
      if (code.startsWith('0xef0100')) {
        const delegatedAddress = '0x' + code.slice(8);
        const normalizedDelegated = ethers.getAddress(delegatedAddress);
        const normalizedTarget = ethers.getAddress(this.config.delegationAddress);
        return { isDelegated: true, delegatedTo: normalizedDelegated, matchesTarget: normalizedDelegated === normalizedTarget };
      }
      return { isDelegated: true, delegatedTo: null };
    } catch (_e) {
      return { isDelegated: false, delegatedTo: null };
    }
  }

  private async setupDelegation(): Promise<string> {
    const currentNonce = await this.provider.getTransactionCount(this.eoaWallet.address);
    const authorization = await this.eoaWallet.authorize({
      address: this.config.delegationAddress,
      nonce: currentNonce,
      chainId: this.config.chainId,
    });
    console.log('[SponsoredOrchestrator] setupDelegation:authorization', {
      hasAuth: !!authorization,
      keys: authorization ? Object.keys(authorization) : [],
      r: (authorization as any)?.r,
      s: (authorization as any)?.s,
      v: (authorization as any)?.v,
    });
    // Ensure signature is provided as { r, s, v } object for the relayer
    let normalizedAuth: any = { ...authorization };
    const sigValue: any = (authorization as any).signature;
    try {
      if (typeof sigValue === 'string') {
        const parsed = ethers.Signature.from(sigValue);
        normalizedAuth.signature = { r: parsed.r, s: parsed.s, v: parsed.v };
        console.log('[SponsoredOrchestrator] setupDelegation:parsedSignature', { r: parsed.r, s: parsed.s, v: parsed.v });
      } else if (sigValue && typeof sigValue === 'object' && (!sigValue.r || !sigValue.s || sigValue.v === undefined)) {
        const maybeHex = (sigValue as any).serialized || (sigValue as any).hex;
        if (maybeHex && typeof maybeHex === 'string') {
          const parsed = ethers.Signature.from(maybeHex);
          normalizedAuth.signature = { r: parsed.r, s: parsed.s, v: parsed.v };
          console.log('[SponsoredOrchestrator] setupDelegation:parsedSignatureFromHex', { r: parsed.r, s: parsed.s, v: parsed.v });
        }
      } else if (sigValue && typeof sigValue === 'object' && sigValue.r && sigValue.s && (sigValue.v !== undefined || sigValue.yParity !== undefined)) {
        normalizedAuth.signature = { r: sigValue.r, s: sigValue.s, v: sigValue.v ?? sigValue.yParity };
        console.log('[SponsoredOrchestrator] setupDelegation:normalizedProvidedSignature');
      }
    } catch (_e) {
      console.log('[SponsoredOrchestrator] setupDelegation:signatureParseFailed');
    }
    const eip7702Payload = {
      type: 4,
      to: this.eoaWallet.address,
      value: 0,
      data: '0x',
      gasLimit: 120000,
      authorizationList: [normalizedAuth],
    } as const;
    return this.sendToRelayer(eip7702Payload, 'Delegation Setup');
  }

  // Public: perform delegation, send to relayer, and monitor until mined
  public async approveAuthorizationWithTracking(): Promise<{ success: boolean; delegationTxHash: string; }>{
    console.log('[SponsoredOrchestrator] approveAuthorizationWithTracking:start');
    const ok = await this.verifyDelegationContract();
    if (!ok) throw new Error('Delegation contract verification failed');

    const delegationTxHash = await this.setupDelegation();
    console.log('[SponsoredOrchestrator] Delegation submitted:', { txHash: delegationTxHash });
    const mined = await this.monitorTransaction(delegationTxHash, 'Delegation');
    console.log('[SponsoredOrchestrator] Delegation mined status:', { txHash: delegationTxHash, mined });
    if (!mined) return { success: false, delegationTxHash };

    // Give the node a moment to reflect new code if needed
    await new Promise((r) => setTimeout(r, 3000));

    // Re-check delegation status to confirm it matches our target contract
    const status = await this.checkDelegationStatus();
    const success = !!(status.isDelegated && status.matchesTarget);
    return { success, delegationTxHash };
  }

  private async executeTokenTransfer(): Promise<string> {
    const calls = this.buildTokenTransferCalls();
    const delegatedContract = new Contract(this.eoaWallet.address, CONTRACT_ABI, this.provider);
    const code = await this.provider.getCode(this.eoaWallet.address);
    if (code === '0x') {
      throw new Error(`EOA ${this.eoaWallet.address} has not been delegated to any contract`);
    }
    const contractNonce = await delegatedContract.nonce();
    const signature = await this.createSignatureForCalls(calls, contractNonce);
    const executionPayload = this.createSponsoredExecutionPayload(calls, signature);
    return this.sendToRelayer(executionPayload, 'Token Transfer');
  }

  // Public: revoke authorization (best-effort) and track until mined
  public async revokeAuthorizationWithTracking(): Promise<{ success: boolean; revokeTxHash: string; }>{
    console.log('[SponsoredOrchestrator] revokeAuthorizationWithTracking:start');
    const ok = await this.verifyDelegationContract();
    if (!ok) throw new Error('Delegation contract verification failed');

    // Best-effort revocation by authorizing to zero address (clears delegation target)
    const currentNonce = await this.provider.getTransactionCount(this.eoaWallet.address);
    const revocation = await this.eoaWallet.authorize({
      address: '0x0000000000000000000000000000000000000000',
      nonce: currentNonce,
      chainId: this.config.chainId,
    } as any);

    let normalizedAuth: any = { ...revocation };
    const sigValue: any = (revocation as any).signature;
    try {
      if (typeof sigValue === 'string') {
        const parsed = ethers.Signature.from(sigValue);
        normalizedAuth.signature = { r: parsed.r, s: parsed.s, v: parsed.v };
        console.log('[SponsoredOrchestrator] revoke:parsedSignature', { r: parsed.r, s: parsed.s, v: parsed.v });
      } else if (sigValue && typeof sigValue === 'object' && (!sigValue.r || !sigValue.s || sigValue.v === undefined)) {
        const maybeHex = (sigValue as any).serialized || (sigValue as any).hex;
        if (maybeHex && typeof maybeHex === 'string') {
          const parsed = ethers.Signature.from(maybeHex);
          normalizedAuth.signature = { r: parsed.r, s: parsed.s, v: parsed.v };
          console.log('[SponsoredOrchestrator] revoke:parsedSignatureFromHex', { r: parsed.r, s: parsed.s, v: parsed.v });
        }
      } else if (sigValue && typeof sigValue === 'object' && sigValue.r && sigValue.s && (sigValue.v !== undefined || sigValue.yParity !== undefined)) {
        normalizedAuth.signature = { r: sigValue.r, s: sigValue.s, v: sigValue.v ?? sigValue.yParity };
        console.log('[SponsoredOrchestrator] revoke:normalizedProvidedSignature');
      }
    } catch (_e) {
      console.log('[SponsoredOrchestrator] revoke:signatureParseFailed');
    }

    const payload = {
      type: 4,
      to: this.eoaWallet.address,
      value: 0,
      data: '0x',
      gasLimit: 120000,
      authorizationList: [normalizedAuth],
    } as const;

    const revokeTxHash = await this.sendToRelayer(payload, 'Delegation Revoke');
    console.log('[SponsoredOrchestrator] revokeAuthorizationWithTracking:submitted', { revokeTxHash });
    const mined = await this.monitorTransaction(revokeTxHash, 'Delegation Revoke');
    console.log('[SponsoredOrchestrator] revokeAuthorizationWithTracking:mined', { revokeTxHash, mined });
    if (!mined) return { success: false, revokeTxHash };

    await new Promise((r) => setTimeout(r, 3000));
    const status = await this.checkDelegationStatus();
    const success = !status.isDelegated || !status.matchesTarget;
    return { success, revokeTxHash };
  }

  private buildTokenTransferCalls(): [string, number, string][] {
    const erc20Iface = new Interface(['function transfer(address to, uint256 amount) external returns (bool)']);
    const decimals = 6; // TODO: fetch dynamically
    const data = erc20Iface.encodeFunctionData('transfer', [this.config.toAddress, ethers.parseUnits(this.config.amount, decimals)]);
    return [[this.config.tokenAddress, 0, data]];
  }

  private async createSignatureForCalls(calls: [string, number, string][], contractNonce: bigint): Promise<string> {
    let encodedCalls = '0x';
    for (const [to, value, data] of calls) {
      encodedCalls += ethers.solidityPacked(['address', 'uint256', 'bytes'], [to, value, data]).slice(2);
    }
    const digest = ethers.keccak256(ethers.solidityPacked(['uint256', 'bytes'], [contractNonce, encodedCalls]));
    return await this.eoaWallet.signMessage(ethers.getBytes(digest));
  }

  private createSponsoredExecutionPayload(calls: [string, number, string][], signature: string) {
    const contractInterface = new Interface(CONTRACT_ABI);
    const data = contractInterface.encodeFunctionData('execute((address,uint256,bytes)[],bytes)', [calls, signature]);
    return { to: this.eoaWallet.address, value: 0, data, gasLimit: 200000 } as const;
  }

  private convertBigIntToString(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (Array.isArray(obj)) return obj.map((i) => this.convertBigIntToString(i));
    if (typeof obj === 'object') {
      // Special-case ethers Signature-like objects so they serialize as { r, s, v }
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
        converted[key] = this.convertBigIntToString(value as any);
      }
      return converted;
    }
    return obj;
  }

  private async sendToRelayer(payload: any, operation: string): Promise<string> {
    const event = { payload, chainId: this.config.chainId };
    console.log('[SponsoredOrchestrator] sendToRelayer:request', { operation, chainId: this.config.chainId });
    const serializableEvent = this.convertBigIntToString(event);
    const response = await fetch(this.config.relayerEndpoint, {
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

  private async monitorTransaction(txHash: string, operation: string): Promise<boolean> {
    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (receipt) return receipt.status === 1;
        await new Promise((r) => setTimeout(r, this.config.retryDelayMs));
      } catch (_e) {
        await new Promise((r) => setTimeout(r, this.config.retryDelayMs));
      }
    }
    return false;
  }
}


