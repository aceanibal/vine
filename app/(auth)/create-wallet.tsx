// Import secure random source (BEFORE the shims)
import "react-native-get-random-values";

// Import the ethers shims (BEFORE importing ethers)
import "@ethersproject/shims";

import { MaterialIcons } from '@expo/vector-icons';
import { ethers } from 'ethers';
import { router } from 'expo-router';
import { Platform, View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { WalletStorage } from '~/lib/walletStorage';



export default function CreateWalletScreen() {
  const { colors } = useColorScheme();
  const [mnemonic, setMnemonic] = useState<string>('');
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  console.log('CreateWalletScreen rendered');

  useEffect(() => {
    console.log('CreateWalletScreen useEffect triggered');
    // Generate a new mnemonic when component mounts
    const newMnemonic = ethers.Wallet.createRandom().mnemonic?.phrase || '';
    setMnemonic(newMnemonic);
  }, []);

  const handleCreateWallet = async () => {
    if (!hasConfirmed) {
      Alert.alert(
        'Write Down Your Phrase',
        'Please make sure you have written down your 12-word recovery phrase before continuing.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'I\'ve Written It Down', onPress: () => setHasConfirmed(true) }
        ]
      );
      return;
    }

    setIsCreating(true);
    
    try {
      // Create wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      
      // Save wallet to secure storage
      await WalletStorage.saveWallet(wallet as any, mnemonic);
      
      Alert.alert(
        'Wallet Created Successfully!',
        `Your wallet has been created and securely stored.\n\nAddress: ${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)}`,
        [
          { 
            text: 'Continue', 
            onPress: () => router.replace('/(tabs)/dashboard' as any)
          }
        ]
      );
    } catch (error) {
      console.error('Failed to create wallet:', error);
      Alert.alert(
        'Error',
        'Failed to create wallet. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="mx-auto max-w-sm flex-1 px-8 py-4">
        {/* Header */}
        <View className="flex-row items-center justify-between pb-6">
          <Button
            variant="plain"
            size="icon"
            onPress={handleBack}
            className="h-10 w-10"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </Button>
          <Text className="font-bold">
            Create Wallet
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="gap-6">
            {/* Warning Section */}
            <View className="gap-3 rounded-xl bg-orange-50 p-4 dark:bg-orange-950/20">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="warning" size={20} color="#f97316" />
                <Text className="text-orange-600 dark:text-orange-400">
                  Write Down Your Recovery Phrase
                </Text>
              </View>
              <Text className="text-xs text-orange-700 dark:text-orange-300">
                This 12-word phrase is the only way to recover your wallet. Write it down and keep it safe. Never share it with anyone.
              </Text>
            </View>

            {/* Mnemonic Display */}
            <View className="gap-4">
              <Text className="text-center">
                Your Recovery Phrase
              </Text>
              
              <View className="gap-3 rounded-xl border border-border bg-card p-4">
                <View className="flex-row flex-wrap gap-2">
                  {mnemonic.split(' ').map((word, index) => (
                    <View
                      key={index}
                      className="flex-row items-center gap-1 rounded-lg bg-muted px-3 py-2"
                    >
                      <Text className="text-xs text-muted-foreground">
                        {index + 1}.
                      </Text>
                      <Text className="font-medium">
                        {word}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text className="text-xs text-center text-muted-foreground">
                Write down each word in order. You'll need this to recover your wallet.
              </Text>
            </View>

            {/* Confirmation Checkbox */}
            <View className="gap-3">
              <Button
                variant={hasConfirmed ? "primary" : "secondary"}
                size="md"
                onPress={() => setHasConfirmed(!hasConfirmed)}
                className="flex-row items-center justify-start gap-3"
              >
                <MaterialIcons
                  name={hasConfirmed ? "check-box" : "check-box-outline-blank"}
                  size={20}
                  color={hasConfirmed ? "white" : colors.primary}
                />
                <Text className="text-sm text-left">
                  I have written down my recovery phrase
                </Text>
              </Button>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View className="gap-4 pt-6">
          <Button
            size={Platform.select({ ios: 'lg', default: 'md' })}
            onPress={handleCreateWallet}
            disabled={!hasConfirmed || isCreating}
          >
            <MaterialIcons name="wallet" size={20} color="white" />
            <Text>{isCreating ? 'Creating Wallet...' : 'Create Wallet'}</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
} 