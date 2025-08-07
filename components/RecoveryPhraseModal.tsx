import React from 'react';
import { Modal, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '~/lib/useColorScheme';

interface RecoveryPhraseModalProps {
  visible: boolean;
  onClose: () => void;
  mnemonic: string;
}

const { height: screenHeight } = Dimensions.get('window');

export function RecoveryPhraseModal({ visible, onClose, mnemonic }: RecoveryPhraseModalProps) {
  const { colors } = useColorScheme();

  console.log('RecoveryPhraseModal render:', { visible, mnemonic: mnemonic ? 'has mnemonic' : 'no mnemonic' });

  const words = mnemonic.split(' ');

  if (!visible) {
    console.log('RecoveryPhraseModal not visible, returning null');
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <TouchableOpacity 
          className="absolute top-0 left-0 right-0 bottom-0 bg-black/50"
          activeOpacity={1} 
          onPress={onClose}
        />
        <View 
          className="rounded-t-2xl pt-2.5 px-5 pb-10"
          style={{ 
            backgroundColor: colors.card,
            maxHeight: screenHeight * 0.8 
          }}
        >
          {/* Handle */}
          <View className="items-center mb-2.5">
            <View 
              className="w-10 h-1 rounded-sm" 
              style={{ backgroundColor: colors.grey }} 
            />
          </View>

          {/* Header */}
          <View className="flex-row justify-between items-center mb-5">
            <Text 
              className="text-xl font-bold" 
              style={{ color: colors.foreground }}
            >
              Recovery Phrase
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1.5">
              <MaterialIcons name="close" size={24} color={colors.grey} />
            </TouchableOpacity>
          </View>

          {/* Warning */}
          <View 
            className="flex-row items-center p-3 rounded-lg mb-5" 
            style={{ backgroundColor: colors.background }}
          >
            <MaterialIcons name="warning" size={20} color={colors.primary} />
            <Text 
              className="ml-2 text-sm font-medium" 
              style={{ color: colors.primary }}
            >
              Keep this phrase safe and never share it with anyone
            </Text>
          </View>

          {/* Words Grid */}
          <View className="flex-row flex-wrap justify-between mb-5">
            {words.map((word, index) => (
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

          {/* Instructions */}
          <View className="items-center">
            <Text 
              className="text-xs text-center leading-4" 
              style={{ color: colors.grey }}
            >
              Write down each word in order. You'll need this to recover your wallet.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
} 