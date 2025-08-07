// Import secure random source (BEFORE the shims)
import "react-native-get-random-values";

// Import the ethers shims (BEFORE importing ethers)
import "@ethersproject/shims";

import { ethers } from 'ethers';
import { WalletStorage } from './walletStorage';
import { BLOCKCHAIN_CONFIG } from './blockchainConfig';

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  contractAddress?: string;
  decimals: number;
  formattedBalance: string;
  isNative?: boolean;
}

export interface WalletBalances {
  gasToken: TokenBalance; // MATIC (gas for Polygon)
  usdToken: TokenBalance; // USDC
  goldToken: TokenBalance; // PAXG
  lastUpdated: number;
}

export class BalanceService {
  private static instance: BalanceService;
  private provider: ethers.JsonRpcProvider | null = null;

  private constructor() {}

  public static getInstance(): BalanceService {
    if (!BalanceService.instance) {
      BalanceService.instance = new BalanceService();
    }
    return BalanceService.instance;
  }

  /**
   * Initialize connection to the configured blockchain
   */
  private async initializeProvider(): Promise<void> {
    const rpcUrls = BLOCKCHAIN_CONFIG.chain.rpcUrls;
    
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
    
    throw new Error(`Failed to connect to any RPC provider for ${BLOCKCHAIN_CONFIG.chain.name}`);
  }

  /**
   * Get native token balance (MATIC gas token)
   */
  private async getNativeBalance(walletAddress: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const balance = await this.provider.getBalance(walletAddress);
    return ethers.formatEther(balance);
  }

  /**
   * Get ERC-20 token balance
   */
  private async getTokenBalance(tokenAddress: string, walletAddress: string, decimals: number): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    // Standard ERC-20 ABI
    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)'
    ];

    const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
    const balance = await contract.balanceOf(walletAddress);

    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Get all balances for the wallet using live blockchain data
   */
  public async getLiveBalances(walletAddress?: string): Promise<WalletBalances> {
    try {
      console.log('Fetching live balances from blockchain...');

      // Initialize provider
      await this.initializeProvider();

      // Get wallet address
      const targetAddress = walletAddress || await WalletStorage.getWalletAddress();
      if (!targetAddress) {
        throw new Error('No wallet address available');
      }

      console.log(`Fetching balances for address: ${targetAddress}`);

      // Get all balances in parallel for better performance
      const [gasBalance, usdBalance, goldBalance] = await Promise.all([
        // Native gas token (MATIC)
        this.getNativeBalance(targetAddress),
        // USD token (USDC)
        this.getTokenBalance(
          BLOCKCHAIN_CONFIG.tokens.usd.address,
          targetAddress,
          BLOCKCHAIN_CONFIG.tokens.usd.decimals
        ),
        // Gold token (PAXG)
        this.getTokenBalance(
          BLOCKCHAIN_CONFIG.tokens.gold.address,
          targetAddress,
          BLOCKCHAIN_CONFIG.tokens.gold.decimals
        )
      ]);

      console.log('Live balances fetched successfully');

      return {
        gasToken: {
          symbol: BLOCKCHAIN_CONFIG.tokens.gas.symbol,
          name: BLOCKCHAIN_CONFIG.tokens.gas.name,
          balance: gasBalance,
          decimals: BLOCKCHAIN_CONFIG.tokens.gas.decimals,
          formattedBalance: this.formatBalance(gasBalance, BLOCKCHAIN_CONFIG.tokens.gas.symbol),
          isNative: true
        },
        usdToken: {
          symbol: BLOCKCHAIN_CONFIG.tokens.usd.symbol,
          name: BLOCKCHAIN_CONFIG.tokens.usd.name,
          balance: usdBalance,
          contractAddress: BLOCKCHAIN_CONFIG.tokens.usd.address,
          decimals: BLOCKCHAIN_CONFIG.tokens.usd.decimals,
          formattedBalance: this.formatBalance(usdBalance, BLOCKCHAIN_CONFIG.tokens.usd.symbol)
        },
        goldToken: {
          symbol: BLOCKCHAIN_CONFIG.tokens.gold.symbol,
          name: BLOCKCHAIN_CONFIG.tokens.gold.name,
          balance: goldBalance,
          contractAddress: BLOCKCHAIN_CONFIG.tokens.gold.address,
          decimals: BLOCKCHAIN_CONFIG.tokens.gold.decimals,
          formattedBalance: this.formatBalance(goldBalance, BLOCKCHAIN_CONFIG.tokens.gold.symbol)
        },
        lastUpdated: Date.now()
      };

    } catch (error) {
      console.error('Failed to get live balances:', error);
      throw error;
    }
  }

  /**
   * Format balance for display with appropriate precision
   */
  private formatBalance(balance: string, symbol: string): string {
    const num = parseFloat(balance);
    
    if (num === 0) {
      return `0 ${symbol}`;
    }
    
    if (num < 0.0001) {
      return `< 0.0001 ${symbol}`;
    }
    
    if (num < 1) {
      return `${num.toFixed(6)} ${symbol}`;
    }
    
    if (num < 1000) {
      return `${num.toFixed(4)} ${symbol}`;
    }
    
    if (num < 1000000) {
      return `${(num / 1000).toFixed(2)}K ${symbol}`;
    }
    
    return `${(num / 1000000).toFixed(2)}M ${symbol}`;
  }

  /**
   * Refresh balances
   */
  public async refreshBalances(walletAddress?: string): Promise<WalletBalances> {
    console.log('Refreshing balances...');
    const balances = await this.getLiveBalances(walletAddress);
    console.log('Balances refreshed successfully');
    return balances;
  }

  /**
   * Get current chain configuration
   */
  public getChainConfig() {
    return BLOCKCHAIN_CONFIG.chain;
  }

  /**
   * Get current token configurations
   */
  public getTokenConfigs() {
    return BLOCKCHAIN_CONFIG.tokens;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.provider = null;
    console.log('BalanceService cleaned up');
  }
}

export const balanceService = BalanceService.getInstance();
