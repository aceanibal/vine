import * as SecureStore from 'expo-secure-store';
import { ethers } from 'ethers';

export interface WalletData {
  address: string;
  mnemonic: string;
  privateKey: string;
  createdAt: number;
}

const WALLET_KEY = 'vine_wallet_data';

export class WalletStorage {
  /**
   * Save wallet data to secure storage
   */
  static async saveWallet(wallet: ethers.Wallet, mnemonic: string): Promise<void> {
    try {
      const walletData: WalletData = {
        address: wallet.address,
        mnemonic: mnemonic,
        privateKey: wallet.privateKey,
        createdAt: Date.now(),
      };

      await SecureStore.setItemAsync(WALLET_KEY, JSON.stringify(walletData));
      console.log('Wallet saved securely');
    } catch (error) {
      console.error('Failed to save wallet:', error);
      throw new Error('Failed to save wallet securely');
    }
  }

  /**
   * Load wallet data from secure storage
   */
  static async loadWallet(): Promise<WalletData | null> {
    try {
      const walletData = await SecureStore.getItemAsync(WALLET_KEY);
      if (!walletData) {
        return null;
      }
      return JSON.parse(walletData) as WalletData;
    } catch (error) {
      console.error('Failed to load wallet:', error);
      return null;
    }
  }

  /**
   * Create ethers wallet from stored data
   */
  static async getWallet(): Promise<ethers.Wallet | null> {
    try {
      const walletData = await this.loadWallet();
      if (!walletData) {
        return null;
      }

      // Create wallet from private key
      return new ethers.Wallet(walletData.privateKey);
    } catch (error) {
      console.error('Failed to create wallet from stored data:', error);
      return null;
    }
  }

  /**
   * Check if wallet exists
   */
  static async hasWallet(): Promise<boolean> {
    try {
      const walletData = await SecureStore.getItemAsync(WALLET_KEY);
      return walletData !== null;
    } catch (error) {
      console.error('Failed to check wallet existence:', error);
      return false;
    }
  }

  /**
   * Delete wallet data from secure storage
   */
  static async deleteWallet(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(WALLET_KEY);
      console.log('Wallet deleted from secure storage');
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      throw new Error('Failed to delete wallet');
    }
  }

  /**
   * Get wallet address from storage
   */
  static async getWalletAddress(): Promise<string | null> {
    try {
      const walletData = await this.loadWallet();
      return walletData?.address || null;
    } catch (error) {
      console.error('Failed to get wallet address:', error);
      return null;
    }
  }
} 