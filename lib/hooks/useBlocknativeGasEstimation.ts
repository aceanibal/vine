import { useQuery } from '@tanstack/react-query';
import { useGlobalStore, useGasPrice, useGasPriority } from '../stores/useGlobalStore';
import { blocknativeApi, ChainId } from '../services/blocknativeApi';

/**
 * Hook to fetch and store gas prices from Blocknative API with priority levels
 */
export const useBlocknativeGasPriceWithPriority = (chainId: ChainId) => {
  const setGasPrice = useGlobalStore((state) => state.setGasPrice);

  return useQuery({
    queryKey: ['blocknativeGasPrice', chainId, 'priority'],
    queryFn: async () => {
      const response = await blocknativeApi.getGasPrices(chainId);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Store in global store
      setGasPrice(chainId, response.data);
      
      return response.data;
    },
    enabled: !!chainId && blocknativeApi.isConfigured(),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook to get current gas price from Blocknative for a specific priority
 */
export const useBlocknativeCurrentGasPrice = (
  chainId: ChainId,
  priority: 'slow' | 'standard' | 'fast' = 'standard'
) => {
  return useQuery({
    queryKey: ['blocknativeCurrentGasPrice', chainId, priority],
    queryFn: async () => {
      const response = await blocknativeApi.getCurrentGasPrice(chainId, priority);
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    enabled: !!chainId && blocknativeApi.isConfigured(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook to calculate gas fee in USD using Blocknative gas prices
 */
export const useBlocknativeGasFeeCalculation = (chainId: ChainId, gasLimit?: string) => {
  const gasPriority = useGasPriority();
  const gasPrice = useGasPrice(chainId, gasPriority);

  return {
    gasPrice,
    gasPriority,
    calculateGasFee: (tokenPrice: number = 0.5) => {
      if (!gasPrice || !gasLimit) return 0;
      
      // Convert gas price from wei to native token units
      const gasPriceInEth = parseFloat(gasPrice) / Math.pow(10, 18);
      
      // Calculate gas fee in native token
      const gasFeeInNative = parseFloat(gasLimit) * gasPriceInEth;
      
      // Convert to USD
      return gasFeeInNative * tokenPrice;
    },
  };
};

/**
 * Hook to get real-time gas price updates for the send screen
 */
export const useSendScreenGasPrices = (chainId: ChainId) => {
  const gasPriority = useGasPriority();
  
  // Get all gas prices with priority levels
  const { 
    data: gasPrices, 
    isLoading: isGasPriceLoading, 
    error: gasPriceError,
    refetch: refetchGasPrices 
  } = useBlocknativeGasPriceWithPriority(chainId);

  // Get current gas price for selected priority
  const { 
    data: currentGasPrice, 
    isLoading: isCurrentGasPriceLoading 
  } = useBlocknativeCurrentGasPrice(chainId, gasPriority);

  return {
    gasPrices,
    currentGasPrice,
    isLoading: isGasPriceLoading || isCurrentGasPriceLoading,
    error: gasPriceError,
    refetchGasPrices,
    isConfigured: blocknativeApi.isConfigured(),
  };
};
