import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { WalletStorage } from '~/lib/walletStorage';

export default function DashboardScreen() {
  const { colors } = useColorScheme();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        <Text variant="title1" className="mt-4 text-center font-bold">
          No Wallet Found
        </Text>
        <Text variant="body" className="mt-2 text-center text-muted-foreground">
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
    <SafeAreaView className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <View className="gap-6">
          {/* Wallet Header */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="rounded-full bg-primary p-3">
                  <MaterialIcons name="account-balance-wallet" size={24} color="white" />
                </View>
                <View>
                  <Text variant="title2" className="font-bold">
                    Vine Wallet
                  </Text>
                  <Text variant="caption1" className="text-muted-foreground">
                    {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Balance Section */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text variant="title3" className="font-semibold">
              Balance
            </Text>
            <View className="gap-2">
              <Text variant="largeTitle" className="font-bold">
                0.00 ETH
              </Text>
              <Text variant="caption1" className="text-muted-foreground">
                ≈ $0.00 USD
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text variant="title3" className="font-semibold">
              Quick Actions
            </Text>
            <View className="gap-3">
              <Button variant="secondary" className="flex-row items-center justify-start gap-3">
                <MaterialIcons name="send" size={20} color={colors.primary} />
                <Text>Send</Text>
              </Button>
              <Button variant="secondary" className="flex-row items-center justify-start gap-3">
                <MaterialIcons name="receipt" size={20} color={colors.primary} />
                <Text>Receive</Text>
              </Button>
              <Button variant="secondary" className="flex-row items-center justify-start gap-3">
                <MaterialIcons name="history" size={20} color={colors.primary} />
                <Text>Transaction History</Text>
              </Button>
            </View>
          </View>

          {/* Recent Activity */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text variant="title3" className="font-semibold">
              Recent Activity
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center justify-center py-8">
                <MaterialIcons name="receipt" size={32} color={colors.grey} />
                <Text variant="body" className="ml-3 text-muted-foreground">
                  No recent transactions
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
