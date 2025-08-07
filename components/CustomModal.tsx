import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
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

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel || onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-5">
        <View 
          className="w-full max-w-md rounded-xl p-6 shadow-lg" 
          style={{ backgroundColor: colors.card }}
        >
          <View className="flex-row items-center mb-4">
            <MaterialIcons 
              name={getIconName()} 
              size={24} 
              color={getIconColor()} 
            />
            <Text 
              className="text-lg font-semibold ml-3" 
              style={{ color: colors.foreground }}
            >
              {title}
            </Text>
          </View>
          
          <Text 
            className="text-base leading-6 mb-6" 
            style={{ color: colors.grey }}
          >
            {message}
          </Text>
          
          <View className="flex-row justify-end gap-3">
            {(onCancel || (showCancel && onClose)) && (
              <TouchableOpacity
                className="px-5 py-3 rounded-lg min-w-20 items-center bg-transparent"
                onPress={onCancel || onClose}
              >
                <Text 
                  className="text-base font-medium" 
                  style={{ color: colors.grey }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              className={`px-5 py-3 rounded-lg min-w-20 items-center ${getConfirmButtonClass()}`}
              onPress={onConfirm}
            >
              <Text className="text-base font-medium text-white">
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
} 