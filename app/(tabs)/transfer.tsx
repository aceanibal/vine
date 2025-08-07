import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { MOCK_TRANSACTIONS, getTransactionIcon, getTransactionColor, getTransactionTitle, formatTimeAgo } from '~/lib/transactions';
import { getTokenById } from '~/lib/tokens';

export default function TransferScreen() {
  const { colors } = useColorScheme();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <View className="w-6" />
        <Text className="text-lg font-bold">
          Transfer
        </Text>
        <View className="w-6" />
      </View>
      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
        <View className="gap-6">

          {/* Quick Actions */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="text-lg font-semibold">
              Actions
            </Text>
            <View className="gap-3">
              <TouchableOpacity 
                className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4"
                onPress={() => {
                  console.log('Send button pressed!');
                  router.push({
                    pathname: '/(tabs)/send',
                    params: { source: 'transfer' }
                  } as any);
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-green-500 p-2">
                    <MaterialIcons name="send" size={20} color="white" />
                  </View>
                  <View>
                                    <Text className="text-base font-semibold">
                  Send
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Transfer tokens
                </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4"
                onPress={() => {
                  console.log('Receive button pressed!');
                  router.push({
                    pathname: '/(tabs)/receive',
                    params: { source: 'transfer' }
                  } as any);
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-blue-500 p-2">
                    <MaterialIcons name="qr-code" size={20} color="white" />
                  </View>
                  <View>
                    <Text className="text-base font-semibold">
                      Receive
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Show QR code
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>


            </View>
          </View>

          {/* Recent Activity */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
                          <Text className="font-semibold">
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

          {/* Quick Stats */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              This Month
            </Text>
            <View className="flex-row gap-4">
              <View className="flex-1 rounded-lg bg-background p-4">
                <Text className="text-xs text-muted-foreground">
                  Sent
                </Text>
                <Text className="font-bold text-red-500">
                  $1,250.00
                </Text>
              </View>
              <View className="flex-1 rounded-lg bg-background p-4">
                <Text className="text-xs text-muted-foreground">
                  Received
                </Text>
                <Text className="font-bold text-green-500">
                  $3,420.00
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 