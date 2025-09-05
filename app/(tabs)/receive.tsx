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
import { useCurrentWallet, useAllTokens } from '~/lib/stores/useGlobalStore';

export default function ReceiveScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useCurrentWallet();
  const tokens = useAllTokens();
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
        Alert.alert('Success', 'Address copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        Alert.alert('Error', 'Failed to copy address to clipboard. Please try again.');
      }
    }
  };

  const shareAddress = async () => {
    if (currentWallet?.address) {
      try {
        // Copy to clipboard as a sharing mechanism for now
        await Clipboard.setStringAsync(currentWallet.address);
        Alert.alert('Ready to Share', 'Address copied to clipboard. You can now paste it in any messaging app to share.');
      } catch (error) {
        console.error('Failed to prepare address for sharing:', error);
        Alert.alert('Error', 'Failed to prepare address for sharing. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
          <TouchableOpacity onPress={handleBackNavigation}>
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text className="font-bold">
            Receive
          </Text>
          <View className="w-6" />
        </View>
        <View className="flex-1 bg-gray-50 items-center justify-center">
          <Text>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentWallet?.address) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
          <TouchableOpacity onPress={handleBackNavigation}>
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text className="font-bold">
            Receive
          </Text>
          <View className="w-6" />
        </View>
        <View className="flex-1 bg-gray-50 items-center justify-center p-4">
          <MaterialIcons name="account-balance-wallet" size={64} color={colors.grey} />
          <Text className="mt-4 text-center font-bold">
            No Wallet Found
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            Create a wallet to receive cryptocurrencies
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <TouchableOpacity onPress={handleBackNavigation}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="font-bold">
          Receive
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
        <View className="gap-6">
          {/* QR Code Section */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold text-center">
              Your Wallet Address
            </Text>
            <View className="items-center gap-4">
              <View className="bg-white p-4 rounded-lg">
                <QRCode
                  value={currentWallet?.address || ''}
                  size={200}
                  color="black"
                  backgroundColor="white"
                />
              </View>
              <Text className="text-xs text-muted-foreground text-center">
                Scan this QR code to send cryptocurrencies to your wallet
              </Text>
            </View>
          </View>

          {/* Wallet Address */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Wallet Address
            </Text>
            <View className="gap-3">
              <View className="p-3 border border-border rounded-lg bg-background">
                <Text className="font-mono text-center">
                  {currentWallet?.address}
                </Text>
              </View>
              <Text className="text-xs text-muted-foreground text-center">
                Share this address to receive cryptocurrencies
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <Button 
              variant="secondary"
              className="flex-row items-center justify-center gap-3"
              onPress={copyToClipboard}
            >
              <MaterialIcons name="content-copy" size={20} color={colors.primary} />
              <Text>Copy Address</Text>
            </Button>
            
            <Button 
              variant="secondary"
              className="flex-row items-center justify-center gap-3"
              onPress={shareAddress}
            >
              <MaterialIcons name="share" size={20} color={colors.primary} />
              <Text>Share Address</Text>
            </Button>
          </View>

          {/* Supported Tokens */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Supported Tokens (Polygon)
            </Text>
            <View className="gap-3">
              {tokens.map((token) => (
                <View key={`${token.address}-${token.chainId}`} className="flex-row items-center gap-3">
                  <View 
                    className="rounded-full p-2" 
                    style={{ backgroundColor: (token.color || '#666') + '20' }}
                  >
                    <MaterialIcons 
                      name="account-balance-wallet" 
                      size={16} 
                      color={token.color || '#666'} 
                    />
                  </View>
                  <Text>{token.name} ({token.symbol})</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Security Tips */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Security Tips
            </Text>
            <View className="gap-3">
              <View className="flex-row items-start gap-3">
                <MaterialIcons name="security" size={16} color={colors.primary} className="mt-0.5" />
                <Text className="flex-1">
                  Only share this address with trusted sources
                </Text>
              </View>
              <View className="flex-row items-start gap-3">
                <MaterialIcons name="verified" size={16} color={colors.primary} className="mt-0.5" />
                <Text className="flex-1">
                  Verify the address before sending large amounts
                </Text>
              </View>
              <View className="flex-row items-start gap-3">
                <MaterialIcons name="backup" size={16} color={colors.primary} className="mt-0.5" />
                <Text className="flex-1">
                  Keep your recovery phrase safe and secure
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 