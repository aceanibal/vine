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
import { MnemonicVerificationGrid } from '~/components/MnemonicVerificationGrid';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore } from '~/lib/stores/useGlobalStore';
import { CustomModal } from '~/components/CustomModal';
import { ScreenWithImageBackground } from '~/components/ScreenWithImageBackground';

const ROOT_STYLE = { flex: 1 };

export default function CreateWalletScreen() {
  const { colors } = useColorScheme();
  const [mnemonic, setMnemonic] = useState<string>('');
  const [flowStep, setFlowStep] = useState<'show' | 'confirm'>('show');
  const [confirmWords, setConfirmWords] = useState<string[]>(Array(12).fill(''));
  const [isConfirmValid, setIsConfirmValid] = useState(false);
  const [allWordsCorrect, setAllWordsCorrect] = useState(false);
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
    if (flowStep !== 'confirm' || !isConfirmValid || !allWordsCorrect) {
      setModalConfig({
        title: 'Confirm Recovery Phrase',
        message: 'Please enter all 12 words correctly to continue.',
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
            {flowStep === 'show' ? 'Create Wallet' : 'Confirm Recovery Phrase'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {flowStep === 'show' ? (
            <View className="gap-2">
              {/* Warning Section */}
              <View className="gap-3 rounded-xl bg-cambridge-blue/10 p-6">
                <View className="items-center gap-2">
                  <MaterialIcons name="warning" size={28} color="#7FAFA1" />
                  <Text 
                    className="text-lapis-lazuli"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{ fontSize: 20 }}
                  >
                    Write Down Your Recovery Phrase
                  </Text>
                </View>
                <Text className="text-xs text-center text-lapis-lazuli">
                  This 12-word phrase is the only way to recover your wallet. Write it down and keep it safe. Never share it with anyone.
                </Text>
              </View>

              {/* Mnemonic Display (styled like RecoveryPhraseModal) */}
              <View className="gap-4">
                <Text 
                  className="text-center text-lapis-lazuli"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ fontSize: 20 }}
                >
                  Recovery Phrase
                </Text>

                <View className="rounded-xl p-6 bg-white">
                  <View className="flex-row flex-wrap justify-between">
                    {mnemonic.split(' ').map((word, index) => (
                      <View
                        key={index}
                        className="flex-row items-center px-3 py-2 rounded-lg mb-2 w-[48%] bg-cambridge-blue/10"
                      >
                        <Text
                          className="text-xs mr-1 font-medium text-blue-green"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {index + 1}.
                        </Text>
                        <Text
                          className="text-sm font-semibold text-lapis-lazuli"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {word}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Text className="text-xs text-center text-blue-green">
                  Write down each word in order. You'll need this to recover your wallet.
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-4">
              {/* Confirmation Step: retype words without showing original */}
              <MnemonicVerificationGrid
                words={confirmWords}
                onChangeWords={setConfirmWords}
                originalMnemonic={mnemonic}
                onValidityChange={(valid, allCorrect) => {
                  setIsConfirmValid(valid);
                  setAllWordsCorrect(allCorrect);
                }}
              />

              {/* Error Messages */}
              {(() => {
                const hasAllWords = confirmWords.filter((w) => w.length > 0).length === 12;
                if (!hasAllWords) return null;
                if (!allWordsCorrect) {
                  return (
                    <Text 
                      className="text-xs text-center text-boston-red"
                      numberOfLines={2}
                      adjustsFontSizeToFit
                    >
                      Some words don't match. Please check your entries.
                    </Text>
                  );
                }
                if (!isConfirmValid) {
                  return (
                    <Text 
                      className="text-xs text-center text-boston-red"
                      numberOfLines={2}
                      adjustsFontSizeToFit
                    >
                      Please enter all 12 words correctly.
                    </Text>
                  );
                }
                return null;
              })()}
            </View>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <View className="pt-6">
          {flowStep === 'show' ? (
            <Button
              mode="contained"
              buttonColor="#225D7C"
              onPress={() => {
                // Move to confirmation step without showing the phrase again
                setFlowStep('confirm');
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
                I wrote it down
              </Text>
            </Button>
          ) : (
            <Button
              mode="contained"
              buttonColor={(!isConfirmValid || !allWordsCorrect || isCreating) ? 'rgba(34, 93, 124, 0.1)' : '#225D7C'}
              onPress={() => {
                if (!isConfirmValid || !allWordsCorrect || isCreating) return;
                handleCreateWallet();
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
                {isCreating ? 'Creating Wallet...' : 'Create Wallet'}
              </Text>
            </Button>
          )}
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