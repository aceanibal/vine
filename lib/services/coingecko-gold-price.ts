import { useGlobalStore } from '../stores/useGlobalStore';

/**
 * CoinGecko API response interface for PAX Gold price
 */
export interface CoinGeckoPaxGoldResponse {
  'pax-gold': {
    usd: number;
  };
}

/**
 * Fetches PAX Gold price from CoinGecko API
 * @returns Promise<number> - Price in USD
 */
export async function fetchPaxGoldPrice(): Promise<number> {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd';
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: CoinGeckoPaxGoldResponse = await response.json();
    
    if (!data['pax-gold'] || typeof data['pax-gold'].usd !== 'number') {
      throw new Error('Invalid response format from CoinGecko API');
    }
    
    return data['pax-gold'].usd;
  } catch (error) {
    console.error('Error fetching PAX Gold price from CoinGecko:', error);
    throw error;
  }
}

/**
 * Updates the predefined token price in the global store with CoinGecko price data
 * @param price - Price in USD per ounce
 */
export function updatePredefinedTokenWithCoinGeckoPrice(price: number): void {
  const now = new Date();
  
  // Update the predefined token price in the global store
  useGlobalStore.setState((state) => ({
    predefinedToken: state.predefinedToken ? {
      ...state.predefinedToken,
      price: price, // Price is already in USD per ounce
    } : null,
    appState: {
      ...state.appState,
      lastUpdated: now,
    }
  }));
  
  console.log('CoinGecko gold price updated in predefined token:', {
    pricePerOunce: price,
    lastUpdated: now.toISOString(),
  });
}

/**
 * Fetches PAX Gold price from CoinGecko and updates the global store
 */
export async function fetchAndUpdateCoinGeckoGoldPrice(): Promise<void> {
  try {
    console.log('Fetching PAX Gold price from CoinGecko...');
    
    // Set loading state
    useGlobalStore.getState().setLoading(true);
    useGlobalStore.getState().clearError();
    
    // Fetch gold price data
    const price = await fetchPaxGoldPrice();
    
    // Update the predefined token with gold price data
    updatePredefinedTokenWithCoinGeckoPrice(price);
    
    console.log('CoinGecko gold price updated successfully');
    
  } catch (error) {
    console.error('Failed to fetch and update CoinGecko gold price:', error);
    
    // Set error state
    useGlobalStore.getState().setError(
      error instanceof Error ? error.message : 'Failed to fetch gold price from CoinGecko'
    );
  } finally {
    // Clear loading state
    useGlobalStore.getState().setLoading(false);
  }
}

/**
 * Service class for managing CoinGecko PAX Gold price API calls
 */
export class CoinGeckoGoldPriceService {
  /**
   * Fetches current PAX Gold price from CoinGecko
   * @returns Promise<number> - Price in USD per ounce
   */
  async getPaxGoldPrice(): Promise<number> {
    return fetchPaxGoldPrice();
  }

  /**
   * Fetches PAX Gold price with full response data
   * @returns Promise<CoinGeckoPaxGoldResponse>
   */
  async getPaxGoldPriceData(): Promise<CoinGeckoPaxGoldResponse> {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd';
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: CoinGeckoPaxGoldResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching PAX Gold price data from CoinGecko:', error);
      throw error;
    }
  }

  /**
   * Fetches PAX Gold price and updates the global store
   */
  async fetchAndUpdate(): Promise<void> {
    return fetchAndUpdateCoinGeckoGoldPrice();
  }
}

