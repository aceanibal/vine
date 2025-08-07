import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '~/lib/useColorScheme';
import { ErrorSeverity } from '~/lib/blockchainErrorHandler';

interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  severity?: ErrorSeverity;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  showCancel?: boolean;
  primaryAction?: {
    label: string;
    action: () => void;
  };
  secondaryAction?: {
    label: string;
    action: () => void;
  };
}

export function CustomModal({ 
  visible, 
  title, 
  message, 
  type,
  severity,
  onConfirm, 
  onCancel,
  onClose,
  showCancel = false,
  primaryAction,
  secondaryAction
}: CustomModalProps) {
  const { colors } = useColorScheme();

  const getIconName = () => {
    if (severity) {
      switch (severity) {
        case ErrorSeverity.CRITICAL: return 'error';
        case ErrorSeverity.HIGH: return 'warning';
        case ErrorSeverity.MEDIUM: return 'info';
        case ErrorSeverity.LOW: return 'check-circle';
        default: return 'info';
      }
    }
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const getIconColor = () => {
    if (severity) {
      switch (severity) {
        case ErrorSeverity.CRITICAL: return '#EF4444';
        case ErrorSeverity.HIGH: return '#F59E0B';
        case ErrorSeverity.MEDIUM: return '#3B82F6';
        case ErrorSeverity.LOW: return '#10B981';
        default: return '#3B82F6';
      }
    }
    switch (type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  const getConfirmButtonClass = () => {
    if (severity) {
      switch (severity) {
        case ErrorSeverity.CRITICAL: return 'bg-red-500';
        case ErrorSeverity.HIGH: return 'bg-amber-500';
        case ErrorSeverity.MEDIUM: return 'bg-blue-500';
        case ErrorSeverity.LOW: return 'bg-emerald-500';
        default: return 'bg-blue-500';
      }
    }
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
            {(secondaryAction || onCancel || (showCancel && onClose)) && (
              <TouchableOpacity
                className="px-5 py-3 rounded-lg min-w-20 items-center bg-transparent"
                onPress={secondaryAction?.action || onCancel || onClose}
              >
                <Text 
                  className="text-base font-medium" 
                  style={{ color: colors.grey }}
                >
                  {secondaryAction?.label || 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              className={`px-5 py-3 rounded-lg min-w-20 items-center ${getConfirmButtonClass()}`}
              onPress={primaryAction?.action || onConfirm}
            >
              <Text className="text-base font-medium text-white">
                {primaryAction?.label || 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
} 