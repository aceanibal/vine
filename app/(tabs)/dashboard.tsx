import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity, RefreshControl, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { Button } from 'react-native-paper';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore, useCurrentWallet, usePredefinedToken, usePriceHistory } from '~/lib/stores/useGlobalStore';
import { PriceChart } from '~/components/PriceChart';
import ReceiveScreen from './receive';

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
  
  // Handle both Date objects and ISO strings (from persistence)
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const diffInSeconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return dateObj.toLocaleDateString();
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
  const refreshPriceHistory = useGlobalStore((state) => state.refreshPriceHistory);
  const isLoading = useGlobalStore((state) => state.appState.isLoading);
  const error = useGlobalStore((state) => state.appState.error);
  const lastUpdated = useGlobalStore((state) => state.appState.lastUpdated);
  const allTransfers = useGlobalStore((state) => state.allTransfers);
  const priceHistory = usePriceHistory();
  const imageUrl = predefinedToken?.logo;
  // Get recent transactions
  const recentTransactions = useMemo(() => {
    return allTransfers
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, 5);
  }, [allTransfers]);
  
  // Calculate token data
  const tokenData = useMemo(() => {
    if (!predefinedToken) {
      return { balance: '0', price: null, totalValue: 0 };
    }
    
    const rawBalance = tokenBalance?.balance?.tokenBalanceDecimal || tokenBalance?.balance?.tokenBalance || '0';
    const price = predefinedToken.price; // This will be null if not updated from API
    
    let numericBalance = 0;
    try {
      const rawBig = BigInt(rawBalance);
      numericBalance = Number(rawBig) / Math.pow(10, predefinedToken.decimals);
    } catch {
      numericBalance = 0;
    }
    
    const balance = formatTokenBalance(rawBalance, predefinedToken.decimals);
    const totalValue = price ? numericBalance * price : 0;
    
    return {
      balance,
      price,
      totalValue: Number.isFinite(totalValue) ? totalValue : 0
    };
  }, [predefinedToken, tokenBalance]);
  
  // Set wallet address when component mounts and fetch transaction data
  useEffect(() => {
    if (currentWallet?.address) {
      setWalletAddress(currentWallet.address);
      setIsPageLoading(false);
      
      // Fetch transaction data when wallet is available
      fetchTransactionData().catch((error) => {
        console.error('Failed to fetch transaction data on mount:', error);
      });
      
      // Refresh price history when wallet is available
      refreshPriceHistory().catch((error) => {
        console.error('Failed to refresh price history on mount:', error);
      });
    } else {
      setIsPageLoading(false);
    }
  }, [currentWallet, fetchTransactionData, refreshPriceHistory]);

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
        refreshGoldPrice(),
        refreshPriceHistory()
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
                  {tokenData.price ? formatCurrency(tokenData.totalValue) : '---'}
                </Text>
              </View>
              <TouchableOpacity 
                className="rounded-full p-2 ml-4"
                onPress={() => {
                  setShowReceiveModal(true);
                }}
              >
                <MaterialIcons name="qr-code-2" size={30} color="#225D7C" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Gold Info */}
          {predefinedToken ? (
            <View className="gap-1 rounded-xl bg-lapis-lazuli/5 p-2 mx-5 mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lapis-lazuli/80" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, minHeight: 26 }}>{predefinedToken?.name} Balance</Text>
                  <Text className="font-semibold mt-1 text-lapis-lazuli" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                    {tokenData.balance} grams
                  </Text>
                </View>
                <Image 
                  source={{uri: imageUrl}} 
                  style={{ width: 40, height: 40, opacity: 0.6 }} 
                  resizeMode="contain"
                  onError={() => {
                    console.warn('Failed to load token logo:', imageUrl);
                  }}
                />
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lapis-lazuli/80" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, minHeight: 26 }}>{predefinedToken?.symbol} Price</Text>
                  <Text className="font-semibold mt-1 text-lapis-lazuli" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                    {tokenData.price ? formatCurrency(tokenData.price) : '---'} per gram
                  </Text>
                </View>
              </View>
              
              {/* Price Chart */}
              <View className="mt-2">
                <PriceChart data={priceHistory} currentPrice={tokenData.price} height={125} />
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
                          {isReceive ? 'Received' : 'Sent'} {predefinedToken?.symbol}
                        </Text>
                        <Text className="text-lapis-lazuli/80" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 12 }}>
                          {formatTransactionDate(transfer.timestamp, transfer.blockNumber)}
                        </Text>
                      </View>
                      <View className="items-end flex-shrink-0">
                        <Text className={`font-medium ${isReceive ? 'text-cambridge-blue' : 'text-boston-red'}`} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15 }}>
                          {isReceive ? '+' : '-'}{formattedValue} g
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
            <View className="flex-row items-center justify-end p-4">
              <TouchableOpacity onPress={() => setShowReceiveModal(false)}>
                <MaterialIcons name="close" size={28} color="#225D7C" />
              </TouchableOpacity>
            </View>
            <ReceiveScreen />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
