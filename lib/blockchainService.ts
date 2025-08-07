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
      'https://polygon-rpc.com',
      'https://rpc-mainnet.matic.network',
      'https://matic-mainnet.chainstacklabs.com',
      'https://rpc-mainnet.maticvigil.com',
      'https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY',
      'https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY'
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

    // Fallback to legacy gas price using getFeeData
    const feeData = await this.provider.getFeeData();
    return { gasPrice: feeData.gasPrice?.toString() || '0' };
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
        status: receipt.status ?? undefined
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
        status: receipt?.status ?? undefined
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
   * Get transaction history for an address
   * Note: This is a simplified implementation. In production, you'd want to use 
   * block explorer APIs or indexing services for comprehensive transaction history
   */
  public async getTransactionHistory(
    address: string, 
    limit: number = 50,
    startBlock: number = 0
  ): Promise<{
    hash: string;
    blockNumber: number;
    from: string;
    to: string;
    value: string;
    gasUsed?: string;
    gasPrice?: string;
    timestamp: number;
    status: number;
    input?: string;
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
  }[]> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      const currentBlock = await this.provider.getBlockNumber();
      const endBlock = currentBlock;
      const fromBlock = Math.max(startBlock, currentBlock - 2000); // Limit to last 2k blocks to avoid RPC limits

      console.log(`Fetching transaction history for ${address} from block ${fromBlock} to ${endBlock}`);

      const transactions: any[] = [];

      // Import blockchain config to get token addresses
      const { BLOCKCHAIN_CONFIG } = await import('./blockchainConfig');

      // Transaction history fetching temporarily disabled
      // Focus on balance display for now - transaction history will be implemented later
      console.log('Transaction history fetching disabled - focusing on balance display');

      // Sort by block number (newest first) and limit results
      transactions.sort((a, b) => b.blockNumber - a.blockNumber);
      const limitedTransactions = transactions.slice(0, limit);

      console.log(`Found ${limitedTransactions.length} total transactions for address ${address}`);
      return limitedTransactions;

    } catch (error) {
      console.error('Error fetching transaction history:', error);
      // Return empty array on error rather than throwing
      return [];
    }
  }

  /**
   * Fetch native MATIC transactions and generate sample data
   */
  private async fetchNativeTransactions(
    address: string,
    fromBlock: number,
    toBlock: number,
    limit: number
  ): Promise<any[]> {
    // For native transactions, we'd need to scan blocks or use an indexing service
    // This is a simplified implementation that checks wallet nonce and generates sample data
    const nonce = await this.provider!.getTransactionCount(address);
    const transactions: any[] = [];

    // Get the latest block for timestamp reference
    const latestBlock = await this.provider!.getBlock(toBlock);
    const currentTimestamp = latestBlock?.timestamp || Math.floor(Date.now() / 1000);
    const baseTimestamp = currentTimestamp - (7 * 24 * 60 * 60); // 7 days ago

    // Create sample MATIC transactions based on nonce or minimum sample data
    const numTransactions = Math.max(Math.min(nonce, Math.floor(limit / 4)), 2); // At least 2 sample transactions
    
    for (let i = 0; i < numTransactions; i++) {
      const txTimestamp = baseTimestamp + (i * 7200); // 2 hours apart
      const isOutgoing = i % 2 === 0;
      
      transactions.push({
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: toBlock - (numTransactions - i),
        from: isOutgoing ? address : `0x${Math.random().toString(16).substr(2, 40)}`,
        to: isOutgoing ? `0x${Math.random().toString(16).substr(2, 40)}` : address,
        value: ethers.parseEther((Math.random() * 5).toFixed(4)).toString(),
        gasUsed: '21000',
        gasPrice: ethers.parseUnits('30', 'gwei').toString(),
        timestamp: txTimestamp,
        status: 1,
        input: '0x',
        tokenSymbol: 'MATIC'
      });
    }


    return transactions;
  }

  /**
   * Fetch ERC-20 token transactions using targeted Transfer event filters
   * This approach specifically searches for transfers involving the user's address
   */
  private async fetchERC20Transactions(
    tokenAddress: string,
    tokenSymbol: string,
    tokenDecimals: number,
    userAddress: string,
    fromBlock: number,
    toBlock: number,
    limit: number
  ): Promise<any[]> {
    try {
      console.log(`Fetching ${tokenSymbol} transfers for ${userAddress} using targeted filters...`);

      // ERC-20 Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      // Pad the user address to 32 bytes for topic filtering
      const paddedUserAddress = ethers.zeroPadValue(userAddress, 32);
      
      const transactions: any[] = [];
      
      // Create two separate targeted filters to avoid scanning all transfers
      // 1. Transfers FROM the user (outgoing)
      // 2. Transfers TO the user (incoming)
      
      const outgoingFilter = {
        address: tokenAddress,
        topics: [
          transferEventSignature,
          paddedUserAddress, // from: user's address
          null              // to: any address
        ],
        fromBlock: fromBlock,
        toBlock: toBlock
      };
      
      const incomingFilter = {
        address: tokenAddress,
        topics: [
          transferEventSignature,
          null,              // from: any address
          paddedUserAddress  // to: user's address
        ],
        fromBlock: fromBlock,
        toBlock: toBlock
      };

      console.log(`Fetching outgoing ${tokenSymbol} transfers...`);
      const outgoingLogs = await this.provider!.getLogs(outgoingFilter);
      
      console.log(`Fetching incoming ${tokenSymbol} transfers...`);
      const incomingLogs = await this.provider!.getLogs(incomingFilter);
      
      // Combine and deduplicate logs
      const allLogs = [...outgoingLogs, ...incomingLogs];
      const uniqueLogs = allLogs.filter((log, index, self) => 
        index === self.findIndex(l => l.transactionHash === log.transactionHash && l.index === log.index)
      );
      
      console.log(`Found ${uniqueLogs.length} ${tokenSymbol} transfer events`);

      // Process the transfer logs
      for (const log of uniqueLogs.slice(0, limit)) {
        try {
          // Decode the transfer event
          const fromAddress = '0x' + log.topics[1].slice(26); // Remove padding
          const toAddress = '0x' + log.topics[2].slice(26);   // Remove padding
          
          const value = BigInt(log.data); // Transfer amount
          const formattedValue = ethers.formatUnits(value, tokenDecimals);

          // Get block details for timestamp
          const block = await this.provider!.getBlock(log.blockNumber);
          
          transactions.push({
            hash: log.transactionHash,
            blockNumber: log.blockNumber,
            from: fromAddress,
            to: toAddress,
            value: formattedValue,
            gasUsed: '50000', // Approximate gas for ERC-20 transfers
            gasPrice: '30000000000', // 30 gwei estimate
            timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
            status: 1, // We only get successful transactions from logs
            input: '0x',
            tokenAddress: tokenAddress,
            tokenSymbol: tokenSymbol,
            tokenDecimals: tokenDecimals
          });

        } catch (error) {
          console.warn(`Failed to process transfer log:`, error);
          continue;
        }
      }

      console.log(`Found ${transactions.length} ${tokenSymbol} transfers for ${userAddress}`);
      return transactions;

    } catch (error) {
      console.error(`Error fetching ${tokenSymbol} transactions:`, error);
      return [];
    }
  }

  /**
   * Get transaction history for a specific ERC-20 token
   */
  public async getTokenTransactionHistory(
    tokenAddress: string,
    tokenSymbol: string,
    tokenDecimals: number,
    userAddress?: string,
    limit: number = 20
  ): Promise<any[]> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      const walletAddress = userAddress || await this.getWalletAddress();
      if (!walletAddress) {
        throw new Error('No wallet address available');
      }

      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 5000); // Look back 5000 blocks

      console.log(`Fetching ${tokenSymbol} transaction history for ${walletAddress}`);
      
      return await this.fetchERC20Transactions(
        tokenAddress,
        tokenSymbol,
        tokenDecimals,
        walletAddress,
        fromBlock,
        currentBlock,
        limit
      );

    } catch (error) {
      console.error(`Error fetching ${tokenSymbol} transaction history:`, error);
      return [];
    }
  }

  /**
   * Get USDC transaction history specifically
   */
  public async getUSDCTransactionHistory(userAddress?: string, limit: number = 20): Promise<any[]> {
    const { BLOCKCHAIN_CONFIG } = await import('./blockchainConfig');
    return this.getTokenTransactionHistory(
      BLOCKCHAIN_CONFIG.tokens.usd.address,
      'USDC',
      BLOCKCHAIN_CONFIG.tokens.usd.decimals,
      userAddress,
      limit
    );
  }

  /**
   * Get PAXG transaction history specifically
   */
  public async getPAXGTransactionHistory(userAddress?: string, limit: number = 20): Promise<any[]> {
    const { BLOCKCHAIN_CONFIG } = await import('./blockchainConfig');
    return this.getTokenTransactionHistory(
      BLOCKCHAIN_CONFIG.tokens.gold.address,
      'PAXG',
      BLOCKCHAIN_CONFIG.tokens.gold.decimals,
      userAddress,
      limit
    );
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