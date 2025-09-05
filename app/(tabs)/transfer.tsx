import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';

export default function TransferScreen() {
  const { colors } = useColorScheme();

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

          {/* Transfer Actions */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="text-lg font-semibold">
              Transfer Options
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
                      Transfer tokens to another wallet
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
                      Show QR code to receive tokens
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 