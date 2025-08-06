import { MaterialIcons } from '@expo/vector-icons';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';

export default function TradeScreen() {
  const { colors } = useColorScheme();

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <View className="gap-6">
          {/* Header */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center gap-3">
              <View className="rounded-full bg-primary p-3">
                <MaterialIcons name="trending-up" size={24} color="white" />
              </View>
              <View>
                <Text variant="title2" className="font-bold">
                  Trade
                </Text>
                <Text variant="caption1" className="text-muted-foreground">
                  Buy and sell cryptocurrencies
                </Text>
              </View>
            </View>
          </View>

          {/* Coming Soon */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-center py-12">
              <MaterialIcons name="construction" size={48} color={colors.grey} />
            </View>
            <Text variant="title3" className="text-center font-semibold">
              Trading Coming Soon
            </Text>
            <Text variant="body" className="text-center text-muted-foreground">
              We're working on bringing you a seamless trading experience. Stay tuned for updates!
            </Text>
          </View>

          {/* Features Preview */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text variant="title3" className="font-semibold">
              Planned Features
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="swap-horiz" size={20} color={colors.primary} />
                <Text variant="body">Token Swapping</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="analytics" size={20} color={colors.primary} />
                <Text variant="body">Price Charts</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="notifications" size={20} color={colors.primary} />
                <Text variant="body">Price Alerts</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="history" size={20} color={colors.primary} />
                <Text variant="body">Trade History</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 