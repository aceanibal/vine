import React from 'react';
import { Modal, View, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '~/components/nativewindui/Text';

interface RecoveryPhraseModalProps {
  visible: boolean;
  onClose: () => void;
  mnemonic: string;
}

const { height: screenHeight } = Dimensions.get('window');

export function RecoveryPhraseModal({ visible, onClose, mnemonic }: RecoveryPhraseModalProps) {
  // Lapis-lazuli theme colors
  const colors = {
    card: '#FFFFFF',
    background: '#F3F4F6',
    grey: '#6B7280',
    foreground: '#225D7C',
    primary: '#225D7C',
  };
  const words = mnemonic.split(' ');

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
              className="font-bold text-lapis-lazuli"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ fontSize: 20 }}
            >
              Recovery Phrase
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1.5">
              <MaterialIcons name="close" size={24} color={colors.grey} />
            </TouchableOpacity>
          </View>

          {/* Warning */}
          <View className="gap-3 rounded-xl bg-cambridge-blue/10 p-6 mb-5">
            <View className="items-center gap-2">
              <MaterialIcons name="warning" size={28} color="#7FAFA1" />
              <Text 
                className="text-lapis-lazuli"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ fontSize: 20 }}
              >
                Keep This Phrase Safe
              </Text>
            </View>
            <Text className="text-xs text-center text-lapis-lazuli">
              Never share it with anyone. This is the only way to recover your wallet.
            </Text>
          </View>

          {/* Words Grid */}
          <View className="flex-row flex-wrap justify-between mb-5">
            {words.map((word, index) => (
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

          {/* Instructions */}
          <View className="items-center">
            <Text className="text-xs text-center leading-4 text-blue-green">
              Write down each word in order. You'll need this to recover your wallet.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
} 