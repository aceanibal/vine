// Import secure random source (BEFORE the shims)
import "react-native-get-random-values";

// Import the ethers shims (BEFORE importing ethers)
import "@ethersproject/shims";

import { ethers } from 'ethers';
import { WalletStorage } from './walletStorage';

/**
 * Network configuration for supported blockchains
 */
export interface NetworkConfig {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  decimals: number;
  isTestnet: boolean;
}

/**
 * Supported networks - easily extensible
 */
export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrls: [
      'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      'https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY',
      'https://cloudflare-eth.com',
      'https://ethereum.publicnode.com'
    ],
    blockExplorerUrls: ['https://etherscan.io'],
    decimals: 18,
    isTestnet: false
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    symbol: 'ETH',
    rpcUrls: [
      'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      'https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
      'https://rpc.sepolia.org'
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    decimals: 18,
    isTestnet: true
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrls: [
      'https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY',
      'https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
      'https://polygon-rpc.com'
    ],
    blockExplorerUrls: ['https://polygonscan.com'],
    decimals: 18,
    isTestnet: false
  }
};

/**
 * Transaction types and interfaces
 */
export interface TransactionRequest {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}

export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  confirmations: number;
  status?: number;
}

export interface ContractCallOptions {
  contractAddress: string;
  abi: any[];
  methodName: string;
  params?: any[];
  value?: string;
  gasLimit?: string;
}

/**
 * Main blockchain service class using ethers.js
 */
export class BlockchainService {
  private static instance: BlockchainService;
  private currentNetwork: NetworkConfig;
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;

  private constructor() {
    // Default to Ethereum mainnet
    this.currentNetwork = SUPPORTED_NETWORKS.ethereum;
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  /**
   * Initialize the service with network and wallet
   */
  public async initialize(networkKey: string = 'ethereum'): Promise<void> {
    try {
      // Set network
      if (!SUPPORTED_NETWORKS[networkKey]) {
        throw new Error(`Unsupported network: ${networkKey}`);
      }
      this.currentNetwork = SUPPORTED_NETWORKS[networkKey];

      // Initialize provider with fallback URLs
      await this.initializeProvider();

      // Load wallet if available
      await this.loadWallet();

      console.log(`BlockchainService initialized for ${this.currentNetwork.name}`);
    } catch (error) {
      console.error('Failed to initialize BlockchainService:', error);
      throw error;
    }
  }

  /**
   * Initialize provider with automatic fallback
   */
  private async initializeProvider(): Promise<void> {
    const rpcUrls = this.currentNetwork.rpcUrls;
    
    for (const rpcUrl of rpcUrls) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Test the connection
        await provider.getBlockNumber();
        
        this.provider = provider;
        console.log(`Connected to ${rpcUrl}`);
        return;
      } catch (error) {
        console.warn(`Failed to connect to ${rpcUrl}:`, error);
        continue;
      }
    }
    
