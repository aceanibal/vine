import { MaterialIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Platform, View, ScrollView, type ViewStyle } from 'react-native';
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
      console.log('Wallet check result:', hasWallet);
      if (hasWallet) {
        console.log('Redirecting to dashboard');
        router.replace('/(tabs)/dashboard');
      }
    } catch (error) {
      console.error('Failed to check wallet existence:', error);
    }
  };
  
  const handleCreateWallet = () => {
    console.log('Create wallet button pressed');
    router.replace('/(auth)/create-wallet' as any);
  };
  
  const handleImportWallet = () => {
    router.replace('/(auth)/import-wallet' as any);
  };

  return (
    <SafeAreaView style={ROOT_STYLE}>
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
