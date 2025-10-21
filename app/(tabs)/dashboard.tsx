import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

import { Button } from 'react-native-paper';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore, useCurrentWallet, usePredefinedToken } from '~/lib/stores/useGlobalStore';
import { PriceChart } from '~/components/PriceChart';

// Helper functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatTokenBalance = (balance: string, decimals: number) => {
  try {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balanceBigInt / divisor;
    const fractionalPart = balanceBigInt % divisor;
    
    if (fractionalPart === BigInt(0)) {
      return wholePart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '').substring(0, 4);
    
    return trimmedFractional ? `${wholePart}.${trimmedFractional}` : wholePart.toString();
  } catch (error) {
    return '0';
  }
};

const formatLastUpdated = (date: Date | null) => {
  if (!date) return '';
  
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString();
};

const formatTransactionDate = (timestamp: string | null, blockNumber?: number) => {
  if (timestamp) {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  }
  return blockNumber ? `Block #${blockNumber}` : 'Unknown date';
};

export default function DashboardScreen() {
  const { colors } = useColorScheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

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
  const allTransfers = useGlobalStore((state) => state.allTransfers);
  
  // Get recent transactions
  const recentTransactions = useMemo(() => {
    return allTransfers
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, 5);
  }, [allTransfers]);
  
  // Calculate token data
  const tokenData = useMemo(() => {
    if (!predefinedToken) {
      return { balance: '0', price: 0, totalValue: 0 };
    }
    
    const rawBalance = tokenBalance?.balance?.tokenBalanceDecimal || tokenBalance?.balance?.tokenBalance || '0';
    const price = typeof (predefinedToken as any).price === 'number' ? (predefinedToken as any).price : 121;
    
    let numericBalance = 0;
    try {
      const rawBig = BigInt(rawBalance);
      numericBalance = Number(rawBig) / Math.pow(10, predefinedToken.decimals);
    } catch {
      numericBalance = 0;
    }
    
    const balance = formatTokenBalance(rawBalance, predefinedToken.decimals);
    const totalValue = numericBalance * price;
    
    return {
      balance,
      price,
      totalValue: Number.isFinite(totalValue) ? totalValue : 0
    };
  }, [predefinedToken, tokenBalance]);
  
  // Mock price history data (7 days)
  const priceHistory = useMemo(() => {
    const now = Date.now();
    const basePrice = tokenData.price || 121;
    return [
      { timestamp: now - 86400000 * 6, price: basePrice * 0.98 },
      { timestamp: now - 86400000 * 5, price: basePrice * 0.99 },
      { timestamp: now - 86400000 * 4, price: basePrice * 0.97 },
      { timestamp: now - 86400000 * 3, price: basePrice * 1.01 },
      { timestamp: now - 86400000 * 2, price: basePrice * 0.99 },
      { timestamp: now - 86400000 * 1, price: basePrice * 1.02 },
      { timestamp: now, price: basePrice },
    ];
  }, [tokenData.price]);

  
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

  // Active transaction UI and success handling moved to its own screen

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

  const copyToClipboard = async () => {
    if (currentWallet?.address) {
      try {
        await Clipboard.setStringAsync(currentWallet.address);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };


  if (isPageLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-lapis-lazuli">Loading wallet...</Text>
      </View>
    );
  }

  if (!hasWallet) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <MaterialIcons name="account-balance-wallet" size={64} color={colors.primary} />
        <Text className="mt-4 text-center text-lg font-bold text-lapis-lazuli" numberOfLines={2}>
          No Wallet Found
        </Text>
        <Text className="mt-2 text-center text-base text-blue-green" numberOfLines={3}>
          Create a new wallet to get started with XRBG Gold Wallet
        </Text>
        <Button 
          mode="contained"
          buttonColor="#225D7C"
          onPress={handleCreateWallet}
          style={{ width: '100%', marginTop: 32 }}
          contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 12 }}
          icon={() => <MaterialIcons name="add-circle" size={20} color="white" />}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 18, color: '#FFFFFF' }}>
            Create Wallet
          </Text>
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-lapis-lazuli" edges={['top']}>
      <ScrollView 
        className="flex-1 mt-6"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || isLoading}
            onRefresh={onRefresh}
            tintColor="white"
            colors={['white']}
            progressBackgroundColor="transparent"
          />
        }
      >
        <View className="flex-1 rounded-t-3xl bg-white">
          {/* Total Balance */}
          <View className="px-6 pt-6 pb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-lapis-lazuli/80" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, minHeight: 26 }}>
                  Total Balance
                </Text>
                <Text className="text-lapis-lazuli font-bold" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 48, minHeight: 56 }}>
                  {formatCurrency(tokenData.totalValue)}
                </Text>
              </View>
              <TouchableOpacity 
                className="rounded-full p-3 ml-4"
                onPress={() => {
                  setShowReceiveModal(true);
                }}
              >
                <MaterialIcons name="qr-code-2" size={40} color="#7FAFA1" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Gold Info */}
          {predefinedToken ? (
            <View className="gap-3 rounded-xl bg-cambridge-blue/10 p-5 mx-6 mb-3">
              <View>
                <Text className="text-lapis-lazuli/80" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, minHeight: 26 }}>Gold Balance</Text>
                <Text className="font-semibold mt-1 text-lapis-lazuli" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                  {tokenData.balance} grams
                </Text>
              </View>
              
              <View>
                <Text className="text-lapis-lazuli/80" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, minHeight: 26 }}>Gold Price</Text>
                <Text className="font-semibold mt-1 text-lapis-lazuli" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                  {formatCurrency(tokenData.price)} per gram
                </Text>
              </View>
              
              {/* Price Chart */}
              <View className="mt-2">
                <PriceChart data={priceHistory} height={100} />
              </View>

              {lastUpdated && (
                <Text className="text-blue-green" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                  Last updated {formatLastUpdated(lastUpdated)}
                </Text>
              )}
              {error && (
                <Text className="text-red-600" numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                  Error: {error}
                </Text>
              )}
            </View>
          ) : (
            <View className="items-center justify-center py-8">
              <MaterialIcons name="account-balance-wallet" size={32} color={colors.grey} />
              <Text className="mt-2 text-center text-blue-green" numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                No gold configured
              </Text>
            </View>
          )}
          
          {/* Recent Activity */}
          <View className="gap-3 px-6 pb-6">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-lapis-lazuli/80 flex-1 mr-2" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, minHeight: 26 }}>
                Recent Activity
              </Text>
              <TouchableOpacity onPress={() => {
                router.push('/(tabs)/transactions' as any);
              }}>
                <Text className="text-blue-green font-medium" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                  View all
                </Text>
              </TouchableOpacity>
            </View>
            <View className="gap-2">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transfer, index) => {
                  const isReceive = transfer.to.toLowerCase() === currentWallet?.address?.toLowerCase();
                  const formattedValue = predefinedToken ? 
                    formatTokenBalance(transfer.rawValue, predefinedToken.decimals) : 
                    transfer.value.toString();
                  
                  return (
                    <TouchableOpacity 
                      key={`${transfer.hash}-${index}`}
                      className="flex-row items-center justify-between py-3 px-1"
                      onPress={() => {
                        console.log('Transaction pressed:', transfer.hash);
                      }}
                    >
                      <View className="flex-1 mr-2">
                        <Text className="font-medium text-lapis-lazuli" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                          {isReceive ? 'Received' : 'Sent'} Gold
                        </Text>
                        <Text className="text-lapis-lazuli/80" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 12 }}>
                          {formatTransactionDate(transfer.timestamp, transfer.blockNumber)}
                        </Text>
                      </View>
                      <View className="items-end flex-shrink-0">
                        <Text className="font-medium text-lapis-lazuli" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                          {isReceive ? '+' : '-'}{formattedValue} grams
                        </Text>
                        <Text className="text-lapis-lazuli/80" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 12 }}>
                          Block #{transfer.blockNumber}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="items-center justify-center py-8">
                  <Text className="text-center text-blue-green" numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                    No transactions yet
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Receive Modal */}
      <Modal
        visible={showReceiveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReceiveModal(false)}
      >
        <View className="flex-1 justify-end">
          <TouchableOpacity 
            className="flex-1 bg-black/50" 
            activeOpacity={1}
            onPress={() => setShowReceiveModal(false)}
          />
          <View className="bg-white" style={{ height: '85%' }}>
            <SafeAreaView className="flex-1" edges={['bottom']}>
              <View className="flex-row items-center justify-end p-4">
                <TouchableOpacity onPress={() => setShowReceiveModal(false)}>
                  <MaterialIcons name="close" size={28} color="#225D7C" />
                </TouchableOpacity>
              </View>
              
              <ScrollView className="flex-1" contentContainerClassName="p-6">
                <View className="gap-4">
                  {/* QR Code Section */}
                  <View className="items-center">
                    <Text className="font-semibold text-center text-lapis-lazuli/80 mb-3" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, minHeight: 26 }}>
                      Your Wallet Address
                    </Text>
                    <View className="bg-white p-4 rounded-xl overflow-hidden">
                      <QRCode
                        value={currentWallet?.address || ''}
                        size={200}
                        color="black"
                        backgroundColor="white"
                      />
                    </View>
                    <Text className="text-blue-green text-center mt-3" numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 15, lineHeight: 22 }}>
                      Scan this QR code to send cryptocurrencies to your wallet
                    </Text>
                  </View>

                  {/* Wallet Address */}
                  <View className="mt-4">
                    <Text className="font-semibold text-lapis-lazuli/80 mb-2" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, minHeight: 26 }}>
                      Wallet Address
                    </Text>
                    <Text className="font-mono text-lapis-lazuli" numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                      {currentWallet?.address}
                    </Text>
                    <Text className="text-blue-green mt-2" numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 15, lineHeight: 22 }}>
                      Share this address to receive cryptocurrencies
                    </Text>
                  </View>

                  {/* Action Button */}
                  <Button 
                    mode="contained"
                    buttonColor="#225D7C"
                    onPress={copyToClipboard}
                    style={{ width: '100%', marginTop: 8 }}
                    contentStyle={{ paddingVertical: 12 }}
                  >
                    <Text className="font-semibold" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 18, color: '#FFFFFF' }}>
                      Copy Address
                    </Text>
                  </Button>
                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
