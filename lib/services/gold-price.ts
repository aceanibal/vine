import { useGlobalStore } from '../stores/useGlobalStore';

export interface GoldPriceResponse {
  success: boolean;
  timestamp: number;
  date: string;
  base: string;
  rates: {
    USD: number;
    XAU: number;
    USDXAU: number;
  };
  lastUpdated: number;
  lastUpdatedISO: string;
}

/**
 * Converts gold price from troy ounces to grams
 * 1 troy ounce = 31.1034768 grams
 * @param pricePerOunce - Price per troy ounce
 * @returns Price per gram
 */
export function convertOunceToGram(pricePerOunce: number): number {
  const TROY_OUNCES_TO_GRAMS = 31.1034768;
  return pricePerOunce / TROY_OUNCES_TO_GRAMS;
}

/**
 * Converts timestamp to Date object
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Date object
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Fetches gold price data from the backend
 * @param backendURL - Base URL for the backend API
 * @returns Promise<GoldPriceResponse>
 */
export async function fetchGoldPrice(backendURL: string): Promise<GoldPriceResponse> {
  const url = `${backendURL}/gold-price`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: GoldPriceResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching gold price:', error);
    throw error;
  }
}

/**
 * Service class for managing gold price API calls
 */
export class GoldPriceService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Fetches current gold price data
   * @returns Promise<GoldPriceResponse>
   */
  async getGoldPrice(): Promise<GoldPriceResponse> {
    return fetchGoldPrice(this.baseURL);
  }

  /**
   * Updates the base URL for the service
   * @param newBaseURL - New base URL
   */
  setBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
  }

  /**
   * Gets the current base URL
   * @returns Current base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

/**
 * Updates the predefined token price in the global store with gold price data
 * @param goldPriceData - Gold price response data
 */
export function updatePredefinedTokenWithGoldPrice(goldPriceData: GoldPriceResponse): void {
  const store = useGlobalStore.getState();
  
  // Convert price from ounces to grams
  // USDXAU is the price per ounce, so we need to convert it to price per gram
  const pricePerGram = convertOunceToGram(goldPriceData.rates.USDXAU);
  
  // Convert timestamp to Date
  const lastUpdatedDate = timestampToDate(goldPriceData.lastUpdated);
  
  // Update the predefined token price in the global store
  useGlobalStore.setState((state) => ({
    predefinedToken: state.predefinedToken ? {
      ...state.predefinedToken,
      price: pricePerGram,
    } : null,
    appState: {
      ...state.appState,
      lastUpdated: lastUpdatedDate,
    }
  }));
  
  console.log('Gold price updated in predefined token:', {
    pricePerGram: pricePerGram,
    pricePerOunce: goldPriceData.rates.USDXAU,
    lastUpdated: lastUpdatedDate.toISOString(),
  });
}

/**
 * Fetches gold price and updates the global store
 * @param backendURL - Base URL for the backend API
 */
export async function fetchAndUpdateGoldPrice(backendURL: string): Promise<void> {
  try {
    console.log('Fetching gold price from:', `${backendURL}/gold-price`);
    
    // Set loading state
    useGlobalStore.getState().setLoading(true);
    useGlobalStore.getState().clearError();
    
    // Fetch gold price data
    const goldPriceData = await fetchGoldPrice(backendURL);
    
    // Update the predefined token with gold price data
    updatePredefinedTokenWithGoldPrice(goldPriceData);
    
    console.log('Gold price updated successfully');
    
  } catch (error) {
    console.error('Failed to fetch and update gold price:', error);
    
    // Set error state
    useGlobalStore.getState().setError(
      error instanceof Error ? error.message : 'Failed to fetch gold price'
    );
  } finally {
    // Clear loading state
    useGlobalStore.getState().setLoading(false);
  }
}

/**
 * Checks if gold price needs refreshing based on 10-minute threshold and refreshes if needed
 * @param backendURL - Base URL for the backend API
 * @param lastUpdated - Last update timestamp from global store
 * @returns Promise<boolean> - True if refresh was performed, false if not needed
 */
export async function checkAndRefreshGoldPrice(
  backendURL: string, 
  lastUpdated: Date | null
): Promise<boolean> {
  if (!backendURL) {
    console.log('GoldPriceService: No backend URL configured for gold price check');
    return false;
  }
  
  // Check if we need to refresh (10 minutes = 600,000 milliseconds)
  const TEN_MINUTES = 10 * 60 * 1000;
  const now = new Date();
  
  if (!lastUpdated || (now.getTime() - lastUpdated.getTime()) > TEN_MINUTES) {
    console.log('GoldPriceService: Gold price is stale, refreshing...', {
      lastUpdated: lastUpdated?.toISOString(),
      now: now.toISOString(),
      timeSinceUpdate: lastUpdated ? now.getTime() - lastUpdated.getTime() : 'never'
    });
    
    try {
      await fetchAndUpdateGoldPrice(backendURL);
      console.log('GoldPriceService: Gold price auto-refresh completed successfully');
      return true;
      
    } catch (error) {
      console.error('GoldPriceService: Failed to auto-refresh gold price:', error);
      // Don't throw error for auto-refresh failures to avoid disrupting user experience
      return false;
    }
  } else {
    console.log('GoldPriceService: Gold price is fresh, no refresh needed', {
      lastUpdated: lastUpdated.toISOString(),
      timeSinceUpdate: now.getTime() - lastUpdated.getTime()
    });
    return false;
  }
}

