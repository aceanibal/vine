import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.grey }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Recovery Phrase
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.grey} />
            </TouchableOpacity>
          </View>

          {/* Warning */}
          <View style={[styles.warningContainer, { backgroundColor: colors.background }]}>
            <MaterialIcons name="warning" size={20} color={colors.primary} />
            <Text style={[styles.warningText, { color: colors.primary }]}>
              Keep this phrase safe and never share it with anyone
            </Text>
          </View>

          {/* Words Grid */}
          <View style={styles.wordsContainer}>
            {words.map((word, index) => (
              <View key={index} style={[styles.wordItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.wordNumber, { color: colors.grey }]}>
                  {index + 1}.
                </Text>
                <Text style={[styles.wordText, { color: colors.foreground }]}>
                  {word}
                </Text>
              </View>
            ))}
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={[styles.instructionsText, { color: colors.grey }]}>
              Write down each word in order. You'll need this to recover your wallet.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: screenHeight * 0.8,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
  },
  wordNumber: {
    fontSize: 12,
    marginRight: 4,
    fontWeight: '500',
  },
  wordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsContainer: {
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
}); 