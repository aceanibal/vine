import { MaterialIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useState, useEffect } from 'react';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

import { Button } from 'react-native-paper';
import { Text } from '~/components/nativewindui/Text';
import { useCurrentWallet } from '~/lib/stores/useGlobalStore';
import { ScreenWithImageBackground } from '~/components/ScreenWithImageBackground';

export default function ReceiveScreen() {
  const currentWallet = useCurrentWallet();
  const [isLoading, setIsLoading] = useState(true);
  
  
  const walletAddress = currentWallet?.address;

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
      <ScreenWithImageBackground>
        <View className="flex-1 rounded-t-3xl bg-white">
          <View className="flex-1 items-center justify-center">
            <Text className="text-lapis-lazuli">Loading wallet...</Text>
          </View>
        </View>
      </ScreenWithImageBackground>
    );
  }

  if (!currentWallet?.address) {
    return (
      <ScreenWithImageBackground>
        <View className="flex-1 rounded-t-3xl bg-white">
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
      </ScreenWithImageBackground>
    );
  }

  return (
    <ScreenWithImageBackground>
      <View className="flex-1 p-6">
          <View className="gap-6">
            {/* QR Code Section */}
            <View className="items-center">
              <View className="bg-white px-4 pb-4 rounded-xl overflow-hidden">
                <QRCode
                  value={currentWallet?.address || ''}
                  size={200}
                  color="black"
                  backgroundColor="white"
                />
              </View>
              <Text className="text-blue-green text-center mt-3" numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 16, lineHeight: 22 }}>
                Show this QR code to share your wallet address
              </Text>
            </View>

            {/* Wallet Address */}
            <View className="items-center">
              <Text className="font-semibold text-center text-blue-green mb-2" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 18, minHeight: 26 }}>
                Wallet Address
              </Text>
              <Text 
                className="text-lapis-lazuli font-bold font-mono text-center" 
                style={{ fontSize: 20, lineHeight: 22 }}
                numberOfLines={2} 
                adjustsFontSizeToFit
              >
                {walletAddress ? (() => {
                  const prefix = walletAddress.slice(0, 2); // 0x
                  const rest = walletAddress.slice(2);
                  const chunks: string[] = [];
                  for (let i = 0; i < rest.length; i += 10) {
                    chunks.push(rest.slice(i, i + 10));
                  }
                  const firstRow = `${prefix} ${chunks[0] || ''}${chunks[1] ? ' ' + chunks[1] : ''}`;
                  const secondRow = `   ${chunks[2] || ''}${chunks[3] ? ' ' + chunks[3] : ''}`;
                  return `${firstRow}\n${secondRow}`.trim();
                })() : ''}
              </Text>
            </View>
          </View>
        </View>
      
      {/* Fixed Button at Bottom */}
      <View className="px-6 mb-12 bg-white">
        <Button 
          mode="contained"
          buttonColor="#225D7C"
          onPress={copyToClipboard}
          style={{ width: '100%' }}
          contentStyle={{ paddingVertical: 12 }}
        >
          <Text className="font-semibold" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 18, color: '#FFFFFF' }}>
            Copy Address
          </Text>
        </Button>
      </View>
    </ScreenWithImageBackground>
  );
} 