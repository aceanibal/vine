import { MaterialIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Platform, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { WalletStorage } from '~/lib/walletStorage';

const ROOT_STYLE: ViewStyle = { flex: 1 };

export default function WelcomeConsentScreen() {
  const { colors } = useColorScheme();
  
  useEffect(() => {
    // Check if wallet exists and redirect if it does
    checkWalletExists();
  }, []);

  const checkWalletExists = async () => {
    try {
      const hasWallet = await WalletStorage.hasWallet();
      if (hasWallet) {
        router.replace('/(tabs)/dashboard');
      }
    } catch (error) {
      console.error('Failed to check wallet existence:', error);
    }
  };
  
  const handleCreateWallet = () => {
    router.push('/(auth)/create-wallet' as any);
  };
  
  const handleImportWallet = () => {
    router.push('/(auth)/import-wallet' as any);
  };

  return (
    <SafeAreaView style={ROOT_STYLE}>
      <View className="mx-auto max-w-sm flex-1 justify-between gap-4 px-8 py-4 ">
        <View className="ios:pt-8 pt-12">
          <Text variant="largeTitle" className="ios:text-left ios:font-black text-center font-bold">
            Welcome to
          </Text>
          <Text
            variant="largeTitle"
            className="ios:text-left ios:font-black text-primary text-center font-bold">
            Vine Wallet
          </Text>
        </View>
        <View className="gap-8">
          {FEATURES.map((feature) => (
            <View key={feature.title} className="flex-row gap-4">
              <View className="pt-px">
                <MaterialIcons
                  name={feature.icon}
                  size={38}
                  color={colors.primary}
                />
              </View>
              <View className="flex-1">
                <Text className="font-bold">{feature.title}</Text>
                <Text variant="footnote">{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
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
          <View className="items-center">
            <MaterialIcons
              name="cloud-sync"
              size={24}
              color={colors.primary}
            />
            <Text variant="caption2" className="pt-1 text-center">
              Vine connects to secure backend services for easy crypto management and account recovery. By continuing, you agree to our{' '}
              <Link href="/">
                <Text variant="caption2" className="text-primary">
                  Terms of Service
                </Text>
              </Link>{' '}
              and{' '}
              <Link href="/">
                <Text variant="caption2" className="text-primary">
                  Privacy Policy
                </Text>
              </Link>
            </Text>
          </View>
        </View>
      </View>
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
