// Import secure random source (BEFORE the shims)
import "react-native-get-random-values";

// Import the ethers shims (BEFORE importing ethers)
import "@ethersproject/shims";

import { MaterialIcons } from '@expo/vector-icons';
import { ethers } from 'ethers';
import { router } from 'expo-router';
import { Platform, View, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';

import { Button } from 'react-native-paper';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore } from '~/lib/stores/useGlobalStore';
import { CustomModal } from '~/components/CustomModal';
import { MnemonicInputGrid } from '~/components/MnemonicInputGrid';
import { ScreenWithImageBackground } from '~/components/ScreenWithImageBackground';

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
    <ScreenWithImageBackground showScrollView={false}>
      <View className="flex-1 rounded-t-3xl bg-white mt-3 p-6">
        {/* Header */}
        <View className="flex-row items-center justify-between pb-6">
          <TouchableOpacity
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text 
            className="font-bold text-lapis-lazuli"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontSize: 20 }}
          >
            Import Wallet
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="gap-4">
            {/* Mnemonic Input: reusable component with built-in info box */}
            <MnemonicInputGrid
              words={words}
              onChangeWords={(w) => setWords(w)}
              onValidityChange={(valid, phrase) => {
                setMnemonic(phrase);
                setIsValidMnemonic(valid);
              }}
            />
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View className="pt-6">
          <Button
            mode="contained"
            buttonColor={(!isValidMnemonic || isImporting) ? 'rgba(34, 93, 124, 0.1)' : '#225D7C'}
            onPress={() => {
              if (!isValidMnemonic || isImporting) return;
              handleImportWallet();
            }}
            style={{ width: '100%' }}
            contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 12 }}
          >
            <Text 
              className="font-semibold" 
              numberOfLines={1} 
              adjustsFontSizeToFit
              style={{ fontSize: 18, color: '#FFFFFF' }}
            >
              {isImporting ? 'Importing Wallet...' : 'Import Wallet'}
            </Text>
          </Button>
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
      </View>
    </ScreenWithImageBackground>
  );
} 