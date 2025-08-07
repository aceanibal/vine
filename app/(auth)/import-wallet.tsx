// Import secure random source (BEFORE the shims)
import "react-native-get-random-values";

// Import the ethers shims (BEFORE importing ethers)
import "@ethersproject/shims";

import { MaterialIcons } from '@expo/vector-icons';
import { ethers } from 'ethers';
import { router } from 'expo-router';
import { Platform, View, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { WalletStorage } from '~/lib/walletStorage';



export default function ImportWalletScreen() {
  const { colors } = useColorScheme();
  const [mnemonic, setMnemonic] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [isValidMnemonic, setIsValidMnemonic] = useState(false);

  const validateMnemonic = (phrase: string) => {
    try {
      // Check if it's a valid mnemonic
      const wallet = ethers.Wallet.fromPhrase(phrase.trim());
      return wallet && wallet.address;
    } catch (error) {
      return false;
    }
  };

  const handleMnemonicChange = (text: string) => {
    setMnemonic(text);
    const isValid = validateMnemonic(text);
    // Ensure we pass a boolean value to setIsValidMnemonic
    setIsValidMnemonic(Boolean(isValid));
  };

  const handleImportWallet = async () => {
    if (!isValidMnemonic) {
      Alert.alert(
        'Invalid Recovery Phrase',
        'Please enter a valid 12-word recovery phrase.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsImporting(true);
    
    try {
      // Create wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
      
      // Save wallet to secure storage
      await WalletStorage.saveWallet(wallet as any, mnemonic.trim());
      
      Alert.alert(
        'Wallet Imported Successfully!',
        `Your wallet has been imported and securely stored.\n\nAddress: ${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)}`,
        [
          { 
            text: 'Continue', 
            onPress: () => router.replace('/(tabs)/dashboard' as any)
          }
        ]
      );
    } catch (error) {
      console.error('Failed to import wallet:', error);
      Alert.alert(
        'Error',
        'Failed to import wallet. Please check your recovery phrase and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleBack = () => {
    router.replace('/');
  };

  const wordCount = mnemonic.trim().split(/\s+/).filter(word => word.length > 0).length;

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
            Import Wallet
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="gap-6">
            {/* Instructions */}
            <View className="gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/20">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="info" size={20} color="#3b82f6" />
                <Text className="text-blue-600 dark:text-blue-400">
                  Enter Your Recovery Phrase
                </Text>
              </View>
              <Text className="text-xs text-blue-700 dark:text-blue-300">
                Enter your 12-word recovery phrase to import your existing wallet. Make sure you're in a private space and no one can see your screen.
              </Text>
            </View>

            {/* Mnemonic Input */}
            <View className="gap-4">
              <Text className="text-center">
                Recovery Phrase
              </Text>
              
              <View className="gap-3">
                <TextInput
                  className="min-h-[120] rounded-xl border border-border bg-card p-4 text-body"
                  placeholder="Enter your 12-word recovery phrase..."
                  placeholderTextColor={colors.grey2}
                  value={mnemonic}
                  onChangeText={handleMnemonicChange}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={false}
                />
                
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">
                    {wordCount}/12 words
                  </Text>
                  {mnemonic.length > 0 && (
                    <View className="flex-row items-center gap-1">
                      <MaterialIcons 
                        name={isValidMnemonic ? "check-circle" : "error"} 
                        size={16} 
                        color={isValidMnemonic ? colors.primary : colors.destructive} 
                      />
                      <Text 
                        className={isValidMnemonic ? "text-xs text-primary" : "text-xs text-destructive"}
                      >
                        {isValidMnemonic ? "Valid phrase" : "Invalid phrase"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Text className="text-xs text-center text-muted-foreground">
                Enter each word separated by spaces. The phrase is case-insensitive.
              </Text>
            </View>

            {/* Security Warning */}
            <View className="gap-3 rounded-xl bg-orange-50 p-4 dark:bg-orange-950/20">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="security" size={20} color="#f97316" />
                <Text className="text-orange-600 dark:text-orange-400">
                  Security Reminder
                </Text>
              </View>
              <Text className="text-xs text-orange-700 dark:text-orange-300">
                Never share your recovery phrase with anyone. Vine staff will never ask for your recovery phrase. Your phrase will be stored securely on your device.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View className="gap-4 pt-6">
          <Button
            size={Platform.select({ ios: 'lg', default: 'md' })}
            onPress={handleImportWallet}
            disabled={!isValidMnemonic || isImporting}
          >
            <MaterialIcons name="file-download" size={20} color="white" />
            <Text>{isImporting ? 'Importing Wallet...' : 'Import Wallet'}</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
} 