import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { WalletStorage } from '~/lib/walletStorage';
import { PREDEFINED_TOKENS, calculateTotalNetAssetValue, getTokenById, createLiveTokenData } from '~/lib/tokens';
import { getTransactionIcon, getTransactionColor, getTransactionTitle, formatTimeAgo } from '~/lib/transactions';
import { transactionManager } from '~/lib/transactionManager';
import { balanceService, WalletBalances } from '~/lib/balanceService';

export default function DashboardScreen() {
  const { colors } = useColorScheme();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const address = await WalletStorage.getWalletAddress();
      setWalletAddress(address);
      
      // Load live balances if wallet exists
      if (address) {
        await loadBalances();
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBalances = async (fromRefresh = false) => {
    try {
      if (!fromRefresh) {
        setIsLoadingBalances(true);
      }
      console.log('Loading live balances...');
      const liveBalances = await balanceService.getLiveBalances();
      setBalances(liveBalances);
      setLastUpdated(new Date());
      console.log('Live balances loaded successfully:', liveBalances);
      
      // Also refresh transactions when loading balances
      try {
        await transactionManager.refreshTransactions();
        console.log('Transactions refreshed successfully');
      } catch (error) {
        console.error('Failed to refresh transactions:', error);
      }
    } catch (error) {
      console.error('Failed to load balances:', error);
      // Keep balances as null to show loading or error state
    } finally {
      if (!fromRefresh) {
        setIsLoadingBalances(false);
      }
    }
  };

  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log('Pull-to-refresh: Refreshing balances...');
      
      // Add haptic feedback for better user experience
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Reload balances from blockchain
      await loadBalances(true);
      
      // Success haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      console.log('Pull-to-refresh: Balances refreshed successfully');
    } catch (error) {
      console.error('Pull-to-refresh: Failed to refresh balances:', error);
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

  const formatNumber = (num: number) => {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toFixed(2);
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

  // Calculate total net asset value from live balances using single source of truth
  const liveTokens = createLiveTokenData(balances);
  const totalNetAssetValue = liveTokens.reduce((total, token) => total + token.value, 0);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading wallet...</Text>
      </View>
    );
  }

  if (!walletAddress) {
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
                {formatCurrency(totalNetAssetValue)}
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
                onPress={() => loadBalances(false)}
                disabled={isLoadingBalances || isRefreshing}
                className="flex-row items-center gap-1"
              >
                <MaterialIcons 
                  name="refresh" 
                  size={16} 
                  color={(isLoadingBalances || isRefreshing) ? colors.grey : colors.primary} 
                />
                <Text className="text-xs text-primary font-medium">
                  {(isLoadingBalances || isRefreshing) ? 'Loading...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
            {lastUpdated && (
              <Text className="text-xs text-muted-foreground text-center">
                Last updated {formatLastUpdated(lastUpdated)}
              </Text>
            )}
            <View className="gap-3">
              {liveTokens.length > 0 ? liveTokens.map((token) => {
                const priceChangeColor = token.priceChange24h >= 0 ? '#4CAF50' : '#F44336';
                
                return (
                  <TouchableOpacity 
                    key={token.id} 
                    className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4"
                    onPress={() => {
                      console.log('Clicking token:', token.id);
                      router.push({
                        pathname: '/(tabs)/send',
                        params: { 
                          tokenId: token.id,
                          source: 'dashboard'
                        }
                      } as any);
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View 
                        className="rounded-full p-2" 
                        style={{ backgroundColor: token.color + '20' }}
                      >
                        <MaterialIcons 
                          name={token.icon as any} 
                          size={20} 
                          color={token.color} 
                        />
                      </View>
                      <View>
                        <Text className="text-base font-semibold">
                          {token.name}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {token.formattedBalance}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-semibold">
                        {formatCurrency(token.value)}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <MaterialIcons 
                          name={token.priceChange24h >= 0 ? 'trending-up' : 'trending-down'} 
                          size={12} 
                          color={priceChangeColor} 
                        />
                        <Text 
                          className="text-xs"
                          style={{ color: priceChangeColor }}
                        >
                          {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }) : (
                // Loading state or hint
                isLoadingBalances || isRefreshing ? [1, 2, 3].map((i) => (
                  <View key={i} className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-gray-200" />
                      <View>
                        <View className="w-20 h-4 bg-gray-200 rounded mb-1" />
                        <View className="w-16 h-3 bg-gray-200 rounded" />
                      </View>
                    </View>
                    <View className="items-end">
                      <View className="w-16 h-4 bg-gray-200 rounded mb-1" />
                      <View className="w-12 h-3 bg-gray-200 rounded" />
                    </View>
                  </View>
                )) : (
                  <View className="items-center justify-center py-8">
                    <MaterialIcons name="refresh" size={32} color={colors.grey} />
                    <Text className="mt-2 text-center text-muted-foreground">
                      Pull down to refresh balances
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>



          {/* Recent Activity */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
                          <Text className="text-lg font-semibold">
              Recent Activity
            </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions' as any)}>
                <Text className="text-xs text-primary font-medium">
                  View all
                </Text>
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              {transactionManager.getRecentTransactions(3).map((transaction) => {
                const token = getTokenById(transaction.tokenId);
                const icon = getTransactionIcon(transaction.type);
                const color = getTransactionColor(transaction.type);
                const title = getTransactionTitle(transaction.type);

                // Enhanced display for gas token and metadata
                const displaySymbol = transaction.metadata?.tokenSymbol || token?.symbol || '';
                const description = transaction.metadata?.description;

                return (
                  <View key={transaction.id} className="flex-row items-center justify-between py-2">
                    <View className="flex-row items-center gap-3">
                      <View 
                        className="rounded-full p-1.5" 
                        style={{ backgroundColor: color + '15' }}
                      >
                        <MaterialIcons 
                          name={icon as any} 
                          size={14} 
                          color={color} 
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm">
                          {title} {displaySymbol}
                        </Text>
                        {description && (
                          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                            {description}
                          </Text>
                        )}
                        <Text className="text-xs text-muted-foreground">
                          {formatTimeAgo(transaction.timestamp)}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      {transaction.type !== 'approve' && transaction.type !== 'contract_deployment' && (
                        <Text className="text-sm">
                          {transaction.amount.toFixed(transaction.metadata?.tokenDecimals === 6 ? 2 : 4)} {displaySymbol}
                        </Text>
                      )}
                      {transaction.value > 0 && (
                        <Text className="text-xs text-muted-foreground">
                          {formatCurrency(transaction.value)}
                        </Text>
                      )}
                      {transaction.gasFee && (
                        <Text className="text-xs text-orange-600">
                          Gas: {transaction.gasFee.toFixed(6)} MATIC
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
