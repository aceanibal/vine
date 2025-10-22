import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Button } from 'react-native-paper';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore, useCurrentWallet } from '~/lib/stores/useGlobalStore';
import { approveAuthorizationWithTracking } from '~/lib/services/sponsored-orchestrator';

export default function AuthorizeScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useCurrentWallet();
  const [isLoading, setIsLoading] = useState(false);
  const checkWalletAuthorization = useGlobalStore((s) => s.checkWalletAuthorization);

  const handleAuthorize = async () => {
    if (!currentWallet?.address) return;
    setIsLoading(true);
    try {
      console.log('[Authorize] Starting authorization...');
      const res = await approveAuthorizationWithTracking(currentWallet.address);
      if (res.success) {
        console.log('[Authorize] Authorization successful, checking status...');
        // Use single source of truth to update authorization status
        await checkWalletAuthorization();
        if (useGlobalStore.getState().isWalletAuthorized) {
          console.log('[Authorize] Wallet authorized, redirecting back to amount screen');
          router.replace('/(tabs)/send');
          return;
        }
      }
    } catch (e) {
      console.error('[Authorize] Authorization failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-lapis-lazuli" edges={['top']}>
      <View className="flex-1 rounded-t-3xl bg-white mt-6">
        
        <ScrollView className="flex-1 px-6 mt-6">
          <View className="gap-6">
            {/* Header Section */}
            <View className="gap-3">
              <Text className="text-2xl font-bold text-lapis-lazuli">Wallet Authorization Required</Text>
              <Text className="text-base text-lapis-lazuli/80">
                To send transactions, your wallet must authorize our delegation contract. This one-time action lets us sponsor your gas fees.
              </Text>
            </View>

            {/* Authorization Details */}
            <View className="gap-4 rounded-xl bg-lapis-lazuli/5 p-6">
              <View className="gap-3">
                <Text className="text-lg font-semibold text-lapis-lazuli">What This Means</Text>
                <View className="gap-2">
                  <View className="flex-row items-start gap-3">
                    <View className="w-2 h-2 rounded-full bg-cambridge-blue mt-2 flex-shrink-0" />
                    <Text className="text-sm text-lapis-lazuli/80 flex-1">
                      We can sponsor your gas fees for transactions
                    </Text>
                  </View>
                  <View className="flex-row items-start gap-3">
                    <View className="w-2 h-2 rounded-full bg-cambridge-blue mt-2 flex-shrink-0" />
                    <Text className="text-sm text-lapis-lazuli/80 flex-1">
                      You maintain full control of your wallet and funds
                    </Text>
                  </View>
                  <View className="flex-row items-start gap-3">
                    <View className="w-2 h-2 rounded-full bg-cambridge-blue mt-2 flex-shrink-0" />
                    <Text className="text-sm text-lapis-lazuli/80 flex-1">
                      This is a one-time authorization that can be revoked anytime
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Legal Terms */}
            <View className="gap-4 rounded-xl bg-hunyadi-yellow/10 p-6">
              <Text className="text-lg font-semibold text-lapis-lazuli">Terms & Conditions</Text>
              <View className="gap-3">
                <Text className="text-sm text-lapis-lazuli/80 leading-5">
                  By approving this authorization, you agree to our Terms of Service and Privacy Policy. 
                  This authorization allows our smart contract to sponsor gas fees for your transactions 
                  while maintaining your full control over your wallet and funds.
                </Text>
                <Text className="text-sm text-lapis-lazuli/80 leading-5">
                  You understand that this is a delegation authorization that can be revoked at any time 
                  through your wallet settings. We do not have access to your private keys or the ability 
                  to move your funds without your explicit transaction approval.
                </Text>
                <Text className="text-sm text-lapis-lazuli/80 leading-5">
                  By proceeding, you confirm that you have read, understood, and agree to be bound by 
                  our Terms of Service, Privacy Policy, and this authorization agreement.
                </Text>
              </View>
            </View>

            {/* Security Notice */}
            <View className="gap-3 rounded-xl bg-cambridge-blue/10 p-6">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="security" size={20} color="#7FAFA1" />
                <Text className="text-base font-semibold text-lapis-lazuli">Security Notice</Text>
              </View>
              <Text className="text-sm text-lapis-lazuli/80 leading-5">
                This authorization is secure and follows industry best practices. Your private keys 
                remain in your control, and we cannot access your funds without your explicit approval 
                for each transaction.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Authorization Button - Fixed at bottom */}
        <View className="px-4 pb-4 bg-white">
          <Button 
            mode="contained"
            onPress={handleAuthorize} 
            disabled={isLoading}
            buttonColor="#225D7C"
            style={{
              backgroundColor: '#225D7C',
              paddingVertical: 8,
              opacity: isLoading ? 0.5 : 1
            }}
            labelStyle={{
              fontSize: 16,
              color: '#FFFFFF'
            }}
            theme={{
              colors: {
                primary: '#225D7C',
                onPrimary: '#FFFFFF',
                surface: '#225D7C',
                onSurface: '#FFFFFF'
              }
            }}
          >
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="hourglass-empty" size={20} color="white" />
                <Text className="text-white">Authorizing...</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="verified" size={20} color="white" />
                <Text className="text-white">Approve Authorization</Text>
              </View>
            )}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}


