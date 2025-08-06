import { MaterialIcons } from '@expo/vector-icons';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';

export default function ExchangeScreen() {
  const { colors } = useColorScheme();

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <View className="gap-6">
          {/* Header */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center gap-3">
              <View className="rounded-full bg-primary p-3">
                <MaterialIcons name="currency-exchange" size={24} color="white" />
              </View>
              <View>
                <Text variant="title2" className="font-bold">
                  Exchange
                </Text>
                <Text variant="caption1" className="text-muted-foreground">
                  Buy and sell cryptocurrencies
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text variant="title3" className="font-semibold">
              Quick Actions
            </Text>
            <View className="gap-3">
              <TouchableOpacity className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-green-500 p-2">
                    <MaterialIcons name="add" size={20} color="white" />
                  </View>
                  <View>
                    <Text variant="body" className="font-semibold">
                      Buy Crypto
                    </Text>
                    <Text variant="caption1" className="text-muted-foreground">
                      Purchase with fiat currency
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-red-500 p-2">
                    <MaterialIcons name="remove" size={20} color="white" />
                  </View>
                  <View>
                    <Text variant="body" className="font-semibold">
                      Sell Crypto
                    </Text>
                    <Text variant="caption1" className="text-muted-foreground">
                      Convert to fiat currency
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-blue-500 p-2">
                    <MaterialIcons name="swap-horiz" size={20} color="white" />
                  </View>
                  <View>
                    <Text variant="body" className="font-semibold">
                      Swap Tokens
                    </Text>
                    <Text variant="caption1" className="text-muted-foreground">
                      Exchange between cryptocurrencies
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Market Overview */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text variant="title3" className="font-semibold">
              Market Overview
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center justify-between rounded-lg bg-background p-3">
                <View className="flex-row items-center gap-3">
                  <Text variant="body" className="font-semibold">
                    BTC
                  </Text>
                  <Text variant="caption1" className="text-muted-foreground">
                    Bitcoin
                  </Text>
                </View>
                <View className="items-end">
                  <Text variant="body" className="font-semibold">
                    $43,250.00
                  </Text>
                  <Text variant="caption1" className="text-green-500">
                    +2.45%
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between rounded-lg bg-background p-3">
                <View className="flex-row items-center gap-3">
                  <Text variant="body" className="font-semibold">
                    ETH
                  </Text>
                  <Text variant="caption1" className="text-muted-foreground">
                    Ethereum
                  </Text>
                </View>
                <View className="items-end">
                  <Text variant="body" className="font-semibold">
                    $2,680.50
                  </Text>
                  <Text variant="caption1" className="text-green-500">
                    +1.23%
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between rounded-lg bg-background p-3">
                <View className="flex-row items-center gap-3">
                  <Text variant="body" className="font-semibold">
                    SOL
                  </Text>
                  <Text variant="caption1" className="text-muted-foreground">
                    Solana
                  </Text>
                </View>
                <View className="items-end">
                  <Text variant="body" className="font-semibold">
                    $98.75
                  </Text>
                  <Text variant="caption1" className="text-red-500">
                    -0.87%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 