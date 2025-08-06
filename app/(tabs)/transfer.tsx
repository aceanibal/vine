import { MaterialIcons } from '@expo/vector-icons';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';

export default function TransferScreen() {
  const { colors } = useColorScheme();

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <View className="gap-6">
          {/* Header */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center gap-3">
              <View className="rounded-full bg-primary p-3">
                <MaterialIcons name="send" size={24} color="white" />
              </View>
              <View>
                <Text variant="title2" className="font-bold">
                  Transfer
                </Text>
                <Text variant="caption1" className="text-muted-foreground">
                  Send and receive cryptocurrencies
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
                    <MaterialIcons name="send" size={20} color="white" />
                  </View>
                  <View>
                    <Text variant="body" className="font-semibold">
                      Send
                    </Text>
                    <Text variant="caption1" className="text-muted-foreground">
                      Transfer crypto to another wallet
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-blue-500 p-2">
                    <MaterialIcons name="qr-code" size={20} color="white" />
                  </View>
                  <View>
                    <Text variant="body" className="font-semibold">
                      Receive
                    </Text>
                    <Text variant="caption1" className="text-muted-foreground">
                      Show QR code to receive crypto
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-purple-500 p-2">
                    <MaterialIcons name="contacts" size={20} color="white" />
                  </View>
                  <View>
                    <Text variant="body" className="font-semibold">
                      Contacts
                    </Text>
                    <Text variant="caption1" className="text-muted-foreground">
                      Manage saved addresses
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Transactions */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text variant="title3" className="font-semibold">
              Recent Transactions
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center justify-between rounded-lg bg-background p-3">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-red-100 p-2">
                    <MaterialIcons name="send" size={16} color="#ef4444" />
                  </View>
                  <View>
                    <Text variant="body" className="font-semibold">
                      Sent BTC
                    </Text>
                    <Text variant="caption1" className="text-muted-foreground">
                      To: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text variant="body" className="font-semibold text-red-500">
                    -0.001 BTC
                  </Text>
                  <Text variant="caption1" className="text-muted-foreground">
                    2 hours ago
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between rounded-lg bg-background p-3">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-green-100 p-2">
                    <MaterialIcons name="qr-code" size={16} color="#22c55e" />
                  </View>
                  <View>
                    <Text variant="body" className="font-semibold">
                      Received ETH
                    </Text>
                    <Text variant="caption1" className="text-muted-foreground">
                      From: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text variant="body" className="font-semibold text-green-500">
                    +0.05 ETH
                  </Text>
                  <Text variant="caption1" className="text-muted-foreground">
                    1 day ago
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between rounded-lg bg-background p-3">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-red-100 p-2">
                    <MaterialIcons name="send" size={16} color="#ef4444" />
                  </View>
                  <View>
                    <Text variant="body" className="font-semibold">
                      Sent SOL
                    </Text>
                    <Text variant="caption1" className="text-muted-foreground">
                      To: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text variant="body" className="font-semibold text-red-500">
                    -2.5 SOL
                  </Text>
                  <Text variant="caption1" className="text-muted-foreground">
                    3 days ago
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text variant="title3" className="font-semibold">
              This Month
            </Text>
            <View className="flex-row gap-4">
              <View className="flex-1 rounded-lg bg-background p-4">
                <Text variant="caption1" className="text-muted-foreground">
                  Sent
                </Text>
                <Text variant="title2" className="font-bold text-red-500">
                  $1,250.00
                </Text>
              </View>
              <View className="flex-1 rounded-lg bg-background p-4">
                <Text variant="caption1" className="text-muted-foreground">
                  Received
                </Text>
                <Text variant="title2" className="font-bold text-green-500">
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