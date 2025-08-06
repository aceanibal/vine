import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { WalletStorage } from '~/lib/walletStorage';
import { PREDEFINED_TOKENS, calculateTotalNetAssetValue, getTokenById } from '~/lib/tokens';
import { MOCK_TRANSACTIONS } from '~/lib/transactions';

export default function AccountDetailsScreen() {
  const { colors } = useColorScheme();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
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
    }
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
  const totalTransactions = MOCK_TRANSACTIONS.length;
  const accountAge = '2 months'; // Mock data

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="font-bold">
          Account Details
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
        <View className="gap-6">
          {/* Account Overview */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Account Overview
            </Text>
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Total Net Asset Value
                </Text>
                <Text className="font-bold">
                  {formatCurrency(totalNetAssetValue)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Wallet Address
                </Text>
                <Text className="font-mono">
                  {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : 'Loading...'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Account Age
                </Text>
                <Text>
                  {accountAge}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Total Transactions
                </Text>
                <Text>
                  {totalTransactions}
                </Text>
              </View>
            </View>
          </View>

          {/* Holdings Breakdown */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Holdings Breakdown
            </Text>
            <View className="gap-3">
              {PREDEFINED_TOKENS.map((token) => {
                const holding = holdings[token.id] || 0;
                const value = holding * token.price;
                const percentage = totalNetAssetValue > 0 ? (value / totalNetAssetValue) * 100 : 0;
                
                return (
                  <View key={token.id} className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View 
                        className="rounded-full p-2" 
                        style={{ backgroundColor: token.color + '20' }}
                      >
                        <MaterialIcons 
                          name={token.icon as any} 
                          size={16} 
                          color={token.color} 
                        />
                      </View>
                      <View>
                        <Text className="font-semibold">
                          {token.name}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {holding.toFixed(2)} {token.symbol}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-semibold">
                        {formatCurrency(value)}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {percentage.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Performance Metrics */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Performance Metrics
            </Text>
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  24h Change
                </Text>
                <Text className="text-green-500 font-semibold">
                  +$487.63 (+2.5%)
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  7d Change
                </Text>
                <Text className="text-green-500 font-semibold">
                  +$1,234.56 (+5.2%)
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  30d Change
                </Text>
                <Text className="text-red-500 font-semibold">
                  -$234.12 (-1.1%)
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 