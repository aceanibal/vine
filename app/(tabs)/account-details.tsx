import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import * as Clipboard from 'expo-clipboard';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { WalletStorage } from '~/lib/walletStorage';
import { PREDEFINED_TOKENS, calculateTotalNetAssetValue, getTokenById, createLiveTokenData } from '~/lib/tokens';
import { MOCK_TRANSACTIONS } from '~/lib/transactions';
import { balanceService, WalletBalances } from '~/lib/balanceService';
import { CustomModal } from '~/components/CustomModal';
import { ErrorModalConfig, ErrorSeverity } from '~/lib/blockchainErrorHandler';

export default function AccountDetailsScreen() {
  const { colors } = useColorScheme();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<ErrorModalConfig | null>(null);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

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
    }
  };

  const loadBalances = async () => {
    try {
      setIsLoadingBalances(true);
      console.log('Loading live balances for account details...');
      const liveBalances = await balanceService.getLiveBalances();
      setBalances(liveBalances);
      console.log('Live balances loaded for account details:', liveBalances);
    } catch (error) {
      console.error('Failed to load balances in account details:', error);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const copyAddressToClipboard = async () => {
    if (walletAddress) {
      try {
        await Clipboard.setStringAsync(walletAddress);
        setModalConfig({
          title: 'Address Copied!',
          message: 'Your wallet address has been copied to the clipboard.',
          severity: ErrorSeverity.LOW,
          primaryAction: {
            label: 'OK',
            action: () => setModalConfig(null)
          }
        });
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        setModalConfig({
          title: 'Copy Failed',
          message: 'Failed to copy address to clipboard. Please try again.',
          severity: ErrorSeverity.MEDIUM,
          primaryAction: {
            label: 'OK',
            action: () => setModalConfig(null)
          }
        });
      }
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

  // Calculate total net asset value from live balances using single source of truth
  const liveTokens = createLiveTokenData(balances);
  const totalNetAssetValue = liveTokens.reduce((total, token) => total + token.value, 0);
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
        <View className="w-6" />
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
                <TouchableOpacity 
                  onPress={copyAddressToClipboard}
                  className="flex-row items-center gap-2"
                >
                  <Text className="font-mono">
                    {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : 'Loading...'}
                  </Text>
                  {walletAddress && (
                    <MaterialIcons name="content-copy" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
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
              {liveTokens.length > 0 ? liveTokens.map((token) => {
                const percentage = totalNetAssetValue > 0 ? (token.value / totalNetAssetValue) * 100 : 0;
                
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
                          {token.formattedBalance}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-semibold">
                        {formatCurrency(token.value)}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {percentage.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                );
              }) : (
                // Loading state
                [1, 2, 3].map((i) => (
                  <View key={i} className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="w-8 h-8 rounded-full bg-gray-200" />
                      <View>
                        <View className="w-16 h-4 bg-gray-200 rounded mb-1" />
                        <View className="w-12 h-3 bg-gray-200 rounded" />
                      </View>
                    </View>
                    <View className="items-end">
                      <View className="w-16 h-4 bg-gray-200 rounded mb-1" />
                      <View className="w-8 h-3 bg-gray-200 rounded" />
                    </View>
                  </View>
                ))
              )}
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

      {/* Custom Modal for feedback */}
      {modalConfig && (
        <CustomModal
          isVisible={true}
          title={modalConfig.title}
          message={modalConfig.message}
          severity={modalConfig.severity}
          primaryAction={modalConfig.primaryAction}
          secondaryAction={modalConfig.secondaryAction}
          onClose={() => setModalConfig(null)}
        />
      )}
    </SafeAreaView>
  );
} 