import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore, useCurrentWallet, usePredefinedToken, useTokenBalance, useDefaultChainIdNumeric } from '~/lib/stores/useGlobalStore';
import { checkDelegationStatus, executeSponsoredTransfer } from '~/lib/services/sponsored-orchestrator';

export default function SendScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useCurrentWallet();
  const predefinedToken = usePredefinedToken();
  const tokenBalance = useTokenBalance();
  const defaultChainIdNumeric = useDefaultChainIdNumeric();
  
  const handleBackNavigation = () => {
    router.back();
  };
  
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'token' | 'usd'>('token'); // 'token' or 'usd'
  const [isAuthVerified, setIsAuthVerified] = useState(false);
  const setAuthorizationSnapshot = useGlobalStore((s) => s.setAuthorizationSnapshot);

  // Component is ready when wallet is available
  useEffect(() => {
    if (currentWallet?.address) {
      console.log('Send: Wallet available, component ready');
    }
  }, [currentWallet]);

  

  // Ensure redirect when navigating into this screen (e.g., from Transfer)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          if (currentWallet?.address) {
            const status = await checkDelegationStatus(currentWallet.address);
            setAuthorizationSnapshot(status as any);
            if (active && !useGlobalStore.getState().isWalletAuthorized) {
              router.replace('/(tabs)/authorize');
            }
          }
        } catch (_e) {}
      })();
      return () => {
        active = false;
      };
    }, [currentWallet?.address])
  );

  // Biometric authentication on screen load
  useEffect(() => {
    let cancelled = false;
    const runAuth = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          if (__DEV__) {
            console.log('Development mode - bypassing biometric for simulator');
            if (!cancelled) setIsAuthVerified(true);
            return;
          }
          Alert.alert(
            'Authentication Required',
            'Biometric authentication is required to access the send screen.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to continue',
          fallbackLabel: 'Use passcode',
          cancelLabel: 'Cancel',
        });
        if (result.success) {
          if (!cancelled) setIsAuthVerified(true);
        } else {
          Alert.alert('Authentication Failed', 'Unable to authenticate.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }
      } catch (e) {
        console.error('Biometric auth error on load:', e);
        Alert.alert('Authentication Error', 'Failed to perform biometric authentication.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    };

    runAuth();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Format token amount to match predefined token decimals
  const formatTokenAmount = (tokenAmount: number) => {
    if (!predefinedToken?.decimals) return tokenAmount.toFixed(6); // fallback to 6 decimals
    return tokenAmount.toFixed(predefinedToken.decimals);
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

  // Get the display amount for the current input mode
  const getDisplayAmount = () => {
    if (!amount) return 0;
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber)) return 0;
    
    if (inputMode === 'token') {
      return amountNumber;
    } else {
      return amountNumber;
    }
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
      // Converting from token to USD
      const usdValue = calculateUSDValue(currentAmount);
      setAmount(usdValue.toString());
      setInputMode('usd');
    } else {
      // Converting from USD to token
      const tokenValue = calculateTokenAmount(currentAmount);
      // Format the token value to match token decimals
      const formattedTokenValue = formatTokenAmount(tokenValue);
      setAmount(formattedTokenValue);
      setInputMode('token');
    }
  };

  // Calculate network fee (2.5% of transfer amount)
  const calculateNetworkFee = (transferAmount: number) => {
    return transferAmount * 0.025; // 2.5%
  };

  // Format network fee with more precision for small amounts
  const formatNetworkFee = (feeAmount: number) => {
    if (feeAmount < 0.01) {
      // For very small amounts, show more decimal places
      return `$${feeAmount.toFixed(6)}`;
    }
    return formatCurrency(feeAmount);
  };

  const handleSend = async () => {
    if (!amount || !recipientAddress || !predefinedToken) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Error', 'Amount must be greater than 0');
      return;
    }

    if (!currentWallet?.address) {
      Alert.alert('Error', 'No wallet available');
      return;
    }

    // Validate balance - use actual token amount for validation
    const actualTokenAmount = getActualTokenAmount();
    const currentBalance = parseFloat(getTokenBalance());
    if (actualTokenAmount > currentBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    // Single-chain app; no chain support check needed

    // Ensure auth was completed
    if (!isAuthVerified) {
      Alert.alert('Authentication Required', 'Please authenticate to proceed.');
      return;
    }

    

    setIsLoading(true);
    
    try {
      router.replace('/(tabs)/active-transaction' as any);
      await executeSponsoredTransfer({
        fromAddress: currentWallet.address,
        tokenAddress: predefinedToken.address,
        toAddress: recipientAddress,
        amount: getActualTokenAmount().toString(),
      });

      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      console.error('Sponsored transaction error:', error);
      Alert.alert(
        'Transaction Failed',
        error.message || 'An unexpected error occurred',
        [{ text: 'OK' }]
      );
    }
  };


  // No token selector in XRBG branch

  return (
    !isAuthVerified ? (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Authenticating...</Text>
      </SafeAreaView>
    ) : (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <TouchableOpacity onPress={handleBackNavigation}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-lg font-bold">
          Send
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
        <View className="gap-6">
          {/* Token Details */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="text-lg font-semibold">Token Details</Text>
            {predefinedToken ? (
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold">{predefinedToken.name}</Text>
                  <Text className="text-sm text-muted-foreground">{predefinedToken.symbol}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted-foreground">Price</Text>
                  <Text className="font-semibold">{formatCurrency(predefinedToken.price)}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted-foreground">Balance</Text>
                  <Text className="font-semibold">{formatTokenAmount(parseFloat(getTokenBalance()))} {predefinedToken.symbol}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted-foreground">Value</Text>
                  <Text className="font-semibold">{formatCurrency(calculateUSDValue(parseFloat(getTokenBalance())))}</Text>
                </View>
              </View>
            ) : (
              <Text className="text-sm text-muted-foreground">No token configured</Text>
            )}
          </View>

  

          {/* Amount Input */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold">
                Amount
              </Text>
              <TouchableOpacity 
                onPress={toggleInputMode}
                className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-primary/10"
              >
                <Text className="text-sm font-medium text-primary">
                  {inputMode === 'token' ? 'USD' : 'Token'}
                </Text>
                <MaterialIcons name="swap-horiz" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder={
                      inputMode === 'token' 
                        ? (predefinedToken ? `${formatTokenAmount(0)} ${predefinedToken.symbol}` : '0.00')
                        : '0.00'
                    }
                    keyboardType="decimal-pad"
                    className="text-lg font-bold"
                    style={{ color: colors.foreground }}
                  />
                  {predefinedToken && amount && (
                    <Text className="text-xs text-muted-foreground">
                      {inputMode === 'token' 
                        ? `≈ ${formatCurrency(calculateUSDValue(parseFloat(amount) || 0))}`
                        : `≈ ${getFormattedTokenAmount()} ${predefinedToken.symbol}`
                      }
                    </Text>
                  )}
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <MaterialIcons 
                  name={inputMode === 'token' ? 'attach-money' : 'token'} 
                  size={14} 
                  color={colors.grey3} 
                />
                <Text className="text-xs text-muted-foreground">
                  {inputMode === 'token' 
                    ? `Enter amount in ${predefinedToken?.symbol || 'tokens'}`
                    : 'Enter amount in USD'
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* Recipient Address */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Recipient Address
            </Text>
            <View className="gap-3">
              <TextInput
                value={recipientAddress}
                onChangeText={setRecipientAddress}
                placeholder="Enter wallet address"
                className="p-3 border border-border rounded-lg bg-background"
                style={{ color: colors.foreground }}
                multiline
              />
              <Text className="text-xs text-muted-foreground">
                Double-check the address before sending
              </Text>
            </View>
          </View>

          {/* Transaction Summary */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Transaction Summary
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Amount
                </Text>
                <Text className="font-semibold">
                  {getFormattedTokenAmount()} {predefinedToken?.symbol || ''}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Value (USD)
                </Text>
                <Text className="font-semibold">
                  {formatCurrency(calculateUSDValue(getActualTokenAmount()))}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Network Fee (2.5%)
                </Text>
                <View className="flex-row items-center gap-1">
                  <Text className="font-semibold text-red-600">
                    {formatNetworkFee(calculateNetworkFee(calculateUSDValue(getActualTokenAmount())))}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Fee Status
                </Text>
                <View className="flex-row items-center gap-1">
                  <MaterialIcons name="check-circle" size={14} color="#16a34a" />
                  <Text className="font-semibold text-green-600">
                    WAIVED
                  </Text>
                </View>
              </View>
              <View className="border-t border-border pt-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold">
                    Total Cost
                  </Text>
                  <Text className="font-bold text-green-600">
                    {formatCurrency(calculateUSDValue(getActualTokenAmount()))}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-sm text-muted-foreground">
                    + Network Fee
                  </Text>
                  <Text className="text-sm text-green-600">
                    {formatNetworkFee(calculateNetworkFee(calculateUSDValue(getActualTokenAmount())))} (Waived)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Send Button */}
          <Button 
            size="lg" 
            className="mt-4"
            onPress={handleSend}
            disabled={isLoading || !amount || !recipientAddress || !predefinedToken || !isAuthVerified}
          >
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="hourglass-empty" size={20} color="white" />
                <Text>Sending...</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="stars" size={20} color="white" />
                <Text>Send {predefinedToken?.symbol || 'Token'} (FREE)</Text>
              </View>
            )}
          </Button>


          {/* Info */}
          {!predefinedToken && (
            <View className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <MaterialIcons name="info" size={16} color="#d97706" />
                <Text className="text-sm font-semibold text-yellow-700">
                  Token not configured
                </Text>
              </View>
              <Text className="text-xs text-yellow-600">
                Please configure a predefined token in the app settings.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
    )
  );
}