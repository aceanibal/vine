// Import secure random source (BEFORE the shims)
import "react-native-get-random-values";

// Import the ethers shims (BEFORE importing ethers)
import "@ethersproject/shims";

import { ethers } from 'ethers';

/**
 * Address validation and formatting utilities
 */
export class AddressUtils {
  /**
   * Validate Ethereum address format
   */
  static isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Format address to checksum format
   */
  static toChecksumAddress(address: string): string {
    try {
      return ethers.getAddress(address);
    } catch (error) {
      throw new Error('Invalid address format');
    }
  }

  /**
   * Format address for display (shortened version)
   */
  static formatAddressForDisplay(address: string, startChars: number = 6, endChars: number = 4): string {
    if (!this.isValidAddress(address)) {
      return 'Invalid Address';
    }

    if (address.length <= startChars + endChars) {
      return address;
    }

    const start = address.slice(0, startChars);
    const end = address.slice(-endChars);
    return `${start}...${end}`;
  }

  /**
   * Compare two addresses (case-insensitive)
   */
  static areAddressesEqual(address1: string, address2: string): boolean {
    try {
      return ethers.getAddress(address1) === ethers.getAddress(address2);
    } catch {
      return false;
    }
  }
}

/**
 * Amount formatting and conversion utilities
 */
export class AmountUtils {
  /**
   * Format wei to ether with specified decimal places
   */
  static formatEther(wei: string | bigint, decimals: number = 4): string {
    try {
      const ether = ethers.formatEther(wei);
      const num = parseFloat(ether);
      return num.toFixed(decimals);
    } catch (error) {
      throw new Error('Invalid wei amount');
    }
  }

  /**
   * Parse ether amount to wei
   */
  static parseEther(ether: string): string {
    try {
      return ethers.parseEther(ether).toString();
    } catch (error) {
      throw new Error('Invalid ether amount');
    }
  }

  /**
   * Format token amounts with custom decimals
   */
  static formatUnits(amount: string | bigint, decimals: number, displayDecimals: number = 4): string {
    try {
      const formatted = ethers.formatUnits(amount, decimals);
      const num = parseFloat(formatted);
      return num.toFixed(displayDecimals);
    } catch (error) {
      throw new Error('Invalid token amount');
    }
  }

  /**
   * Parse token amount with custom decimals
   */
  static parseUnits(amount: string, decimals: number): string {
    try {
      return ethers.parseUnits(amount, decimals).toString();
    } catch (error) {
      throw new Error('Invalid token amount');
    }
  }

  /**
   * Format large numbers with K, M, B suffixes
   */
  static formatLargeNumber(num: number, decimals: number = 2): string {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(decimals) + 'B';
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(decimals) + 'M';
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(decimals) + 'K';
    }
    return num.toFixed(decimals);
  }

  /**
   * Format currency with proper localization
   */
  static formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Validate amount is within safe range
   */
  static isValidAmount(amount: string): boolean {
    try {
      const num = parseFloat(amount);
      return !isNaN(num) && num > 0 && num < Number.MAX_SAFE_INTEGER;
    } catch {
      return false;
    }
  }
}

/**
 * Gas calculation and estimation utilities
 */
export class GasUtils {
  /**
   * Calculate gas cost in ether
   */
  static calculateGasCost(gasUsed: string, gasPrice: string): string {
    try {
      const gasCostWei = BigInt(gasUsed) * BigInt(gasPrice);
      return ethers.formatEther(gasCostWei);
    } catch (error) {
      throw new Error('Invalid gas parameters');
    }
  }

  /**
   * Calculate EIP-1559 gas cost
   */
  static calculateEIP1559GasCost(gasUsed: string, baseFee: string, priorityFee: string): string {
    try {
      const totalFeePerGas = BigInt(baseFee) + BigInt(priorityFee);
      const gasCostWei = BigInt(gasUsed) * totalFeePerGas;
      return ethers.formatEther(gasCostWei);
    } catch (error) {
      throw new Error('Invalid EIP-1559 gas parameters');
    }
  }

  /**
   * Format gas price in Gwei
   */
  static formatGasPrice(gasPrice: string): string {
    try {
      return ethers.formatUnits(gasPrice, 'gwei');
    } catch (error) {
      throw new Error('Invalid gas price');
    }
  }

  /**
   * Parse gas price from Gwei to wei
   */
  static parseGasPrice(gweiAmount: string): string {
    try {
      return ethers.parseUnits(gweiAmount, 'gwei').toString();
    } catch (error) {
      throw new Error('Invalid Gwei amount');
    }
  }

  /**
   * Estimate gas buffer (add percentage to estimate)
   */
  static addGasBuffer(gasEstimate: string, bufferPercent: number = 20): string {
    try {
      const estimate = BigInt(gasEstimate);
      const buffer = estimate * BigInt(bufferPercent) / BigInt(100);
      return (estimate + buffer).toString();
    } catch (error) {
      throw new Error('Invalid gas estimate');
    }
  }
}

/**
 * Transaction hash and signature utilities
 */
export class TransactionUtils {
  /**
   * Validate transaction hash format
   */
  static isValidTxHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Validate signature format
   */
  static isValidSignature(signature: string): boolean {
    return /^0x[a-fA-F0-9]{130}$/.test(signature);
  }

  /**
   * Extract v, r, s from signature
   */
  static splitSignature(signature: string): { v: number; r: string; s: string } {
    try {
      return ethers.Signature.from(signature);
    } catch (error) {
      throw new Error('Invalid signature format');
    }
  }

  /**
   * Join v, r, s into signature
   */
  static joinSignature(v: number, r: string, s: string): string {
    try {
      const signature = ethers.Signature.from({ v, r, s });
      return signature.serialized;
    } catch (error) {
      throw new Error('Invalid signature components');
    }
  }

