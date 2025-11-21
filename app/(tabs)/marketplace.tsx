import { MaterialIcons } from '@expo/vector-icons';
import { View, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { WebView } from 'react-native-webview';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { usePredefinedToken } from '~/lib/stores/useGlobalStore';
import { ScreenWithImageBackground } from '~/components/ScreenWithImageBackground';

export default function MarketplaceScreen() {
  const { colors } = useColorScheme();
  const predefinedToken = usePredefinedToken();
  const tokenName = predefinedToken?.name || 'Token';
  const [showWebView, setShowWebView] = useState(false);

  const handleRedeemToken = () => {
    // TODO: Implement redeem token functionality
    console.log('Redeem', tokenName);
  };

  const handleAcquireToken = () => {
    setShowWebView(true);
  };

  if (showWebView) {
    return (
      <ScreenWithImageBackground showScrollView={false}>
        <View className="flex-1 rounded-t-3xl bg-white mt-3 overflow-hidden">
          <View className="flex-row items-center justify-between p-4">
            <TouchableOpacity
              onPress={() => setShowWebView(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#225D7C" />
            </TouchableOpacity>
            <Text className="text-lapis-lazuli font-semibold">Acquire {tokenName}</Text>
            <View className="w-6" />
          </View>
          <WebView
            source={{ uri: 'https://google.com' }}
            style={{ flex: 1 }}
            startInLoadingState={true}
          />
        </View>
      </ScreenWithImageBackground>
    );
  }

  return (
    <ScreenWithImageBackground>
      <View className="flex-1 rounded-t-3xl bg-white p-6">
          <View className="gap-6">
            <View className="items-center gap-2 mb-4">
              <Text className="text-2xl font-bold text-lapis-lazuli" numberOfLines={1} adjustsFontSizeToFit>
                Exchange
              </Text>
              <Text className="text-base text-lapis-lazuli/80 text-center" numberOfLines={2}>
                Acquire or redeem {tokenName}
              </Text>
            </View>

            {/* Acquire Token */}
            <TouchableOpacity
              onPress={handleAcquireToken}
              className="rounded-xl bg-hunyadi-yellow/10 p-6"
              activeOpacity={0.7}
            >
              <View className="items-center gap-4">
                <View className="rounded-full bg-hunyadi-yellow/20 p-4">
                  <MaterialIcons name="shopping-cart" size={48} color="#D9A848" />
                </View>
                <View className="items-center gap-2">
                  <Text
                    className="text-lapis-lazuli font-bold text-center"
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    style={{ fontSize: 20 }}
                  >
                    Acquire {tokenName}
                  </Text>
                  <Text
                    className="text-lapis-lazuli/80 text-center"
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    style={{ fontSize: 14 }}
                  >
                    Get {tokenName}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Redeem Token */}
            <TouchableOpacity
              onPress={handleRedeemToken}
              className="rounded-xl bg-cambridge-blue/10 p-6"
              activeOpacity={0.7}
            >
              <View className="items-center gap-4">
                <View className="rounded-full bg-cambridge-blue/20 p-4">
                  <MaterialIcons name="account-balance-wallet" size={48} color="#7FAFA1" />
                </View>
                <View className="items-center gap-2">
                  <Text
                    className="text-lapis-lazuli font-bold text-center"
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    style={{ fontSize: 20 }}
                  >
                    Redeem {tokenName}
                  </Text>
                  <Text
                    className="text-lapis-lazuli/80 text-center"
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    style={{ fontSize: 14 }}
                  >
                    Exchange your {tokenName}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
    </ScreenWithImageBackground>
  );
}

