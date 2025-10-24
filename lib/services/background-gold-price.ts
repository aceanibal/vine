import { useGlobalStore } from '../stores/useGlobalStore';
import { checkAndRefreshGoldPrice } from './gold-price';

/**
 * Background service for managing gold price updates
 * This service automatically checks and updates gold prices in the background
 */
export class BackgroundGoldPriceService {
  private static instance: BackgroundGoldPriceService | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  private constructor() {}

  /**
   * Get singleton instance of the background service
   */
  static getInstance(): BackgroundGoldPriceService {
    if (!BackgroundGoldPriceService.instance) {
      BackgroundGoldPriceService.instance = new BackgroundGoldPriceService();
    }
    return BackgroundGoldPriceService.instance;
  }

  /**
   * Start the background service
   * Checks for gold price updates every 5 minutes
   */
  start(): void {
    if (this.isRunning) {
      console.log('BackgroundGoldPriceService: Already running');
      return;
    }

    console.log('BackgroundGoldPriceService: Starting background service');
    this.isRunning = true;

    // Check immediately on start
    this.checkAndUpdate();

    // Then check every 5 minutes (300,000 milliseconds)
    this.intervalId = setInterval(() => {
      this.checkAndUpdate();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop the background service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('BackgroundGoldPriceService: Already stopped');
      return;
    }

    console.log('BackgroundGoldPriceService: Stopping background service');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if the service is currently running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Manually trigger a check and update
   */
  async forceUpdate(): Promise<void> {
    await this.checkAndUpdate();
  }

  /**
   * Internal method to check and update gold price
   */
  private async checkAndUpdate(): Promise<void> {
    try {
      const state = useGlobalStore.getState();
      const backendURL = state.backendURL;
      const lastUpdated = state.appState.lastUpdated;
      
      // Convert string to Date if needed (happens after rehydration from storage)
      const lastUpdatedDate = lastUpdated 
        ? (lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated))
        : null;

      if (!backendURL) {
        console.log('BackgroundGoldPriceService: No backend URL configured');
        return;
      }

      const wasUpdated = await checkAndRefreshGoldPrice(backendURL, lastUpdatedDate);
      
      if (wasUpdated) {
        console.log('BackgroundGoldPriceService: Gold price updated successfully');
      } else {
        console.log('BackgroundGoldPriceService: Gold price check completed - no update needed');
      }
    } catch (error) {
      console.error('BackgroundGoldPriceService: Error during background check:', error);
    }
  }
}

/**
 * Initialize the background gold price service
 * Call this when the app starts
 */
export function initializeBackgroundGoldPriceService(): void {
  const service = BackgroundGoldPriceService.getInstance();
  service.start();
}

/**
 * Get the background service instance
 */
export function getBackgroundGoldPriceService(): BackgroundGoldPriceService {
  return BackgroundGoldPriceService.getInstance();
}
