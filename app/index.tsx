import { MaterialIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Platform, View, ScrollView, Image, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

import { Button } from 'react-native-paper';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useCurrentWallet, useIsWalletCreated, useGlobalStore } from '~/lib/stores/useGlobalStore';

const ROOT_STYLE: ViewStyle = { flex: 1 };

export default function WelcomeConsentScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useCurrentWallet();
  const isWalletCreated = useIsWalletCreated();
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  
  useEffect(() => {
    // Check wallet immediately since we no longer use hydration
    const timer = setTimeout(async () => {
      await checkWalletExists();
      setIsCheckingWallet(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [currentWallet, isWalletCreated]);

  const checkWalletExists = async () => {
    const hasWallet = !!(currentWallet && isWalletCreated);
    console.log('Wallet check result:', hasWallet);
    console.log('Current wallet:', currentWallet?.address);
    console.log('Is wallet created:', isWalletCreated);
    
    if (hasWallet && currentWallet?.address) {
      console.log('Redirecting to dashboard');
      // Use a small delay to ensure navigation is safe
      setTimeout(() => {
        router.replace('/(tabs)/dashboard');
      }, 50);
    }
  };
  
  const handleCreateWallet = () => {
    console.log('Create wallet button pressed');
    router.replace('/(auth)/create-wallet' as any);
  };
  
  const handleImportWallet = () => {
    router.replace('/(auth)/import-wallet' as any);
  };

  // Show loading state while checking wallet
  if (isCheckingWallet) {
    return (
      <SafeAreaView className="flex-1">
        <View className="flex-1 items-center justify-center">
          <MaterialIcons name="hourglass-empty" size={48} color="#225D7C" />
          <Text 
            className="mt-4 font-semibold text-lapis-lazuli"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontSize: 18 }}
          >
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Logo at the very top, full width */}
      <Image 
        source={require('~/assets/auralogo.png')}
        style={{ width: '100%', height: 300, resizeMode: 'cover' }}
      />
      
      {/* Content below the image */}
      <SafeAreaView className="flex-1" edges={['bottom', 'left', 'right']}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 px-8 py-8 justify-between">
            {/* Features */}
          <View className="gap-8">
            {FEATURES.map((feature) => (
              <View key={feature.title} className="flex-row gap-5">
                <View className="pt-1">
                  <MaterialIcons
                    name={feature.icon}
                    size={32}
                    color="#225D7C"
                  />
                </View>
                <View className="flex-1">
                  <Text 
                    className="text-lapis-lazuli mb-2"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{ fontSize: 20, minHeight: 26 }}
                  >
                    {feature.title}
                  </Text>
                  <Text 
                    className="text-blue-green"
                    numberOfLines={3}
                    adjustsFontSizeToFit
                    style={{ fontSize: 15, lineHeight: 21 }}
                  >
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Buttons at bottom */}
          <View className="gap-4">
            <Button 
              mode="contained"
              buttonColor="#225D7C"
              onPress={handleCreateWallet}
              style={{ width: '100%' }}
              contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 12 }}
            >
              <Text 
                className="font-semibold" 
                numberOfLines={1} 
                adjustsFontSizeToFit
                style={{ fontSize: 18, color: '#FFFFFF' }}
              >
                Create New Wallet
              </Text>
            </Button>
            <Button 
              mode="contained"
              buttonColor="#7FAFA1"
              onPress={handleImportWallet}
              style={{ width: '100%' }}
              contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 12 }}
            >
              <Text 
                className="font-semibold" 
                numberOfLines={1} 
                adjustsFontSizeToFit
                style={{ fontSize: 18, color: '#FFFFFF' }}
              >
                Import Existing Wallet
              </Text>
            </Button>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const FEATURES = [
  {
    title: 'Effortless Digital Assets',
    description: 'Experience the benefits of blockchain ownership without the gas fees or technical complexity — everything just works.',
    icon: 'cloud-sync',
  },
  {
    title: 'Asset Recovery',
    description: 'Recover lost access or compromised assets through our secure, backend-assisted recovery framework.',
    icon: 'recycling',
  },
  {
    title: 'Verified & Audited Assets',
    description: 'All assets are verified and undergo regular audits to ensure authenticity and transparency.',
    icon: 'verified',
  },
] as const;

