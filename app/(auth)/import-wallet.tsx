// Import secure random source (BEFORE the shims)
import "react-native-get-random-values";

// Import the ethers shims (BEFORE importing ethers)
import "@ethersproject/shims";

import { MaterialIcons } from '@expo/vector-icons';
import { ethers } from 'ethers';
import { router } from 'expo-router';
import { Platform, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore } from '~/lib/stores/useGlobalStore';
import { CustomModal } from '~/components/CustomModal';
import { MnemonicInputGrid } from '~/components/MnemonicInputGrid';

const ROOT_STYLE = { flex: 1 };

export default function ImportWalletScreen() {
  const { colors } = useColorScheme();
  const [mnemonic, setMnemonic] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [isValidMnemonic, setIsValidMnemonic] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    primaryAction?: { label: string; action: () => void };
    secondaryAction?: { label: string; action: () => void };
  } | null>(null);
  
  // Get wallet store actions
  const addWallet = useGlobalStore((state) => state.addWallet);

  const [words, setWords] = useState<string[]>(Array(12).fill(''));

  const validateMnemonic = (phrase: string) => {
    try {
      // Check if it's a valid mnemonic
      const wallet = ethers.Wallet.fromPhrase(phrase.trim());
      return wallet && wallet.address;
    } catch (error) {
      return false;
    }
  };

  // Unused now; kept for reference if we re-add textarea input in future
  const handleMnemonicChange = (_text: string) => {};

  const handleImportWallet = async () => {
    if (!isValidMnemonic) {
      setModalConfig({
        title: 'Invalid Recovery Phrase',
        message: 'Please enter a valid 12-word recovery phrase.',
        severity: 'high',
        primaryAction: {
          label: 'OK',
          action: () => setModalConfig(null)
        }
      });
      return;
    }

    setIsImporting(true);
    
    try {
      // Create wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
      
      // Save wallet to Zustand store
      const walletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: mnemonic.trim(),
        isImported: true,
        createdAt: new Date(),
      };
      
      addWallet(walletData);
      console.log('Imported wallet saved to Zustand store:', wallet.address);
      
      // XRBG branch: No external data initialization
      
      // Format address for display
      const formattedAddress = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
      setModalConfig({
        title: 'Wallet Imported Successfully!',
        message: `Your wallet has been imported and securely stored.\n\nAddress: ${formattedAddress}`,
        severity: 'low',
        primaryAction: {
          label: 'Continue',
          action: () => {
            setModalConfig(null);
            router.replace('/(tabs)/dashboard' as any);
          }
        }
      });
    } catch (error) {
      console.error('Failed to import wallet:', error);
      
      // Show error modal
      setModalConfig({
        title: 'Wallet Import Failed',
        message: 'There was an error importing your wallet. Please check your recovery phrase and try again.',
        severity: 'high',
        primaryAction: {
          label: 'Try Again',
          action: () => setModalConfig(null)
        }
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleBack = () => {
    router.replace('/');
  };

  const wordCount = words.filter((w) => w.length > 0).length;

  return (
    <SafeAreaView style={ROOT_STYLE}>
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

            {/* Mnemonic Input: reusable component */}
            <MnemonicInputGrid
              words={words}
              onChangeWords={(w) => setWords(w)}
              onValidityChange={(valid, phrase) => {
                setMnemonic(phrase);
                setIsValidMnemonic(valid);
              }}
            />

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

      {/* Custom Modal for user-friendly error handling */}
      {modalConfig && (
        <CustomModal
          visible={!!modalConfig}
          title={modalConfig.title}
          message={modalConfig.message}
          severity={modalConfig.severity}
          primaryAction={modalConfig.primaryAction}
          secondaryAction={modalConfig.secondaryAction}
          onClose={() => setModalConfig(null)}
        />
      )}
    </SafeAreaView>
  );
} 