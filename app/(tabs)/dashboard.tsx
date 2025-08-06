import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { WalletStorage } from '~/lib/walletStorage';
import { PREDEFINED_TOKENS, calculateTotalNetAssetValue, getTokenById } from '~/lib/tokens';
import { MOCK_TRANSACTIONS, getTransactionIcon, getTransactionColor, getTransactionTitle, formatTimeAgo } from '~/lib/transactions';

export default function DashboardScreen() {
  const { colors } = useColorScheme();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [holdings, setHoldings] = useState<{ [key: string]: number }>({
    gold: 0.5,
    usd: 1000,
    'digital-gas': 250
  });

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const address = await WalletStorage.getWalletAddress();
      setWalletAddress(address);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setIsLoading(false);
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

  const totalNetAssetValue = calculateTotalNetAssetValue(holdings);

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
        <View style={{ width: 24 }} />
        <Text className="text-lg font-bold">
          Wallet
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
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
            <Text className="text-lg font-semibold">
              Your Assets
            </Text>
            <View className="gap-3">
              {PREDEFINED_TOKENS.map((token) => {
                const holding = holdings[token.id] || 0;
                const value = holding * token.price;
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
                          {holding.toFixed(2)} {token.symbol}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-semibold">
                        {formatCurrency(value)}
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
                          {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
              {MOCK_TRANSACTIONS.slice(0, 3).map((transaction) => {
                const token = getTokenById(transaction.tokenId);
                const icon = getTransactionIcon(transaction.type);
                const color = getTransactionColor(transaction.type);
                const title = getTransactionTitle(transaction.type);

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
                      <View>
                        <Text className="text-sm">
                          {title} {token?.symbol}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {formatTimeAgo(transaction.timestamp)}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm">
                        {transaction.amount.toFixed(2)} {token?.symbol}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {formatCurrency(transaction.value)}
                      </Text>
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