    throw new Error(`Failed to connect to any RPC provider for ${this.currentNetwork.name}`);
  }

  /**
   * Load wallet from secure storage and connect to provider
   */
  private async loadWallet(): Promise<void> {
    try {
      const storedWallet = await WalletStorage.getWallet();
      if (storedWallet && this.provider) {
        this.wallet = storedWallet.connect(this.provider);
        console.log('Wallet connected to provider');
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  }

  /**
   * Get current network information
   */
  public getCurrentNetwork(): NetworkConfig {
    return this.currentNetwork;
  }

  /**
   * Switch to a different network
   */
  public async switchNetwork(networkKey: string): Promise<void> {
    if (!SUPPORTED_NETWORKS[networkKey]) {
      throw new Error(`Unsupported network: ${networkKey}`);
    }

    this.currentNetwork = SUPPORTED_NETWORKS[networkKey];
    await this.initializeProvider();
    await this.loadWallet();
  }

  /**
   * Get wallet address
   */
  public async getWalletAddress(): Promise<string | null> {
    if (this.wallet) {
      return this.wallet.address;
    }
    return await WalletStorage.getWalletAddress();
  }

  /**
   * Get wallet balance
   */
  public async getBalance(address?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const targetAddress = address || await this.getWalletAddress();
    if (!targetAddress) {
      throw new Error('No wallet address available');
    }

    const balance = await this.provider.getBalance(targetAddress);
    return ethers.formatEther(balance);
  }

  /**
   * Get token balance (ERC-20)
   */
  public async getTokenBalance(tokenAddress: string, walletAddress?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const targetAddress = walletAddress || await this.getWalletAddress();
    if (!targetAddress) {
      throw new Error('No wallet address available');
    }

    // Standard ERC-20 ABI (balanceOf and decimals functions)
    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ];

    const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(targetAddress),
      contract.decimals()
    ]);

    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Estimate gas for a transaction
   */
  public async estimateGas(transaction: TransactionRequest): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const gasEstimate = await this.provider.estimateGas({
      to: transaction.to,
      value: transaction.value ? ethers.parseEther(transaction.value) : undefined,
      data: transaction.data
    });

    return gasEstimate.toString();
  }

  /**
   * Get current gas price with EIP-1559 support
   */
  public async getGasPrice(): Promise<{
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  }> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Try to get EIP-1559 gas data
      const feeData = await this.provider.getFeeData();
      
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        return {
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString()
        };
      } else if (feeData.gasPrice) {
        return {
          gasPrice: feeData.gasPrice.toString()
        };
      }
    } catch (error) {
      console.warn('Failed to get fee data, falling back to gas price:', error);
    }

    // Fallback to legacy gas price
    const gasPrice = await this.provider.getGasPrice();
    return { gasPrice: gasPrice.toString() };
  }

  /**
   * Send native currency (ETH, MATIC, etc.)
   */
  public async sendTransaction(
    to: string,
    amount: string,
    options?: {
      gasLimit?: string;
      gasPrice?: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const transaction: any = {
        to,
        value: ethers.parseEther(amount)
      };

      // Add gas options if provided
      if (options?.gasLimit) {
        transaction.gasLimit = options.gasLimit;
      }

      if (options?.maxFeePerGas && options?.maxPriorityFeePerGas) {
        // EIP-1559 transaction
        transaction.maxFeePerGas = options.maxFeePerGas;
        transaction.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
      } else if (options?.gasPrice) {
        // Legacy transaction
        transaction.gasPrice = options.gasPrice;
      } else {
        // Auto-detect gas pricing
        const gasData = await this.getGasPrice();
        if (gasData.maxFeePerGas && gasData.maxPriorityFeePerGas) {
          transaction.maxFeePerGas = gasData.maxFeePerGas;
          transaction.maxPriorityFeePerGas = gasData.maxPriorityFeePerGas;
        } else if (gasData.gasPrice) {
          transaction.gasPrice = gasData.gasPrice;
        }
      }

      // Send transaction
      const txResponse = await this.wallet.sendTransaction(transaction);
      
      console.log(`Transaction sent: ${txResponse.hash}`);
      
      return {
        hash: txResponse.hash,
        from: txResponse.from!,
        to: txResponse.to!,
        value: ethers.formatEther(txResponse.value),
        confirmations: 0
      };
    } catch (error) {
      console.error('Transaction failed:', error);
      throw this.parseError(error);
    }
  }

  /**
   * Send ERC-20 tokens
   */
  public async sendToken(
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number = 18,
    options?: {
      gasLimit?: string;
      gasPrice?: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // ERC-20 transfer ABI
      const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)'];
      const contract = new ethers.Contract(tokenAddress, erc20Abi, this.wallet);

      const tokenAmount = ethers.parseUnits(amount, decimals);
      
      // Prepare transaction options
      const txOptions: any = {};
      if (options?.gasLimit) txOptions.gasLimit = options.gasLimit;
      
      if (options?.maxFeePerGas && options?.maxPriorityFeePerGas) {
        txOptions.maxFeePerGas = options.maxFeePerGas;
        txOptions.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
      } else if (options?.gasPrice) {
        txOptions.gasPrice = options.gasPrice;
      }

      // Send token transfer
      const txResponse = await contract.transfer(to, tokenAmount, txOptions);
      
      console.log(`Token transfer sent: ${txResponse.hash}`);
      
      return {
        hash: txResponse.hash,
        from: txResponse.from,
        to: txResponse.to,
        value: amount,
        confirmations: 0
      };
    } catch (error) {
      console.error('Token transfer failed:', error);
      throw this.parseError(error);
    }
  }

  /**
   * Call smart contract method (read-only)
   */
  public async callContract(options: ContractCallOptions): Promise<any> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const contract = new ethers.Contract(
        options.contractAddress,
        options.abi,
        this.provider
      );

      const result = await contract[options.methodName](...(options.params || []));
      return result;
    } catch (error) {
      console.error('Contract call failed:', error);
      throw this.parseError(error);
    }
  }

  /**
   * Execute smart contract method (write operation)
   */
  public async executeContract(options: ContractCallOptions & {
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  }): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const contract = new ethers.Contract(
        options.contractAddress,
        options.abi,
        this.wallet
      );

      // Prepare transaction options
      const txOptions: any = {};
      if (options.value) txOptions.value = ethers.parseEther(options.value);
      if (options.gasLimit) txOptions.gasLimit = options.gasLimit;
      
      if (options.maxFeePerGas && options.maxPriorityFeePerGas) {
        txOptions.maxFeePerGas = options.maxFeePerGas;
        txOptions.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
      } else if (options.gasPrice) {
        txOptions.gasPrice = options.gasPrice;
      }

      // Execute contract method
      const txResponse = await contract[options.methodName](
        ...(options.params || []),
        txOptions
      );
      
      console.log(`Contract execution sent: ${txResponse.hash}`);
      
      return {
        hash: txResponse.hash,
        from: txResponse.from,
        to: txResponse.to,
        value: options.value || '0',
        confirmations: 0
      };
    } catch (error) {
      console.error('Contract execution failed:', error);
      throw this.parseError(error);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  public async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 120000 // 2 minutes
  ): Promise<TransactionResult> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations, timeout);
      
      if (!receipt) {
        throw new Error('Transaction not found or timed out');
      }

      const transaction = await this.provider.getTransaction(txHash);
      
      return {
        hash: receipt.hash,
        from: receipt.from,
        to: receipt.to || '',
        value: transaction ? ethers.formatEther(transaction.value) : '0',
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice?.toString(),
        blockNumber: receipt.blockNumber,
        confirmations: confirmations,
        status: receipt.status
      };
    } catch (error) {
      console.error('Failed to wait for transaction:', error);
      throw this.parseError(error);
    }
  }

  /**
   * Get transaction details
   */
  public async getTransaction(txHash: string): Promise<TransactionResult | null> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const [transaction, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash)
      ]);

      if (!transaction) {
        return null;
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = receipt ? currentBlock - receipt.blockNumber + 1 : 0;

      return {
        hash: transaction.hash,
        from: transaction.from,
        to: transaction.to || '',
        value: ethers.formatEther(transaction.value),
        gasUsed: receipt?.gasUsed.toString(),
        gasPrice: transaction.gasPrice?.toString(),
        blockNumber: receipt?.blockNumber,
        confirmations,
        status: receipt?.status
      };
    } catch (error) {
      console.error('Failed to get transaction:', error);
      throw this.parseError(error);
    }
  }

  /**
   * Sign a message with the wallet
   */
  public async signMessage(message: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await this.wallet.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw this.parseError(error);
    }
  }

  /**
   * Verify a message signature
   */
  public verifySignature(message: string, signature: string, address: string): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return false;
    }
  }

  /**
   * Parse and format errors for user-friendly display
   */
  private parseError(error: any): Error {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return new Error('Insufficient funds for transaction');
    }
    
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      return new Error('Transaction may fail - check contract parameters');
    }
    
    if (error.code === 'NONCE_EXPIRED') {
      return new Error('Transaction nonce is too low');
    }
    
    if (error.code === 'REPLACEMENT_UNDERPRICED') {
      return new Error('Transaction gas price too low');
    }

    if (error.message?.includes('user rejected')) {
      return new Error('Transaction was cancelled by user');
    }

    // Return original error if we can't parse it
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Get block explorer URL for transaction
   */
  public getTransactionUrl(txHash: string): string {
    const baseUrl = this.currentNetwork.blockExplorerUrls[0];
    return `${baseUrl}/tx/${txHash}`;
  }

  /**
   * Get block explorer URL for address
   */
  public getAddressUrl(address: string): string {
    const baseUrl = this.currentNetwork.blockExplorerUrls[0];
    return `${baseUrl}/address/${address}`;
  }

  /**
   * Check if current network is testnet
   */
  public isTestnet(): boolean {
    return this.currentNetwork.isTestnet;
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    this.provider = null;
    this.wallet = null;
    console.log('BlockchainService cleaned up');
  }
}

/**
 * Default service instance - ready to use
 */
export const blockchainService = BlockchainService.getInstance();
