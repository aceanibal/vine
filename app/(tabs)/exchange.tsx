import { MaterialIcons } from '@expo/vector-icons';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { PREDEFINED_TOKENS } from '~/lib/tokens';
import { ProfileStorage } from '~/lib/profileStorage';

import { Toast } from '~/components/Toast';

export default function ExchangeScreen() {
  const { colors } = useColorScheme();

  const [showToast, setShowToast] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  // Calculate price pairs
  const goldToken = PREDEFINED_TOKENS.find(t => t.id === 'gold');
  const usdToken = PREDEFINED_TOKENS.find(t => t.id === 'usd');
  const gasToken = PREDEFINED_TOKENS.find(t => t.id === 'digital-gas');

  const pricePairs = [
    {
      id: 'gold-usd',
      name: 'Gold/USD',
      base: goldToken,
      quote: usdToken,
      price: goldToken?.price || 0,
      change24h: goldToken?.priceChange24h || 0,
      icon: 'monetization-on',
      color: '#FFD700'
    },
    {
      id: 'gold-gas',
      name: 'Gold/Gas',
      base: goldToken,
      quote: gasToken,
      price: goldToken && gasToken ? goldToken.price / gasToken.price : 0,
      change24h: 1.8, // Mock change for this pair
      icon: 'local-gas-station',
      color: '#FF9800'
    },
    {
      id: 'usd-gas',
      name: 'USD/Gas',
      base: usdToken,
      quote: gasToken,
      price: usdToken && gasToken ? usdToken.price / gasToken.price : 0,
      change24h: -0.5, // Mock change for this pair
      icon: 'attach-money',
      color: '#4CAF50'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleBuyGold = async () => {
    router.replace({
      pathname: '/(tabs)/buy',
      params: { source: 'exchange' }
    } as any);
  };

  const handleSellGold = async () => {
    router.replace({
      pathname: '/(tabs)/sell',
      params: { source: 'exchange' }
    } as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <View style={{ width: 24 }} />
        <Text className="text-lg font-bold">
          Exchange
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
        <View className="gap-6">

          {/* Quick Actions */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="text-lg font-semibold">
              Trade Gold
            </Text>
            <View className="gap-3">
              <TouchableOpacity 
                className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4"
                onPress={handleBuyGold}
              >
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-green-500 p-2">
                    <MaterialIcons name="add" size={20} color="white" />
                  </View>
                  <View>
                    <Text className="text-base font-semibold">
                      Buy Gold
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Purchase Gold with USD
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4"
                onPress={handleSellGold}
              >
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-red-500 p-2">
                    <MaterialIcons name="remove" size={20} color="white" />
                  </View>
                  <View>
                    <Text className="text-base font-semibold">
                      Sell Gold
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Convert Gold to USD
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>


            </View>
          </View>

          {/* Market Overview */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="text-lg font-semibold">
              Market Overview
            </Text>
            <View className="gap-3">
              {pricePairs.map((pair) => (
                <View key={pair.id} className="flex-row items-center justify-between rounded-lg bg-background p-3">
                  <View className="flex-row items-center gap-3">
                    <View 
                      className="rounded-full p-2" 
                      style={{ backgroundColor: pair.color + '20' }}
                    >
                      <MaterialIcons 
                        name={pair.icon as any} 
                        size={16} 
                        color={pair.color} 
                      />
                    </View>
                    <View>
                      <Text className="font-semibold">
                        {pair.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {pair.base?.name} / {pair.quote?.name}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="font-semibold">
                      {formatCurrency(pair.price)}
                    </Text>
                    <Text 
                      className={pair.change24h >= 0 ? 'text-green-500' : 'text-red-500'}
                    >
                      {pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
} 