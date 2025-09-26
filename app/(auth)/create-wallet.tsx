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
import { MnemonicInputGrid } from '~/components/MnemonicInputGrid';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore } from '~/lib/stores/useGlobalStore';
import { CustomModal } from '~/components/CustomModal';

const ROOT_STYLE = { flex: 1 };

export default function CreateWalletScreen() {
  const { colors } = useColorScheme();
  const [mnemonic, setMnemonic] = useState<string>('');
  const [flowStep, setFlowStep] = useState<'show' | 'confirm'>('show');
  const [confirmWords, setConfirmWords] = useState<string[]>(Array(12).fill(''));
  const [isConfirmValid, setIsConfirmValid] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    primaryAction?: { label: string; action: () => void };
    secondaryAction?: { label: string; action: () => void };
  } | null>(null);
  
  // Get wallet store actions
  const addWallet = useGlobalStore((state) => state.addWallet);

  useEffect(() => {
    // Generate mnemonic using ethers
    const newMnemonic = ethers.Wallet.createRandom().mnemonic?.phrase || '';
    setMnemonic(newMnemonic);
  }, []);

  const handleCreateWallet = async () => {
    // Only allow creating after successful confirmation step
    const matchesOriginal = confirmPhrase.trim().replace(/\s+/g, ' ') === mnemonic.trim().replace(/\s+/g, ' ');
    if (flowStep !== 'confirm' || !isConfirmValid || !matchesOriginal) {
      setModalConfig({
        title: 'Confirm Recovery Phrase',
        message: 'Please retype the 12 words correctly to continue.',
        severity: 'medium',
        primaryAction: { label: 'OK', action: () => setModalConfig(null) }
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Create wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      
      // Save wallet to Zustand store
      const walletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: mnemonic,
        isImported: false,
        createdAt: new Date(),
      };
      
      addWallet(walletData);
      console.log('Wallet saved to Zustand store:', wallet.address);
      
      // XRBG branch: No external data initialization
      
      // Show success with custom modal and formatted address
      const formattedAddress = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
      setModalConfig({
        title: 'Wallet Created Successfully!',
        message: `Your wallet has been created and securely stored.\n\nAddress: ${formattedAddress}`,
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
      console.error('Failed to create wallet:', error);
      
      // Show error modal
      setModalConfig({
        title: 'Wallet Creation Failed',
        message: 'There was an error creating your wallet. Please try again.',
        severity: 'high',
        primaryAction: {
          label: 'Try Again',
          action: () => setModalConfig(null)
        }
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={ROOT_STYLE}>
      <View className="mx-auto max-w-sm flex-1 px-4 py-4">
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
            {flowStep === 'show' ? 'Create Wallet' : 'Confirm Recovery Phrase'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {flowStep === 'show' ? (
            <View className="gap-4">
              {/* Warning Section */}
              <View className="gap-3 rounded-xl bg-orange-50 p-6 dark:bg-orange-950/20">
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

              {/* Mnemonic Display (styled like RecoveryPhraseModal) */}
              <View className="gap-4">
                <Text className="text-center">
                  Recovery Phrase
                </Text>

                <View className="rounded-xl p-6" style={{ backgroundColor: colors.card }}>
                  <View className="flex-row flex-wrap justify-between">
                    {mnemonic.split(' ').map((word, index) => (
                      <View
                        key={index}
                        className="flex-row items-center px-3 py-2 rounded-lg mb-2 w-[48%]"
                        style={{ backgroundColor: colors.background }}
                      >
                        <Text
                          className="text-xs mr-1 font-medium"
                          style={{ color: colors.grey }}
                        >
                          {index + 1}.
                        </Text>
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: colors.foreground }}
                        >
                          {word}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Text className="text-xs text-center" style={{ color: colors.grey }}>
                  Write down each word in order. You'll need this to recover your wallet.
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-4">
              {/* Confirmation Step: retype words without showing original */}
              <View className="gap-2">
                <Text className="text-center">Retype Your 12 Words</Text>
                <Text className="text-xs text-center text-muted-foreground">
                  Enter each word in order to confirm you saved the phrase. The original phrase will not be shown again.
                </Text>
              </View>
              <MnemonicInputGrid
                words={confirmWords}
                onChangeWords={setConfirmWords}
                onValidityChange={(valid, phrase) => {
                  setIsConfirmValid(valid);
                  setConfirmPhrase(phrase);
                }}
              />
            </View>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <View className="gap-4 pt-6">
          {flowStep === 'show' ? (
            <Button
              size={Platform.select({ ios: 'lg', default: 'md' })}
              onPress={() => {
                // Move to confirmation step without showing the phrase again
                setFlowStep('confirm');
              }}
            >
              <MaterialIcons name="check" size={20} color="white" />
              <Text>I wrote it down</Text>
            </Button>
          ) : (
            <Button
              size={Platform.select({ ios: 'lg', default: 'md' })}
              onPress={handleCreateWallet}
              disabled={!isConfirmValid || isCreating || (confirmPhrase.trim().replace(/\s+/g, ' ') !== mnemonic.trim().replace(/\s+/g, ' '))}
            >
              <MaterialIcons name="wallet" size={20} color="white" />
              <Text>{isCreating ? 'Creating Wallet...' : 'Create Wallet'}</Text>
            </Button>
          )}
          {flowStep === 'confirm' && (
            (() => {
              const hasAllWords = confirmWords.filter((w) => w.length > 0).length === 12;
              const phrasesEqual = confirmPhrase.trim().replace(/\s+/g, ' ') === mnemonic.trim().replace(/\s+/g, ' ');
              if (!hasAllWords) return null;
              if (isConfirmValid && !phrasesEqual) {
                return (
                  <Text className="text-xs text-center" style={{ color: colors.destructive }}>
                    The retyped phrase doesn’t match the original.
                  </Text>
                );
              }
              if (!isConfirmValid) {
                return (
                  <Text className="text-xs text-center" style={{ color: colors.destructive }}>
                    The entered phrase is not a valid recovery phrase.
                  </Text>
                );
              }
              return null;
            })()
          )}
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