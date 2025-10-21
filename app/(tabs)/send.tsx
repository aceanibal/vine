import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from 'react-native-paper';

import { Text } from '~/components/nativewindui/Text';
import { NumberPad } from '~/components/NumberPad';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore, useCurrentWallet, usePredefinedToken, useTokenBalance } from '~/lib/stores/useGlobalStore';

export default function AmountScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useCurrentWallet();
  const predefinedToken = usePredefinedToken();
  const tokenBalance = useTokenBalance();
  const checkWalletAuthorization = useGlobalStore((s) => s.checkWalletAuthorization);
  
  const [amount, setAmount] = useState('');
  const [inputMode, setInputMode] = useState<'token' | 'usd'>('token');

  // Handle number pad key press
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setAmount((prev) => prev.slice(0, -1));
    } else if (key === '.') {
      // Only allow one decimal point
      if (!amount.includes('.')) {
        setAmount((prev) => prev + key);
      }
    } else {
      // Limit decimal places based on input mode
      if (amount.includes('.')) {
        const [, decimal] = amount.split('.');
        // USD mode: always limit to 2 decimals
        // Token mode: limit to token decimals (but allow user to type more)
        const maxDecimals = inputMode === 'usd' ? 2 : (predefinedToken?.decimals || 18);
        if (decimal.length >= maxDecimals) {
          return;
        }
      }
      setAmount((prev) => prev + key);
    }
  };

  // Check authorization when navigating into this screen
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          if (currentWallet?.address) {
            console.log('[Send Amount] Checking wallet authorization...');
            await checkWalletAuthorization();
            if (active && !useGlobalStore.getState().isWalletAuthorized) {
              console.log('[Send Amount] Wallet not authorized, redirecting to authorize screen');
              router.replace('/send/authorize');
            }
          }
        } catch (e) {
          console.error('[Send Amount] Failed to check authorization:', e);
        }
      })();
      return () => {
        active = false;
      };
    }, [currentWallet?.address, checkWalletAuthorization])
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Get token balance in readable format
  const getTokenBalance = () => {
    if (!predefinedToken || !tokenBalance?.balance) return '0';
    
    const rawBalance = tokenBalance.balance.tokenBalanceDecimal || tokenBalance.balance.tokenBalance || '0';
    try {
      const balanceBigInt = BigInt(rawBalance);
      const divisor = BigInt(10 ** predefinedToken.decimals);
      const wholePart = balanceBigInt / divisor;
      const fractionalPart = balanceBigInt % divisor;
      
      const wholePartNumber = Number(wholePart);
      const fractionalStr = fractionalPart.toString().padStart(predefinedToken.decimals, '0');
      const trimmedFractional = fractionalStr.replace(/0+$/, '');
      
      if (trimmedFractional === '') {
        return wholePart.toString();
      }
      
      return `${wholePart}.${trimmedFractional}`;
    } catch (error) {
      return '0';
    }
  };

  // Calculate USD value of amount
  const calculateUSDValue = (tokenAmount: number) => {
    if (!predefinedToken?.price) return 0;
    return tokenAmount * predefinedToken.price;
  };

  // Calculate token amount from USD
  const calculateTokenAmount = (usdAmount: number) => {
    if (!predefinedToken?.price || predefinedToken.price === 0) return 0;
    return usdAmount / predefinedToken.price;
  };

  // Format token amount to 2 decimals by default
  const formatTokenAmount = (tokenAmount: number) => {
    return tokenAmount.toFixed(2);
  };

  // Get the actual token amount to send (always in token units)
  const getActualTokenAmount = () => {
    if (!amount) return 0;
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber)) return 0;
    
    if (inputMode === 'token') {
      return amountNumber;
    } else {
      return calculateTokenAmount(amountNumber);
    }
  };

  // Get formatted token amount string
  const getFormattedTokenAmount = () => {
    const tokenAmount = getActualTokenAmount();
    return formatTokenAmount(tokenAmount);
  };

  // Handle input mode toggle
  const toggleInputMode = () => {
    if (!amount) {
      setInputMode(inputMode === 'token' ? 'usd' : 'token');
      return;
    }

    const currentAmount = parseFloat(amount);
    if (isNaN(currentAmount)) return;

    if (inputMode === 'token') {
      // Converting from token to USD (always 2 decimals)
      const usdValue = calculateUSDValue(currentAmount);
      setAmount(usdValue.toFixed(2));
      setInputMode('usd');
    } else {
      // Converting from USD to token (show 2 decimals by default)
      const tokenValue = calculateTokenAmount(currentAmount);
      setAmount(tokenValue.toFixed(2));
      setInputMode('token');
    }
  };

  const handleContinue = () => {
    if (!amount || !predefinedToken) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Error', 'Amount must be greater than 0');
      return;
    }

    // Validate balance
    const actualTokenAmount = getActualTokenAmount();
    const currentBalance = parseFloat(getTokenBalance());
    if (actualTokenAmount > currentBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    // Navigate to address screen with amount data
    router.push({
      pathname: '/send/address',
      params: {
        amount: actualTokenAmount.toString(),
        inputMode,
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-lapis-lazuli" edges={['top']}>
      <View className="flex-1 rounded-t-3xl bg-white mt-6">
        {/* Main Content - Fixed Layout */}
        <View className="flex-1 p-4 gap-4">
        {/* Title */}
        <View className="items-center py-2">
          <Text className="text-2xl font-bold text-lapis-lazuli" numberOfLines={1}>
            Enter Amount
          </Text>
        </View>
        {/* Token Info */}
        {predefinedToken ? (
          <View className="flex-row items-center justify-between px-4 py-3 rounded-xl">
            <View className="flex-1 mr-2">
              <Text className="text-sm text-blue-green" numberOfLines={1}>Balance</Text>
              <Text className="text-base font-semibold text-lapis-lazuli" numberOfLines={1} adjustsFontSizeToFit>
                {inputMode === 'token' 
                  ? `${parseFloat(getTokenBalance()).toFixed(2)} ${predefinedToken.symbol}`
                  : formatCurrency(calculateUSDValue(parseFloat(getTokenBalance())))
                }
              </Text>
            </View>
            <TouchableOpacity 
              onPress={toggleInputMode}
              className="flex-row items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0"
            >
              <MaterialIcons name="swap-horiz" size={18} color="#225D7C" />
              <Text className="text-sm font-medium text-cambridge-blue" numberOfLines={1}>
                {inputMode === 'token' ? predefinedToken.symbol : 'USD'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="rounded-xl border border-hunyadi-yellow bg-celadon p-4">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="info" size={16} color="#D9A848" />
              <Text className="text-sm font-semibold text-hunyadi-yellow" numberOfLines={2}>
                Token not configured
              </Text>
            </View>
          </View>
        )}

        {/* Amount Display */}
        <View className="flex-1 items-center justify-center gap-2 px-4">
          <Text className="text-6xl font-bold text-lapis-lazuli" numberOfLines={1} adjustsFontSizeToFit>
            {amount || '0'}
          </Text>
          {predefinedToken && amount && (
            <Text className="text-xl text-blue-green" numberOfLines={1} adjustsFontSizeToFit>
              {inputMode === 'token' 
                ? `≈ ${formatCurrency(calculateUSDValue(parseFloat(amount) || 0))}`
                : `≈ ${getFormattedTokenAmount()} ${predefinedToken.symbol}`
              }
            </Text>
          )}
          {/* Insufficient balance warning */}
          {amount && predefinedToken && getActualTokenAmount() > parseFloat(getTokenBalance()) && (
            <View className="flex-row items-center gap-1 mt-2">
              <MaterialIcons name="error" size={16} color="#dc2626" />
              <Text className="text-sm font-semibold text-red-600" numberOfLines={1}>
                Insufficient balance
              </Text>
            </View>
          )}
          <Text className="text-sm text-blue-green mt-2" numberOfLines={2}>
            {inputMode === 'token' 
              ? `Amount in ${predefinedToken?.symbol || 'tokens'}`
              : 'Amount in USD'
            }
          </Text>
        </View>

        {/* Number Pad */}
        <View className="gap-4">
          <NumberPad onKeyPress={handleKeyPress} />
          
          {/* Continue Button */}
          <Button 
            mode="contained"
            onPress={handleContinue}
            disabled={!amount || !predefinedToken}
            style={{ backgroundColor: '#225D7C', paddingVertical: 8 }}
            labelStyle={{ fontSize: 16 }}
          >
            Continue
          </Button>
        </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

