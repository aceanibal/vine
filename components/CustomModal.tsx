import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '~/lib/useColorScheme';

interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  severity?: 'low' | 'medium' | 'high' | 'critical';
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
        case 'critical': return 'error';
        case 'high': return 'warning';
        case 'medium': return 'info';
        case 'low': return 'check-circle';
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
        case 'critical': return '#FC7E7E'; // boston-red
        case 'high': return '#FC7E7E'; // boston-red
        case 'medium': return '#7FAFA1'; // cambridge-blue
        case 'low': return '#7FAFA1'; // cambridge-blue
        default: return '#7FAFA1'; // cambridge-blue
      }
    }
    switch (type) {
      case 'success': return '#7FAFA1'; // cambridge-blue
      case 'error': return '#FC7E7E'; // boston-red
      case 'warning': return '#FC7E7E'; // boston-red
      default: return '#7FAFA1'; // cambridge-blue
    }
  };

  const getConfirmButtonColor = () => {
    if (severity) {
      switch (severity) {
        case 'critical': return 'rgba(252, 126, 126, 0.1)'; // boston-red/10
        case 'high': return 'rgba(252, 126, 126, 0.1)'; // boston-red/10
        case 'medium': return 'rgba(127, 175, 161, 0.1)'; // cambridge-blue/10
        case 'low': return 'rgba(127, 175, 161, 0.1)'; // cambridge-blue/10
        default: return 'rgba(127, 175, 161, 0.1)'; // cambridge-blue/10
      }
    }
    switch (type) {
      case 'success': return 'rgba(127, 175, 161, 0.1)'; // cambridge-blue/10
      case 'error': return 'rgba(252, 126, 126, 0.1)'; // boston-red/10
      case 'warning': return 'rgba(252, 126, 126, 0.1)'; // boston-red/10
      default: return 'rgba(127, 175, 161, 0.1)'; // cambridge-blue/10
    }
  };

  const getConfirmTextColor = () => {
    if (severity) {
      switch (severity) {
        case 'critical': return '#FC7E7E'; // boston-red
        case 'high': return '#FC7E7E'; // boston-red
        case 'medium': return '#7FAFA1'; // cambridge-blue
        case 'low': return '#7FAFA1'; // cambridge-blue
        default: return '#7FAFA1'; // cambridge-blue
      }
    }
    switch (type) {
      case 'success': return '#7FAFA1'; // cambridge-blue
      case 'error': return '#FC7E7E'; // boston-red
      case 'warning': return '#FC7E7E'; // boston-red
      default: return '#7FAFA1'; // cambridge-blue
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
          className="w-full max-w-md rounded-xl p-6 shadow-lg bg-white" 
        >
          <View className="items-center gap-3 mb-4">
            <MaterialIcons 
              name={getIconName()} 
              size={48} 
              color={getIconColor()} 
            />
            <Text 
              className="text-lapis-lazuli font-semibold text-center" 
              numberOfLines={2}
              adjustsFontSizeToFit
              style={{ fontSize: 20 }}
            >
              {title}
            </Text>
          </View>
          
          <Text 
            className="text-lapis-lazuli text-center mb-6" 
            style={{ fontSize: 15, lineHeight: 22 }}
          >
            {message}
          </Text>
          
          <View className="flex-row justify-end gap-3">
            {(secondaryAction || onCancel || (showCancel && onClose)) && (
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: 'rgba(34, 93, 124, 0.1)' }}
                onPress={secondaryAction?.action || onCancel || onClose}
              >
                <Text 
                  className="font-semibold text-lapis-lazuli" 
                  style={{ fontSize: 16 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {secondaryAction?.label || 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              className="flex-1 py-3 rounded-lg items-center"
              style={{ backgroundColor: getConfirmButtonColor() }}
              onPress={primaryAction?.action || onConfirm}
            >
              <Text 
                className="font-semibold" 
                style={{ fontSize: 16, color: getConfirmTextColor() }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {primaryAction?.label || 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
} 