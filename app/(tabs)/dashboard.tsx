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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get wallet and token data from stores
  const currentWallet = useCurrentWallet();
  const addWallet = useGlobalStore((state) => state.addWallet);
  const tokens = useAllTokens();
  
  // Get recent transactions for display from global store
  const allTransactions = useAllTransactions();
  const recentTransactions = useMemo(() => allTransactions.slice(0, 5), [allTransactions]);
  
  // Calculate total portfolio value locally
  const totalPortfolioValue = useMemo(() => {
    return tokens.reduce((total, token) => {
      if (token.balance && token.price) {
        const balance = parseFloat(token.balance) / Math.pow(10, token.decimals);
        return total + (balance * token.price);
      }
      return total;
    }, 0);
  }, [tokens]);
  
  // Set wallet address when component mounts
  useEffect(() => {
    if (currentWallet?.address) {
      setWalletAddress(currentWallet.address);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [currentWallet]);

  // Check if wallet exists
  const hasWallet = !!walletAddress;

  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log('Pull-to-refresh: Refreshing...');
      
      // Add haptic feedback for better user experience
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Just update the last updated time
      setLastUpdated(new Date());
      
      // Success haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      console.log('Pull-to-refresh: Refresh completed');
    } catch (error) {
      console.error('Pull-to-refresh: Failed to refresh:', error);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Removed formatNumber function - not used in dashboard

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
    // Get all data from global store - no calculations here
    const formattedBalance = token.formattedBalance || '0';
    const tokenValue = token.tokenValue || 0;
    const price = token.price || 0;

    return (
      <TouchableOpacity 
        className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4"
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
            size={20}
            backgroundColor={getTokenIconProps(token).color + '20'}
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
          {price > 0 && (
            <Text className="text-xs text-muted-foreground">
              ${price.toFixed(2)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
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
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <View className="w-6" />
        <Text className="text-lg font-bold">
          Wallet
        </Text>
        <View className="w-6" />
      </View>
      <ScrollView 
        className="flex-1 bg-gray-50" 
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background}
          />
        }
      >
        <View className="gap-6">

          {/* Total Net Asset Value */}
          <TouchableOpacity 
            className="gap-4 rounded-xl border border-border bg-card p-6"
            onPress={() => router.push('/(tabs)/account-details' as any)}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold">
                Total Net Asset Value
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
            </View>
            <View className="gap-2">
              <Text className="text-lg font-bold">
                {formatCurrency(totalPortfolioValue)}
              </Text>
              <Text className="text-xs text-muted-foreground">
                Portfolio Value
              </Text>
            </View>
          </TouchableOpacity>

          {/* Assets List */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold">
                Your Assets
              </Text>
              <TouchableOpacity 
                onPress={onRefresh}
                disabled={isRefreshing}
                className="flex-row items-center gap-1"
              >
                <MaterialIcons 
                  name="refresh" 
                  size={16} 
                  color={isRefreshing ? colors.grey : colors.primary} 
                />
                <Text className="text-xs text-primary font-medium">
                  {isRefreshing ? 'Loading...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
            {lastUpdated && (
              <Text className="text-xs text-muted-foreground text-center">
                Last updated {formatLastUpdated(lastUpdated)}
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
                // TODO: Navigate to new transactions screen when implemented
                console.log('Navigate to transactions screen');
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
                    className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4"
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
                          {new Date(tx.timestamp).toLocaleDateString()}
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