  /**
   * Get transaction status description
   */
  static getStatusDescription(status?: number): string {
    if (status === undefined) return 'Pending';
    return status === 1 ? 'Success' : 'Failed';
  }

  /**
   * Calculate transaction age from block number
   */
  static calculateTransactionAge(blockNumber: number, currentBlock: number): string {
    const blockDiff = currentBlock - blockNumber;
    const minutes = Math.floor(blockDiff * 2); // ~2 minutes per block for Ethereum
    
    if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }
}

/**
 * Mnemonic and private key utilities
 */
export class WalletUtils {
  /**
   * Validate mnemonic phrase
   */
  static isValidMnemonic(mnemonic: string): boolean {
    try {
      ethers.Wallet.fromPhrase(mnemonic);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate private key format
   */
  static isValidPrivateKey(privateKey: string): boolean {
    try {
      new ethers.Wallet(privateKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate random mnemonic
   */
  static generateMnemonic(): string {
    try {
      const wallet = ethers.Wallet.createRandom();
      return wallet.mnemonic?.phrase || '';
    } catch (error) {
      throw new Error('Failed to generate mnemonic');
    }
  }

  /**
   * Derive address from mnemonic
   */
  static getAddressFromMnemonic(mnemonic: string): string {
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      return wallet.address;
    } catch (error) {
      throw new Error('Invalid mnemonic phrase');
    }
  }

  /**
   * Derive address from private key
   */
  static getAddressFromPrivateKey(privateKey: string): string {
    try {
      const wallet = new ethers.Wallet(privateKey);
      return wallet.address;
    } catch (error) {
      throw new Error('Invalid private key');
    }
  }

  /**
   * Count words in mnemonic
   */
  static countMnemonicWords(mnemonic: string): number {
    return mnemonic.trim().split(/\s+/).length;
  }

  /**
   * Validate mnemonic word count
   */
  static isValidMnemonicLength(mnemonic: string): boolean {
    const wordCount = this.countMnemonicWords(mnemonic);
    return [12, 15, 18, 21, 24].includes(wordCount);
  }
}

/**
 * Network and chain utilities
 */
export class NetworkUtils {
  /**
   * Get network name from chain ID
   */
  static getNetworkName(chainId: number): string {
    const networks: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten Testnet',
      4: 'Rinkeby Testnet',
      5: 'Goerli Testnet',
      11155111: 'Sepolia Testnet',
      137: 'Polygon Mainnet',
      80001: 'Polygon Mumbai',
      56: 'BSC Mainnet',
      97: 'BSC Testnet',
      43114: 'Avalanche Mainnet',
      43113: 'Avalanche Fuji',
      250: 'Fantom Mainnet',
      4002: 'Fantom Testnet',
      42161: 'Arbitrum One',
      421611: 'Arbitrum Testnet',
      10: 'Optimism',
      69: 'Optimism Kovan',
    };

    return networks[chainId] || `Chain ID ${chainId}`;
  }

  /**
   * Check if network is testnet
   */
  static isTestnet(chainId: number): boolean {
    const testnets = [3, 4, 5, 11155111, 80001, 97, 43113, 4002, 421611, 69];
    return testnets.includes(chainId);
  }

  /**
   * Get native currency symbol
   */
  static getNativeCurrency(chainId: number): string {
    const currencies: { [key: number]: string } = {
      1: 'ETH',
      3: 'ETH',
      4: 'ETH',
      5: 'ETH',
      11155111: 'ETH',
      137: 'MATIC',
      80001: 'MATIC',
      56: 'BNB',
      97: 'BNB',
      43114: 'AVAX',
      43113: 'AVAX',
      250: 'FTM',
      4002: 'FTM',
      42161: 'ETH',
      421611: 'ETH',
      10: 'ETH',
      69: 'ETH',
    };

    return currencies[chainId] || 'ETH';
  }
}

/**
 * Common smart contract ABIs for reuse
 */
export const COMMON_ABIS = {
  ERC20: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
  ],

  ERC721: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function balanceOf(address owner) view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function transferFrom(address from, address to, uint256 tokenId)',
    'function safeTransferFrom(address from, address to, uint256 tokenId)',
    'function approve(address to, uint256 tokenId)',
    'function getApproved(uint256 tokenId) view returns (address)',
    'function setApprovalForAll(address operator, bool approved)',
    'function isApprovedForAll(address owner, address operator) view returns (bool)'
  ],

  MULTICALL: [
    'function aggregate(tuple(address target, bytes callData)[] calls) returns (uint256 blockNumber, bytes[] returnData)'
  ]
};

/**
 * Constants for common addresses and values
 */
export const BLOCKCHAIN_CONSTANTS = {
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  MAX_UINT256: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  
  // Common gas limits
  GAS_LIMITS: {
    ETH_TRANSFER: '21000',
    ERC20_TRANSFER: '65000',
    ERC20_APPROVE: '50000',
    UNISWAP_SWAP: '200000',
    CONTRACT_DEPLOY: '2000000'
  },

  // Default gas prices (in Gwei)
  DEFAULT_GAS_PRICES: {
    SLOW: '10',
    STANDARD: '20',
    FAST: '30'
  }
};

/**
 * Export all utilities as a single object for convenience
 */
export const BlockchainUtils = {
  Address: AddressUtils,
  Amount: AmountUtils,
  Gas: GasUtils,
  Transaction: TransactionUtils,
  Wallet: WalletUtils,
  Network: NetworkUtils,
  ABIS: COMMON_ABIS,
  CONSTANTS: BLOCKCHAIN_CONSTANTS
};
