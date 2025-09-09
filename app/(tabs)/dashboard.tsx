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
import { useGlobalStore, useCurrentWallet, useAllTokens, useAllTransactions } from '~/lib/stores/useGlobalStore';

export default function DashboardScreen() {
  const { colors } = useColorScheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Get wallet and token data from stores
  const currentWallet = useCurrentWallet();
  const addWallet = useGlobalStore((state) => state.addWallet);
  const tokens = useAllTokens();
  const refreshWalletData = useGlobalStore((state) => state.refreshWalletData);
  const isLoading = useGlobalStore((state) => state.appState.isLoading);
  const error = useGlobalStore((state) => state.appState.error);
  const lastUpdated = useGlobalStore((state) => state.appState.lastUpdated);
  
  // Get recent transactions for display from global store
  const allTransactions = useAllTransactions();
  const recentTransactions = useMemo(() => {
    // Sort transactions by timestamp (newest first) and take the first 5
    return allTransactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [allTransactions]);
  
  // Calculate total portfolio value locally
  const totalPortfolioValue = useMemo(() => {
    return tokens.reduce((total, token) => {
      if (token.balance && token.price?.usd) {
        const balance = parseFloat(token.balance) / Math.pow(10, token.decimals);
        return total + (balance * token.price.usd);
      }
      // Fallback for legacy price format (if any tokens still use the old number format)
      if (token.balance && typeof token.price === 'number' && token.price > 0) {
        const balance = parseFloat(token.balance) / Math.pow(10, token.decimals);
        return total + (balance * token.price);
      }
      return total;
    }, 0);
  }, [tokens]);

  // Calculate weighted average portfolio performance
  const portfolioPerformance = useMemo(() => {
    let totalValue = 0;
    let weightedPerformance = 0;
    
    tokens.forEach(token => {
      if (token.balance && token.price?.usd) {
        const balance = parseFloat(token.balance) / Math.pow(10, token.decimals);
        const value = balance * token.price.usd;
        const performance = token.price.percentChange24h || token.price.usdPrice24hrPercentChange || 0;
        
        totalValue += value;
        weightedPerformance += value * performance;
      }
    });
    
    return totalValue > 0 ? weightedPerformance / totalValue : 0;
  }, [tokens]);
  
  // Set wallet address when component mounts
  useEffect(() => {
    if (currentWallet?.address) {
      setWalletAddress(currentWallet.address);
      setIsPageLoading(false);
    } else {
      setIsPageLoading(false);
    }
  }, [currentWallet]);

  // Check if wallet exists
  const hasWallet = !!walletAddress;

  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log('Pull-to-refresh: Refreshing wallet data...');
      
      // Add haptic feedback for better user experience
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Call the global store refresh function
      await refreshWalletData();
      
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

  // Component to display a single token with balance
  const TokenItem = ({ token }: { token: any }) => {
    // Format balance from raw balance and decimals
    const formattedBalance = formatTokenBalance(token.balance || '0', token.decimals || 18);
    const tokenValue = parseFloat(token.tokenValue || '0');
    const priceInfo = token.price; // This should be TokenPriceInfo object
    const currentPrice = priceInfo?.usd || 0;
    const percentChange = priceInfo?.percentChange24h || priceInfo?.usdPrice24hrPercentChange;
    const formattedPercentage = formatPercentage(percentChange);
    const percentageColor = getPercentageColor(percentChange);

    return (
      <TouchableOpacity 
        className="flex-row items-center justify-between rounded-lg p-1"
        onPress={() => {
          router.push({
            pathname: '/(tabs)/send',
            params: { 
              tokenAddress: token.address,
              chainId: token.chainId,
              source: 'dashboard'
            }
          } as any);
        }}
      >
        <View className="flex-row items-center gap-3">
          <TokenIcon
            {...getTokenIconProps(token)}
            size={30}
          />
          <View>
            <Text className="text-base font-semibold">
              {token.symbol}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {token.name} • {token.chainName}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {formattedBalance} {token.symbol}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-base font-semibold">
            {formatCurrency(tokenValue)}
          </Text>
          <View className="flex-row items-center gap-1">
            {currentPrice > 0 && (
              <Text className="text-xs text-muted-foreground">
                {formatPrice(currentPrice)}
              </Text>
            )}
            {formattedPercentage && (
              <Text className={`text-xs font-medium ${percentageColor}`}>
                {formattedPercentage}
              </Text>
            )}
          </View>
          {priceInfo?.exchangeName && (
            <Text className="text-xs text-muted-foreground mt-0.5">
              via {priceInfo.exchangeName}
            </Text>
          )}
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
                  {formatCurrency(totalPortfolioValue)}
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
              {tokens.length > 0 ? tokens.map((token) => (
                <TokenItem key={`${token.address}-${token.chainId}`} token={token} />
              )) : (
                <View className="items-center justify-center py-8">
                  <MaterialIcons name="account-balance-wallet" size={32} color={colors.grey} />
                  <Text className="mt-2 text-center text-muted-foreground">
                    No tokens found
                  </Text>
                  <Text className="text-xs text-center text-muted-foreground mt-1">
                    Tokens will appear here when you have transaction history
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
                recentTransactions.map((tx, index) => (
                  <TouchableOpacity 
                    key={`${tx.hash}-${index}`}
                    className="flex-row items-center justify-between rounded-lg p-2"
                    onPress={() => {
                      console.log('Transaction pressed:', tx.hash);
                      // TODO: Navigate to transaction details
                    }}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                        tx.direction === 'receive' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <MaterialIcons 
                          name={tx.direction === 'receive' ? 'arrow-downward' : 'arrow-upward'} 
                          size={20} 
                          color={tx.direction === 'receive' ? '#10B981' : '#EF4444'} 
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="font-medium text-foreground">
                          {tx.summary || `${tx.direction} ${tx.tokenSymbol || 'transaction'}`}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleDateString()} at {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className={`font-medium ${
                        tx.direction === 'receive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.direction === 'receive' ? '+' : '-'}{tx.formattedValue || '0'} {tx.tokenSymbol || ''}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {tx.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
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
