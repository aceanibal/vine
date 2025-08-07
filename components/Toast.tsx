import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '~/lib/useColorScheme';

interface ToastProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onHide: () => void;
  duration?: number;
}

export function Toast({ 
  visible, 
  message, 
  type, 
  onHide, 
  duration = 3000 
}: ToastProps) {
  const { colors } = useColorScheme();
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onHide();
    });
  };

  const getIconName = () => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View 
      className="absolute top-15 left-5 right-5 flex-row items-center px-4 py-3 rounded-lg shadow-lg z-50"
      style={{ 
        backgroundColor: getBackgroundColor(),
        opacity: fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0],
          }),
        }],
      }}
    >
      <MaterialIcons name={getIconName()} size={20} color="white" />
      <Text className="flex-1 text-white text-sm font-medium ml-3">{message}</Text>
      <TouchableOpacity onPress={hideToast} className="ml-2 p-1">
        <MaterialIcons name="close" size={20} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
} 