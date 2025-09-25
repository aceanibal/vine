import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import * as Haptics from 'expo-haptics';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { TokenIcon, getTokenIconProps } from '~/components/TokenIcon';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore, useCurrentWallet, usePredefinedToken } from '~/lib/stores/useGlobalStore';

export default function DashboardScreen() {
  const { colors } = useColorScheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Get wallet and token data from stores
  const currentWallet = useCurrentWallet();
  const predefinedToken = usePredefinedToken();
  const tokenBalance = useGlobalStore((state) => state.tokenBalance);
  const refreshWalletData = useGlobalStore((state) => state.refreshWalletData);
  const fetchTransactionData = useGlobalStore((state) => state.fetchTransactionData);
  const refreshGoldPrice = useGlobalStore((state) => state.refreshGoldPrice);
  const isLoading = useGlobalStore((state) => state.appState.isLoading);
  const error = useGlobalStore((state) => state.appState.error);
  const lastUpdated = useGlobalStore((state) => state.appState.lastUpdated);
  
  // Debug logging to see what we have
  console.log('Dashboard Debug:', {
    hasCurrentWallet: !!currentWallet,
    hasPredefinedToken: !!predefinedToken,
    hasTokenBalance: !!tokenBalance,
    tokenBalance: tokenBalance,
    predefinedToken: predefinedToken
  });
  
  // Get recent transactions for display from global store
  const allTransfers = useGlobalStore((state) => state.allTransfers);
  const recentTransactions = useMemo(() => {
    // Sort transfers by block number (newest first) and take the first 5
    return allTransfers
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, 5);
  }, [allTransfers]);
  
  // Calculate total portfolio value using predefined token
  const totalPortfolioValue = useMemo(() => {
    if (!predefinedToken) {
      return 0;
    }
    
    // Use decimal balance if available, otherwise fall back to parsing hex
    const rawBalance = tokenBalance?.balance?.tokenBalanceDecimal || tokenBalance?.balance?.tokenBalance;
    const price = typeof (predefinedToken as any).price === 'number' ? (predefinedToken as any).price : 121;
    
    // Parse numeric balance from decimal string (already normalized by alchemy proxy)
    let balanceNumber = 0;
    try {
      if (typeof rawBalance === 'string') {
        const rawBig = BigInt(rawBalance);
        balanceNumber = Number(rawBig) / Math.pow(10, predefinedToken.decimals);
      }
    } catch (_e) {
      balanceNumber = 0;
    }
    
    const value = balanceNumber * price;
    return Number.isFinite(value) ? value : 0;
  }, [predefinedToken, tokenBalance]);

  // Calculate portfolio performance (simplified for single token)
  const portfolioPerformance = useMemo(() => {
    // For now, return 0 as we don't have 24h change data for the predefined token
    return 0;
  }, []);
  
  // Set wallet address when component mounts and fetch transaction data
  useEffect(() => {
    if (currentWallet?.address) {
      setWalletAddress(currentWallet.address);
      setIsPageLoading(false);
      
      // Fetch transaction data when wallet is available
      fetchTransactionData().catch((error) => {
        console.error('Failed to fetch transaction data on mount:', error);
      });
    } else {
      setIsPageLoading(false);
    }
  }, [currentWallet, fetchTransactionData]);

  // Check if wallet exists
  const hasWallet = !!walletAddress;

  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log('Pull-to-refresh: Refreshing wallet data...');
      
      // Add haptic feedback for better user experience
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Call all refresh functions
      await Promise.all([
        refreshWalletData(),
        fetchTransactionData(),
        refreshGoldPrice()
      ]);
      
      // Success haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      console.log('Pull-to-refresh: Wallet data refresh completed');
    } catch (error) {
      console.error('Pull-to-refresh: Failed to refresh wallet data:', error);
      // Error haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateWallet = () => {
    router.push('/(auth)/create-wallet' as any);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(amount);
    } else if (amount >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amount);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(price);
    } else if (price >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(price);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    }
  };

  const formatCompactNumber = (num: number) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (percentage: number | null | undefined) => {
    if (percentage === null || percentage === undefined || isNaN(percentage)) {
      return null;
    }
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const getPercentageColor = (percentage: number | null | undefined) => {
    if (percentage === null || percentage === undefined || isNaN(percentage)) {
      return 'text-muted-foreground';
    }
    return percentage >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatTokenBalance = (balance: string, decimals: number) => {
    try {
      const balanceBigInt = BigInt(balance);
      const divisor = BigInt(10 ** decimals);
      const wholePart = balanceBigInt / divisor;
      const fractionalPart = balanceBigInt % divisor;
      
      // Convert to number for easier formatting of large balances
      const wholePartNumber = Number(wholePart);
      
      // For very large balances, use compact notation
      if (wholePartNumber >= 1000000) {
        return formatCompactNumber(wholePartNumber);
      }
      
      if (fractionalPart === BigInt(0)) {
        return wholePart.toString();
      }
      
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      const trimmedFractional = fractionalStr.replace(/0+$/, '');
      
      if (trimmedFractional === '') {
        return wholePart.toString();
      }
      
      // For balances with decimals, limit decimal places for readability
      const maxDecimalPlaces = wholePartNumber >= 1000 ? 2 : 4;
      const limitedFractional = trimmedFractional.substring(0, maxDecimalPlaces);
      
      return `${wholePart}.${limitedFractional}`;
    } catch (error) {
      console.error('Error formatting token balance:', error);
      return '0';
    }
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTransactionDate = (timestamp: string | null, blockNumber?: number) => {
    // If we have a valid timestamp, use it
    if (timestamp) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    
    // If no timestamp but we have block number, show block info
    if (blockNumber) {
      return `Block #${blockNumber}`;
    }
    
    // Final fallback
    return 'Unknown date';
  };

  // Component to display the predefined token with balance
  const PredefinedTokenItem = () => {
    if (!predefinedToken) {
      return null;
    }
    
    // Use decimal balance if available, otherwise fall back to parsing hex
    const rawBalance = tokenBalance?.balance?.tokenBalanceDecimal || tokenBalance?.balance?.tokenBalance || '0';
    const price = typeof (predefinedToken as any).price === 'number' ? (predefinedToken as any).price : 121;
    
    // Format balance string for display
    const formattedBalance = formatTokenBalance(rawBalance, predefinedToken.decimals);
    
    // Numeric balance for value calculation (uses normalized decimal string)
    let numericBalance = 0;
    try {
      const rawBig = BigInt(rawBalance);
      numericBalance = Number(rawBig) / Math.pow(10, predefinedToken.decimals);
    } catch (_e) {
      numericBalance = 0;
    }
    
    const tokenValue = numericBalance * price;

    return (
      <TouchableOpacity 
        className="flex-row items-center justify-between rounded-lg p-1"
        onPress={() => {
          router.push({
            pathname: '/(tabs)/send',
            params: { 
              tokenAddress: predefinedToken.address,
              chainId: 137, // Polygon mainnet
              source: 'dashboard'
            }
          } as any);
        }}
      >
        <View className="flex-row items-center gap-3">
          <TokenIcon
            {...getTokenIconProps({
              symbol: predefinedToken.symbol,
              name: predefinedToken.name,
              address: predefinedToken.address
            })}
            size={30}
          />
          <View>
            <Text className="text-base font-semibold">
              {predefinedToken.symbol}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {predefinedToken.name} • Polygon
            </Text>
            <Text className="text-xs text-muted-foreground">
              {formattedBalance} {predefinedToken.symbol}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-base font-semibold">
            {formatCurrency(tokenValue)}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-muted-foreground">
              {formatPrice(price)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isPageLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading wallet...</Text>
      </View>
    );
  }

  if (!hasWallet) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <MaterialIcons name="account-balance-wallet" size={64} color={colors.primary} />
        <Text className="mt-4 text-center text-lg font-bold">
          No Wallet Found
        </Text>
        <Text className="mt-2 text-center text-base text-muted-foreground">
          Create a new wallet to get started with Vine
        </Text>
        <Button 
          size="lg" 
          className="mt-8"
          onPress={handleCreateWallet}
        >
          <MaterialIcons name="add-circle" size={20} color="white" />
          <Text>Create Wallet</Text>
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-2 py-4 border-b border-border bg-white">
        <View className="w-6" />
        <Text className="text-lg font-bold">
          Vine Wallet
        </Text>
        <View className="w-6" />
      </View>
      <ScrollView 
        className="flex-1 bg-gray-50" 
        contentContainerClassName="px-2 py-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background}
          />
        }
      >
        <View className="gap-6">

          {/* Total Net Asset Value */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold">
                Total Net Asset Value
              </Text>
            </View>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-bold">
                  {isNaN(totalPortfolioValue) ? '$0.00' : formatCurrency(totalPortfolioValue)}
                </Text>
                {formatPercentage(portfolioPerformance) && (
                  <View className={`px-2 py-1 rounded-full ${portfolioPerformance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Text className={`text-xs font-medium ${getPercentageColor(portfolioPerformance)}`}>
                      {formatPercentage(portfolioPerformance)}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-muted-foreground">
                Portfolio Value{portfolioPerformance !== 0 ? ' • 24h Change' : ''}
              </Text>
            </View>
          </View>

          {/* Assets List */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold">
                Your Assets
              </Text>
              <TouchableOpacity 
                onPress={onRefresh}
                disabled={isRefreshing || isLoading}
                className="flex-row items-center gap-1"
              >
                <MaterialIcons 
                  name="refresh" 
                  size={16} 
                  color={(isRefreshing || isLoading) ? colors.grey : colors.primary} 
                />
                <Text className="text-xs text-primary font-medium">
                  {(isRefreshing || isLoading) ? 'Loading...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
            {lastUpdated && (
              <Text className="text-xs text-muted-foreground text-center">
                Last updated {formatLastUpdated(lastUpdated)}
              </Text>
            )}
            {error && (
              <Text className="text-xs text-red-600 text-center mt-1">
                Error: {error}
              </Text>
            )}
            <View className="gap-3">
              {predefinedToken ? (
                <PredefinedTokenItem />
              ) : (
                <View className="items-center justify-center py-8">
                  <MaterialIcons name="account-balance-wallet" size={32} color={colors.grey} />
                  <Text className="mt-2 text-center text-muted-foreground">
                    No token configured
                  </Text>
                  <Text className="text-xs text-center text-muted-foreground mt-1">
                    Token will appear here when configured
                  </Text>
                </View>
              )}
            </View>
          </View>



          {/* Recent Activity */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold">
                Recent Activity
              </Text>
              <TouchableOpacity onPress={() => {
                router.push('/(tabs)/transactions' as any);
              }}>
                <Text className="text-xs text-primary font-medium">
                  View all
                </Text>
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transfer, index) => {
                  const isReceive = transfer.to.toLowerCase() === currentWallet?.address?.toLowerCase();
                  const isSend = transfer.from.toLowerCase() === currentWallet?.address?.toLowerCase();
                  const direction = isReceive ? 'receive' : 'send';
                  
                  // Format the transfer value
                  const formattedValue = predefinedToken ? 
                    formatTokenBalance(transfer.rawValue, predefinedToken.decimals) : 
                    transfer.value.toString();
                  
                  return (
                    <TouchableOpacity 
                      key={`${transfer.hash}-${index}`}
                      className="flex-row items-center justify-between rounded-lg p-2"
                      onPress={() => {
                        console.log('Transaction pressed:', transfer.hash);
                        // TODO: Navigate to transaction details
                      }}
                    >
                      <View className="flex-row items-center flex-1">
                        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                          direction === 'receive' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <MaterialIcons 
                            name={direction === 'receive' ? 'arrow-downward' : 'arrow-upward'} 
                            size={20} 
                            color={direction === 'receive' ? '#10B981' : '#EF4444'} 
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="font-medium text-foreground">
                            {direction === 'receive' ? 'Received' : 'Sent'} {predefinedToken?.symbol || 'tokens'}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            {formatTransactionDate(transfer.timestamp, transfer.blockNumber)}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className={`font-medium ${
                          direction === 'receive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {direction === 'receive' ? '+' : '-'}{formattedValue} {predefinedToken?.symbol || ''}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          Block #{transfer.blockNumber}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="items-center justify-center py-8">
                  <MaterialIcons name="history" size={32} color={colors.grey} />
                  <Text className="mt-2 text-center text-muted-foreground">
                    No transactions yet
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center mt-1">
                    Your transaction history will appear here
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
