import React from 'react';
import { View, Image, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGlobalStore } from '~/lib/stores/useGlobalStore';

interface TokenIconProps {
  // For new token system (from Moralis)
  logoURI?: string;
  
  // For legacy token system (MaterialIcons)
  icon?: string;
  color?: string;
  
  // Common props
  size?: number;
  style?: ViewStyle;
  backgroundColor?: string;
}

export const TokenIcon: React.FC<TokenIconProps> = ({
  logoURI,
  icon,
  color = '#666',
  size = 24,
  style,
  backgroundColor = 'transparent'
}) => {
  const setError = useGlobalStore((state) => state.setError);
  
  const containerStyle: ViewStyle = {
    width: size + 8,
    height: size + 8,
    borderRadius: (size + 8) / 2,
    backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    ...style,
  };

  // Priority 1: Use remote logo from Moralis if available
  if (logoURI) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: logoURI }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          resizeMode="contain"
          onError={() => {
            // Use global error handling instead of local state
            console.warn('Failed to load token logo:', logoURI);
            setError(`Failed to load token icon: ${logoURI}`);
          }}
        />
      </View>
    );
  }

  // Priority 2: Use MaterialIcon if provided
  if (icon) {
    return (
      <View style={containerStyle}>
        <MaterialIcons 
          name={icon as any} 
          size={size} 
          color={color} 
        />
      </View>
    );
  }

  // Priority 3: Default fallback icon
  return (
    <View style={containerStyle}>
      <MaterialIcons 
        name="monetization-on" 
        size={size} 
        color={color} 
      />
    </View>
  );
};

// Helper function to get token icon props from different token formats
export const getTokenIconProps = (token: any) => {
  // New token format (from Zustand store)
  if (token.logoURI !== undefined || token.isNative !== undefined) {
    return {
      logoURI: token.logoURI,
      icon: token.isNative ? getNativeTokenIcon(token.chainId) : undefined,
      color: token.isNative ? getNativeTokenColor(token.chainId) : undefined,
    };
  }
  
  // Legacy token format (from PREDEFINED_TOKENS)
  if (token.icon && token.color) {
    return {
      icon: token.icon,
      color: token.color,
    };
  }
  
  // Fallback
  return {
    icon: 'monetization-on',
    color: '#666',
  };
};

// Helper functions for native tokens
const getNativeTokenIcon = (chainId: string): string => {
  const nativeIcons: Record<string, string> = {
    'eth': 'local-gas-station',
    'polygon': 'local-gas-station', 
    'bsc': 'local-gas-station',
    'arbitrum': 'local-gas-station',
    'optimism': 'local-gas-station',
    'avalanche': 'local-gas-station',
    'fantom': 'local-gas-station',
    'base': 'local-gas-station',
  };
  return nativeIcons[chainId] || 'local-gas-station';
};

const getNativeTokenColor = (chainId: string): string => {
  const nativeColors: Record<string, string> = {
    'eth': '#627EEA',
    'polygon': '#8247E5',
    'bsc': '#F3BA2F',
    'arbitrum': '#28A0F0',
    'optimism': '#FF0420',
    'avalanche': '#E84142',
    'fantom': '#1969FF',
    'base': '#0052FF',
  };
  return nativeColors[chainId] || '#666';
};
