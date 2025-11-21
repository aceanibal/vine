import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useState, useEffect, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import * as Clipboard from 'expo-clipboard';
import { Button } from 'react-native-paper';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useCurrentWallet, useAllTransfers } from '~/lib/stores/useGlobalStore';
import { checkDelegationStatus } from '~/lib/services/sponsored-orchestrator';
import { ScreenWithImageBackground } from '~/components/ScreenWithImageBackground';

export default function AddressScreen() {
  const { colors } = useColorScheme();
  const params = useLocalSearchParams();
  const currentWallet = useCurrentWallet();
  const allTransfers = useAllTransfers();
  
  const amount = params.amount as string;
  const inputMode = params.inputMode as string;
  
  const handleBackNavigation = () => {
    router.back();
  };
  
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isValidAddress, setIsValidAddress] = useState<boolean | null>(null);
  const [isVerifiedUser, setIsVerifiedUser] = useState<boolean | null>(null);
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  const [showInvalidCharWarning, setShowInvalidCharWarning] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textInputRef = useRef<TextInput>(null);

  // Show invalid character warning with auto-hide
  const showWarning = () => {
    // Clear any existing timer
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    
    setShowInvalidCharWarning(true);
    warningTimerRef.current = setTimeout(() => {
      setShowInvalidCharWarning(false);
      warningTimerRef.current = null;
    }, 2000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, []);

  // Handle address input with validation
  const handleAddressChange = (text: string) => {
    // Remove spaces and newlines that might be in the formatted display
    const cleanText = text.replace(/[\s\n]/g, '');
    // Convert to lowercase for consistency
    const lowercaseText = cleanText.toLowerCase();
    
    // Check if this is a deletion (backspace)
    const isDeletion = lowercaseText.length < recipientAddress.length;
    
    // If empty, allow it
    if (lowercaseText === '') {
      setRecipientAddress('');
      return;
    }
    
    // If starting to type "0x", allow it
    if (lowercaseText.length <= 2) {
      // Only allow '0' or '0x'
      if (lowercaseText === '0' || lowercaseText === '0x') {
        setRecipientAddress(lowercaseText);
      } else if (!isDeletion) {
        // Invalid start - show warning (only on addition, not deletion)
        showWarning();
      }
      return;
    }
    
    // Must start with 0x
    if (!lowercaseText.startsWith('0x')) {
      if (!isDeletion) {
        showWarning();
      }
      return;
    }
    
    // Only allow hex characters after 0x
    const hexPart = lowercaseText.slice(2);
    const hexRegex = /^[0-9a-f]*$/;
    if (!hexRegex.test(hexPart)) {
      // Invalid hex character - show warning (only on addition, not deletion)
      if (!isDeletion) {
        showWarning();
      }
      return;
    }
    
    // Limit to 42 characters (0x + 40 hex chars)
    if (lowercaseText.length > 42) {
      return;
    }
    
    setRecipientAddress(lowercaseText);
  };

  // Get unique recipient addresses from sent transactions
  const previousAddresses = useMemo(() => {
    if (!currentWallet?.address || !allTransfers) return [];
    
    const sentTransfers = allTransfers.filter(
      (transfer) => transfer.from.toLowerCase() === currentWallet.address.toLowerCase()
    );
    
    // Extract unique recipient addresses
    const uniqueAddresses = Array.from(
      new Set(sentTransfers.map((transfer) => transfer.to.toLowerCase()))
    );
    
    return uniqueAddresses;
  }, [currentWallet?.address, allTransfers]);

  // Format address for display (shortened)
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Handle selecting a previous address
  const handleSelectAddress = async (address: string) => {
    handleAddressChange(address);
    
    // Wait a moment for the address to be set and validated
    setTimeout(async () => {
      // Check if the address is valid before proceeding
      const isValid = ethers.isAddress(address);
      if (isValid) {
        // Check delegation status for the selected address
        try {
          const status = await checkDelegationStatus(address);
          const isVerified = !!(status.isDelegated && status.matchesTarget);
          
          // Navigate to confirmation screen
          router.push({
            pathname: '/send/confirm',
            params: {
              amount,
              recipientAddress: address,
              isVerifiedUser: isVerified ? 'true' : 'false',
            },
          });
        } catch (error) {
          console.error('[Send Address] Failed to check delegation for selected address:', error);
          // Still proceed even if delegation check fails
          router.push({
            pathname: '/send/confirm',
            params: {
              amount,
              recipientAddress: address,
              isVerifiedUser: 'false',
            },
          });
        }
      }
    }, 100);
  };

  // Handle pasting from clipboard
  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        handleAddressChange(text.trim());
      }
    } catch (error) {
      console.error('[Send Address] Failed to paste from clipboard:', error);
    }
  };

  // Get font size based on address length
  const getFontSize = () => {
    const len = recipientAddress.length;
    if (len === 0) return 48;
    if (len <= 5) return 40;
    if (len <= 10) return 32;
    if (len <= 15) return 24;
    if (len <= 20) return 20;
    if (len <= 22) return 18;
    // After 22 chars, we'll use 2-column layout
    return 16;
  };

  // Format address for 2-row display
  const formatAddressForDisplay = () => {
    if (recipientAddress.length <= 22) {
      return recipientAddress;
    }

    // Split address into chunks: 0x, then groups of 10
    const prefix = recipientAddress.slice(0, 2); // 0x
    const rest = recipientAddress.slice(2);
    
    // Create groups of 10 characters
    const chunks: string[] = [];
    for (let i = 0; i < rest.length; i += 10) {
      chunks.push(rest.slice(i, i + 10));
    }

    // First row: 0x + first 20 chars (2 chunks)
    const firstRow = `${prefix} ${chunks[0] || ''}${chunks[1] ? ' ' + chunks[1] : ''}`;
    // Second row: remaining 20 chars (2 chunks) - padded with spaces to align
    const secondRow = `   ${chunks[2] || ''}${chunks[3] ? ' ' + chunks[3] : ''}`;

    return `${firstRow}\n${secondRow}`.trim();
  };

  // Get error or progress message
  const getStatusMessage = () => {
    // Priority: show invalid character warning
    if (showInvalidCharWarning) {
      return {
        icon: 'warning',
        message: 'Only hex characters (0-9, a-f) allowed',
        color: '#7FAFA1',
      };
    }

    if (!recipientAddress) {
      return null;
    }

    // Check if starts with 0x
    if (!recipientAddress.startsWith('0x')) {
      return {
        icon: 'info',
        message: 'Address must start with 0x',
        color: '#7FAFA1',
      };
    }

    // Show progress
    const currentLength = recipientAddress.length;
    const targetLength = 42; // 0x + 40 hex characters
    if (currentLength < targetLength) {
      return {
        icon: 'info',
        message: `${currentLength}/${targetLength} characters`,
        color: '#7FAFA1',
      };
    }

    // Show verification status - only if eligible for free transactions
    if (isValidAddress && isVerifiedUser === true) {
      return {
        icon: 'check-circle',
        message: 'Eligible for free transactions',
        color: '#7FAFA1',
        backgroundColor: 'rgba(127, 175, 161, 0.1)',
      };
    }

    return null;
  };

  // Validate and check address
  const validateAddress = async (address: string) => {
    if (!address) {
      setIsValidAddress(null);
      setIsVerifiedUser(null);
      return;
    }

    // Check if it's a valid EVM address
    const isValid = ethers.isAddress(address);
    setIsValidAddress(isValid);

    if (!isValid) {
      setIsVerifiedUser(null);
      return;
    }

    // Check if it's one of our users (delegated to our contract)
    setIsCheckingAddress(true);
    try {
      const status = await checkDelegationStatus(address);
      const isVerified = !!(status.isDelegated && status.matchesTarget);
      setIsVerifiedUser(isVerified);
      console.log('[Send Address] Delegation check:', { address, status, isVerified });
    } catch (error) {
      console.error('[Send Address] Failed to check delegation:', error);
      setIsVerifiedUser(false);
    } finally {
      setIsCheckingAddress(false);
    }
  };

  // Debounce address validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (recipientAddress) {
        validateAddress(recipientAddress);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [recipientAddress]);

  const handleContinue = () => {
    if (!recipientAddress) {
      Alert.alert('Error', 'Please enter a recipient address');
      return;
    }

    if (!isValidAddress) {
      Alert.alert('Error', 'Please enter a valid EVM address');
      return;
    }

    // Navigate to confirmation screen with all data
    router.push({
      pathname: '/send/confirm',
      params: {
        amount,
        recipientAddress,
        isVerifiedUser: isVerifiedUser ? 'true' : 'false',
      },
    });
  };

  return (
    <ScreenWithImageBackground showScrollView={false}>
      <View className="flex-1 rounded-t-3xl bg-white mt-3">
        {/* Header with back/paste/home buttons */}
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={handleBackNavigation}>
            <MaterialIcons name="arrow-back" size={24} color="#225D7C" />
          </TouchableOpacity>
          
          {/* Paste Button */}
          <TouchableOpacity 
            onPress={handlePaste}
            className="flex-row items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-lapis-lazuli/5"
          >
            <MaterialIcons name="content-paste" size={16} color="#225D7C" />
            <Text className="text-xs font-medium text-lapis-lazuli">Paste</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')}>
            <MaterialIcons name="home" size={24} color="#225D7C" />
          </TouchableOpacity>
        </View>
        
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 px-4">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View className="gap-4">
        {/* Recipient Address Input */}
        <View className="gap-4">
          <Text className="text-center font-semibold text-lapis-lazuli">
            Enter Address
          </Text>
          
          {/* Large Centered Address Display */}
          <View className="items-center justify-center gap-2">
            <TouchableOpacity 
              activeOpacity={1}
              onPress={() => textInputRef.current?.focus()}
              className="w-full items-center relative py-4"
            >
              <TextInput
                ref={textInputRef}
                value={recipientAddress.length > 22 ? formatAddressForDisplay() : recipientAddress}
                onChangeText={handleAddressChange}
                placeholder=""
                className="text-lapis-lazuli font-mono text-center w-full"
                style={{
                  fontSize: getFontSize(),
                  padding: 0,
                  margin: 0,
                  textAlign: 'center',
                  lineHeight: recipientAddress.length > 22 ? getFontSize() * 1.4 : undefined,
                }}
                multiline={recipientAddress.length > 22}
                numberOfLines={recipientAddress.length > 22 ? 2 : 1}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                selectTextOnFocus={false}
                scrollEnabled={false}
                autoFocus={true}
                caretHidden={false}
              />
              {isCheckingAddress && (
                <View className="mt-2">
                  <ActivityIndicator size="small" color="#225D7C" />
                </View>
              )}
            </TouchableOpacity>

            {/* Fixed height placeholder for status messages */}
            <View>
              {(() => {
                const status = getStatusMessage();
                if (!status) return null;
                
                return (
                  <View 
                    className="flex-row items-center gap-2 justify-center rounded-xl p-2"
                  >
                    <MaterialIcons name={status.icon as any} size={16} color={status.color} />
                    <Text className="text-sm text-cambridge-blue">
                      {status.message}
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>
        </View>

        {/* Previous Addresses */}
        {previousAddresses.length > 0 && (
          <View className="gap-3">
            <Text className="text-sm font-semibold text-lapis-lazuli px-1">
              Previous Addresses
            </Text>
            {previousAddresses.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => handleSelectAddress(item)}
                className="flex-row items-center justify-between p-4 rounded-xl bg-cambridge-blue/10"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full items-center justify-center">
                    <MaterialIcons name="account-circle" size={24} color="#225D7C" />
                  </View>
                  <Text className="text-lg text-lapis-lazuli">
                    {formatAddress(item)}
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={20} color="#7FAFA1" />
              </TouchableOpacity>
            ))}
          </View>
        )}
            </View>
          </ScrollView>
          </View>
        </TouchableWithoutFeedback>

        {/* Continue Button - Fixed at bottom */}
        <View className="px-4 pb-4 bg-white">
          <Button 
            mode="contained"
            onPress={handleContinue}
            disabled={!recipientAddress || !isValidAddress || isCheckingAddress}
            buttonColor="#225D7C"
            style={{ 
              backgroundColor: '#225D7C',
              paddingVertical: 8,
              opacity: (!recipientAddress || !isValidAddress || isCheckingAddress) ? 0.5 : 1
            }}
            labelStyle={{ 
              fontSize: 16,
              color: '#FFFFFF'
            }}
            theme={{
              colors: {
                primary: '#225D7C',
                onPrimary: '#FFFFFF',
                surface: '#225D7C',
                onSurface: '#FFFFFF'
              }
            }}
          >
            Continue
          </Button>
        </View>
      </View>
    </ScreenWithImageBackground>
  );
}
