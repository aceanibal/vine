import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useCurrentWallet } from '~/lib/stores/useGlobalStore';

export default function ReceiveScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useCurrentWallet();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the source screen to determine where to go back
  const source = params.source as string;
  
  const handleBackNavigation = () => {
    if (source === 'transfer') {
      router.push('/(tabs)/transfer' as any);
    } else {
      // Default fallback
      router.back();
    }
  };

  useEffect(() => {
    setIsLoading(false);
  }, [currentWallet]);

  const copyToClipboard = async () => {
    if (currentWallet?.address) {
      try {
        await Clipboard.setStringAsync(currentWallet.address);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-lapis-lazuli" edges={['top']}>
        <View className="flex-1 rounded-t-3xl bg-white mt-6">
          <View className="flex-1 items-center justify-center">
            <Text className="text-lapis-lazuli">Loading wallet...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentWallet?.address) {
    return (
      <SafeAreaView className="flex-1 bg-lapis-lazuli" edges={['top']}>
        <View className="flex-1 rounded-t-3xl bg-white mt-6">
          <View className="flex-1 items-center justify-center p-4">
            <MaterialIcons name="account-balance-wallet" size={64} color="#7FAFA1" />
            <Text className="mt-4 text-center font-bold text-lapis-lazuli">
              No Wallet Found
            </Text>
            <Text className="mt-2 text-center text-blue-green">
              Create a wallet to receive cryptocurrencies
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-green" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        <View className="gap-4">
          {/* QR Code Section */}
          <View className="items-center">
            <Text className="font-semibold text-center text-lapis-lazuli mb-3">
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
            <Text className="text-xs text-lapis-lazuli text-center mt-3">
              Scan this QR code to send cryptocurrencies to your wallet
            </Text>
          </View>

          {/* Wallet Address */}
          <View className="mt-4">
            <Text className="font-semibold text-lapis-lazuli mb-2">
              Wallet Address
            </Text>
            <Text className="font-mono text-lapis-lazuli">
              {currentWallet?.address}
            </Text>
            <Text className="text-xs text-lapis-lazuli mt-2">
              Share this address to receive cryptocurrencies
            </Text>
          </View>

          {/* Action Button */}
          <Button 
            variant="primary"
            className="bg-lapis-lazuli mt-2"
            onPress={copyToClipboard}
          >
            <Text className="text-white font-semibold">Copy Address</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 