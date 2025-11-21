import { useGlobalStore } from '../stores/useGlobalStore';

/**
 * Price history data point
 */
export interface PriceHistoryPoint {
  date: string;
  price: number;
}

/**
 * CoinGecko market chart response interface
 */
interface CoinGeckoMarketChartResponse {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

/**
 * Fetches PAX Gold price history from CoinGecko API
 * @param days - Number of days of history to fetch (default: 30)
 * @returns Promise<PriceHistoryPoint[]> - Array of historical price points
 */
export async function fetchPaxGoldPriceHistory(days: number = 30): Promise<PriceHistoryPoint[]> {
  const url = `https://api.coingecko.com/api/v3/coins/pax-gold/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  
  try {
    console.log('GoldHistoryPriceService: Fetching price history from CoinGecko:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: CoinGeckoMarketChartResponse = await response.json();
    console.log('GoldHistoryPriceService: Received history data:', {
      pointsCount: data.prices.length,
      firstTimestamp: data.prices[0]?.[0],
      lastTimestamp: data.prices[data.prices.length - 1]?.[0],
    });
    
    // Transform CoinGecko data to PriceHistoryPoint format
    // Prices are already in USD per token (1 token = 1 troy ounce)
    const pricePoints: PriceHistoryPoint[] = data.prices
      .map(([timestamp, price]) => {
        // Convert timestamp to date string (YYYY-MM-DD)
        const date = new Date(timestamp);
        const dateString = date.toISOString().split('T')[0];
        
        return {
          date: dateString,
          price: price, // Price is already in USD per ounce
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log('GoldHistoryPriceService: Transformed price history:', {
      pointsCount: pricePoints.length,
      firstPoint: pricePoints[0],
      lastPoint: pricePoints[pricePoints.length - 1],
    });
    
    return pricePoints;
  } catch (error) {
    console.error('Error fetching PAX Gold price history from CoinGecko:', error);
    throw error;
  }
}

/**
 * Checks if current time is after 4 PM London time (16:00 GMT/BST)
 * @returns boolean - True if after 4 PM London time
 */
function isAfterLbmaClose(): boolean {
  const now = new Date();
  
  // Get current time in London timezone
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const londonHours = londonTime.getHours();
  
  // After 4 PM (16:00) London time
  return londonHours >= 16;
}

/**
 * Gets today's 4 PM London time
 * @returns Date - Today at 4 PM London time
 */
function getTodayLbmaCloseTime(): Date {
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  
  // Create a date at 16:00 (4 PM) London time today
  const closeTime = new Date(londonTime);
  closeTime.setHours(16, 0, 0, 0);
  
  return closeTime;
}

/**
 * Checks if gold price history needs refreshing (once daily after 4 PM London time)
 * and refreshes if needed
 * @param lastHistoryFetch - Last fetch timestamp from global store
 * @param days - Number of days of history to fetch (default: 30)
 * @returns Promise<PriceHistoryPoint[] | null> - Price history array if fetched, null if not needed
 */
export async function checkAndRefreshPaxGoldPriceHistory(
  lastHistoryFetch: Date | null,
  days: number = 30
): Promise<PriceHistoryPoint[] | null> {
  // Check if we're past 4 PM London time
  if (!isAfterLbmaClose()) {
    console.log('GoldHistoryPriceService: Not yet past 4 PM London time, skipping history refresh');
    return null;
  }
  
  // Get today's 4 PM London time
  const todayCloseTime = getTodayLbmaCloseTime();
  
  // Check if we've already fetched after today's 4 PM
  if (lastHistoryFetch && lastHistoryFetch.getTime() >= todayCloseTime.getTime()) {
    console.log('GoldHistoryPriceService: Gold price history already fetched today after 4 PM, no refresh needed', {
      lastFetch: lastHistoryFetch.toISOString(),
      todayClose: todayCloseTime.toISOString(),
    });
    return null;
  }
  
  console.log('GoldHistoryPriceService: Gold price history is stale, refreshing...', {
    lastFetch: lastHistoryFetch?.toISOString(),
    now: new Date().toISOString(),
  });
  
  try {
    const priceHistory = await fetchPaxGoldPriceHistory(days);
    console.log('GoldHistoryPriceService: Gold price history auto-refresh completed successfully', {
      pointsCount: priceHistory.length,
    });
    return priceHistory;
    
  } catch (error) {
    console.error('GoldHistoryPriceService: Failed to auto-refresh gold price history:', error);
    // Don't throw error for auto-refresh failures to avoid disrupting user experience
    return null;
  }
}

/**
 * Fetches PAX Gold price history and updates the global store
 * @param days - Number of days of history to fetch (default: 30)
 */
export async function fetchAndUpdatePaxGoldPriceHistory(days: number = 30): Promise<void> {
  try {
    console.log('GoldHistoryPriceService: Fetching and updating price history...');
    
    const priceHistory = await fetchPaxGoldPriceHistory(days);
    
    // Update the global store with price history
    useGlobalStore.setState((state) => ({
      appState: {
        ...state.appState,
        goldPrice: {
          history: priceHistory,
          lastHistoryFetch: new Date(),
        },
      },
    }));
    
    console.log('GoldHistoryPriceService: Price history updated successfully', {
      pointsCount: priceHistory.length,
    });
    
  } catch (error) {
    console.error('GoldHistoryPriceService: Failed to fetch and update price history:', error);
    throw error;
  }
}

