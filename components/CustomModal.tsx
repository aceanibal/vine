import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '~/lib/useColorScheme';

interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  showCancel?: boolean;
}

export function CustomModal({ 
  visible, 
  title, 
  message, 
  type, 
  onConfirm, 
  onCancel,
  onClose,
  showCancel = false
}: CustomModalProps) {
  const { colors } = useColorScheme();

  const getIconName = () => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel || onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <MaterialIcons 
              name={getIconName()} 
              size={24} 
              color={getIconColor()} 
            />
            <Text style={[styles.title, { color: colors.foreground }]}>
              {title}
            </Text>
          </View>
          
          <Text style={[styles.message, { color: colors.grey }]}>
            {message}
          </Text>
          
          <View style={styles.actions}>
            {(onCancel || (showCancel && onClose)) && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel || onClose}
              >
                <Text style={[styles.buttonText, { color: colors.grey }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.button, 
                styles.confirmButton, 
                { backgroundColor: getIconColor() }
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 