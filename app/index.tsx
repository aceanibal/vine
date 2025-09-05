import { MaterialIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Platform, View, ScrollView, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useCurrentWallet, useIsWalletCreated, useGlobalStore } from '~/lib/stores/useGlobalStore';
import { dataManager } from '~/lib/dataManager';

const ROOT_STYLE: ViewStyle = { flex: 1 };

export default function WelcomeConsentScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useCurrentWallet();
  const isWalletCreated = useIsWalletCreated();
  const _hasHydrated = useGlobalStore((state) => state._hasHydrated);
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  
  useEffect(() => {
    // Only check wallet after store is hydrated
    if (_hasHydrated) {
      const timer = setTimeout(async () => {
        await checkWalletExists();
        setIsCheckingWallet(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [_hasHydrated, currentWallet, isWalletCreated]);

  const checkWalletExists = async () => {
    const hasWallet = !!(currentWallet && isWalletCreated);
    console.log('Wallet check result:', hasWallet);
    console.log('Current wallet:', currentWallet?.address);
    console.log('Is wallet created:', isWalletCreated);
    
    if (hasWallet && currentWallet?.address) {
      console.log('Initializing wallet data...');
      try {
        await dataManager.initializeWalletData(currentWallet.address);
        console.log('Wallet data initialized successfully');
      } catch (error) {
        console.error('Failed to initialize wallet data:', error);
        // Continue to dashboard even if data manager fails
      }
      
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

  // Show loading state while checking wallet or until store is hydrated
  if (isCheckingWallet || !_hasHydrated) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <MaterialIcons name="hourglass-empty" size={48} color={colors.primary} />
          <Text className="mt-4 text-lg font-semibold">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <ScrollView 
        className="flex-1" 
        contentContainerClassName="px-8 py-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto max-w-sm gap-6">
          {/* Header */}
          <View className="ios:pt-8 pt-12">
            <Text className="ios:text-left ios:font-black text-center">
              Welcome to
            </Text>
            <Text
              className="ios:text-left ios:font-black text-primary text-center">
              Vine Wallet
            </Text>
          </View>

          {/* Features */}
          <View className="gap-6">
            {FEATURES.map((feature) => (
              <View key={feature.title} className="flex-row gap-4">
                <View className="pt-px">
                  <MaterialIcons
                    name={feature.icon}
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-bold">{feature.title}</Text>
                  <Text>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <View className="gap-4">
            <View className="gap-3">
              <Button 
                size={Platform.select({ ios: 'lg', default: 'md' })}
                onPress={handleCreateWallet}
              >
                <MaterialIcons name="add-circle" size={20} color="white" />
                <Text>Create New Vine Wallet</Text>
              </Button>
              <Button 
                variant="secondary"
                size={Platform.select({ ios: 'lg', default: 'md' })}
                onPress={handleImportWallet}
              >
                <MaterialIcons name="file-download" size={20} color={colors.primary} />
                <Text>Import Existing Wallet</Text>
              </Button>
            </View>
          </View>

          {/* Footer */}
          <View className="items-center gap-2">
            <MaterialIcons
              name="cloud-sync"
              size={20}
              color={colors.primary}
            />
            <Text className="text-xs text-center">
              Vine connects to secure backend services for easy crypto management and account recovery. By continuing, you agree to our{' '}
              <Link href="/">
                <Text className="text-xs text-primary">
                  Terms of Service
                </Text>
              </Link>{' '}
              and{' '}
              <Link href="/">
                <Text className="text-xs text-primary">
                  Privacy Policy
                </Text>
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const FEATURES = [
  {
    title: 'Backend-Powered Security',
    description: 'Your wallet connects to secure backend services for enhanced protection and easy recovery',
    icon: 'cloud-sync',
  },
  {
    title: 'Account Recovery',
    description: 'Never lose access to your funds with our advanced account recovery system',
    icon: 'restore',
  },
  {
    title: 'Simplified Crypto',
    description: 'Complex crypto operations made simple through our intelligent backend services',
    icon: 'auto-awesome',
  },
] as const;
