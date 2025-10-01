import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore, useCurrentWallet } from '~/lib/stores/useGlobalStore';
import { approveAuthorizationWithTracking, checkDelegationStatus } from '~/lib/services/sponsored-orchestrator';

export default function AuthorizeScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useCurrentWallet();
  const [isLoading, setIsLoading] = useState(false);
  const setAuthorizationSnapshot = useGlobalStore((s) => s.setAuthorizationSnapshot);

  const handleAuthorize = async () => {
    if (!currentWallet?.address) return;
    setIsLoading(true);
    try {
      const res = await approveAuthorizationWithTracking(currentWallet.address);
      if (res.success) {
        const status = await checkDelegationStatus(currentWallet.address);
        setAuthorizationSnapshot(status as any);
        if (useGlobalStore.getState().isWalletAuthorized) {
          router.replace('/(tabs)/send');
          return;
        }
      }
    } catch (_e) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <Button variant="secondary" onPress={handleBack} className="px-0">
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Button>
        <Text className="text-lg font-bold">Authorization Required</Text>
        <View className="w-6" />
      </View>
      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-6">
        <View className="gap-4 rounded-xl border border-border bg-card p-6">
          <Text className="font-semibold">Your wallet is not authorized</Text>
          <Text className="text-sm text-muted-foreground">
            To send transactions, your wallet must authorize our delegation contract. This one-time action lets us sponsor your gas fees.
          </Text>
          <Button onPress={handleAuthorize} disabled={isLoading} className="mt-2">
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="hourglass-empty" size={20} color="white" />
                <Text>Authorizing...</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="verified" size={20} color="white" />
                <Text>Approve Authorization</Text>
              </View>
            )}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


