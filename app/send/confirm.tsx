import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { Button } from 'react-native-paper';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useCurrentWallet, usePredefinedToken, useTokenBalance } from '~/lib/stores/useGlobalStore';
import { executeSponsoredTransfer } from '~/lib/services/sponsored-orchestrator';
import { ScreenWithImageBackground } from '~/components/ScreenWithImageBackground';

export default function ConfirmScreen() {
  const { colors } = useColorScheme();
  const params = useLocalSearchParams();
  const currentWallet = useCurrentWallet();
  const predefinedToken = usePredefinedToken();
  const tokenBalance = useTokenBalance();
  
  const amount = params.amount as string;
  const recipientAddress = params.recipientAddress as string;
  const isVerifiedUser = params.isVerifiedUser === 'true';
  
  const handleBackNavigation = () => {
    router.back();
  };
  
  const [isLoading, setIsLoading] = useState(false);

  // Normalize a numeric amount to a decimal string with at most `decimals` fractional digits.
  // Ensures no scientific notation and trims trailing zeros.
  const normalizeAmount = (value: number | string, decimals: number): string => {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (!isFinite(num) || num < 0) return '0';
    const fixed = num.toFixed(decimals);
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatTokenAmount = (tokenAmount: number) => {
    // Check if user input has more than 2 decimals
    const amountString = amount.toString();
    const decimalIndex = amountString.indexOf('.');
    if (decimalIndex !== -1) {
      const decimalPlaces = amountString.length - decimalIndex - 1;
      if (decimalPlaces > 2) {
        return tokenAmount.toFixed(decimalPlaces);
      }
    }
    // Default to 2 decimals
    return tokenAmount.toFixed(2);
  };

  const calculateUSDValue = (tokenAmount: number) => {
    if (!predefinedToken?.price) return 0;
    return tokenAmount * predefinedToken.price;
  };

  const calculateNetworkFee = (transferAmount: number) => {
    return transferAmount * 0.0025;
  };

  const formatNetworkFee = (feeAmount: number) => {
    if (feeAmount === 0) return `0.000 ${predefinedToken?.symbol || 'XRBG'}`;
    
    // Find position of first significant digit after decimal point
    const feeString = feeAmount.toString();
    const decimalIndex = feeString.indexOf('.');
    
    if (decimalIndex === -1) {
      // No decimal, just format with 3 decimals
      return `${feeAmount.toFixed(3)} ${predefinedToken?.symbol || 'XRBG'}`;
    }
    
    // Count leading zeros after decimal point
    let leadingZeros = 0;
    for (let i = decimalIndex + 1; i < feeString.length; i++) {
      if (feeString[i] === '0') {
        leadingZeros++;
      } else {
        break;
      }
    }
    
    // Show leading zeros + 3 significant digits
    const decimals = leadingZeros + 3;
    let formatted = feeAmount.toFixed(decimals);
    
    // Remove trailing zeros
    formatted = formatted.replace(/\.?0+$/, '');
    
    // If we removed all decimals, add back at least 3
    if (!formatted.includes('.')) {
      formatted = feeAmount.toFixed(3).replace(/0+$/, '');
    }
    
    return `${formatted} ${predefinedToken?.symbol || 'XRBG'}`;
  };

  const formatAmountAfterFee = (amount: number, fee: number) => {
    const result = amount - fee;
    // Convert to string to see actual precision
    const resultString = result.toString();
    
    // If it has decimals, keep them all (up to reasonable limit)
    if (resultString.includes('.')) {
      // Use up to 8 decimals to preserve precision
      let formatted = result.toFixed(8);
      // Remove trailing zeros
      formatted = formatted.replace(/\.?0+$/, '');
      return formatted;
    }
    
    return result.toFixed(2);
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    const prefix = address.slice(0, 2); // 0x
    const rest = address.slice(2);
    const chunks: string[] = [];
    for (let i = 0; i < rest.length; i += 10) {
      chunks.push(rest.slice(i, i + 10));
    }
    const firstRow = `${prefix} ${chunks[0] || ''}${chunks[1] ? ' ' + chunks[1] : ''}`;
    const secondRow = `   ${chunks[2] || ''}${chunks[3] ? ' ' + chunks[3] : ''}`;
    return `${firstRow}\n${secondRow}`.trim();
  };

  // Get token balance in readable format (same as amount.tsx)
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

  // Check if user has enough balance to cover amount + fee
  const checkAvailableBalance = () => {
    const balanceStr = getTokenBalance();
    const availableBalance = parseFloat(balanceStr);
    
    console.log('Available balance:', availableBalance, 'Balance string:', balanceStr);
    
    if (isNaN(availableBalance) || availableBalance === 0) {
      console.log('No available balance');
      return { hasBalance: false, availableBalance: 0, feeInTokens: 0, totalNeeded: 0 };
    }
    
    const tokenAmount = parseFloat(amount || '0');
    const feeInTokens = calculateNetworkFee(tokenAmount);
    const totalNeeded = tokenAmount + feeInTokens;
    
    console.log('Token amount:', tokenAmount, 'Fee:', feeInTokens, 'Total needed:', totalNeeded);
    console.log('Has enough balance?', availableBalance >= totalNeeded);
    
    return {
      hasBalance: availableBalance >= totalNeeded,
      availableBalance,
      feeInTokens,
      totalNeeded
    };
  };

  const handleSendWithFee = async () => {
    if (!amount || !recipientAddress || !predefinedToken) {
      Alert.alert('Error', 'Missing transaction details');
      return;
    }

    if (!currentWallet?.address) {
      Alert.alert('Error', 'No wallet available');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }

    setIsLoading(true);
    
    try {
      router.replace('/send/active-transaction');
      const decimals = predefinedToken.decimals;
      const amountStr = normalizeAmount(amountNumber, decimals);
      const feeStr = normalizeAmount(calculateNetworkFee(amountNumber), decimals);
      await executeSponsoredTransfer({
        fromAddress: currentWallet.address,
        tokenAddress: predefinedToken.address,
        toAddress: recipientAddress,
        amount: amountStr,
        feeAmount: feeStr,
      });

      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      console.error('Paid transaction error:', error);
      Alert.alert(
        'Transaction Failed',
        error.message || 'An unexpected error occurred',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSendWithFeeDeducted = async () => {
    if (!amount || !recipientAddress || !predefinedToken) {
      Alert.alert('Error', 'Missing transaction details');
      return;
    }

    if (!currentWallet?.address) {
      Alert.alert('Error', 'No wallet available');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }

    // Calculate amount after fee deduction
    const feeInTokens = calculateNetworkFee(amountNumber);
    const amountAfterFee = amountNumber - feeInTokens;

    if (amountAfterFee <= 0) {
      Alert.alert('Error', 'Amount is too small to cover the fee');
      return;
    }

    setIsLoading(true);
    
    try {
      router.replace('/send/active-transaction');
      const decimals = predefinedToken.decimals;
      const amountAfterFeeStr = normalizeAmount(amountAfterFee, decimals);
      const feeStr = normalizeAmount(feeInTokens, decimals);
      await executeSponsoredTransfer({
        fromAddress: currentWallet.address,
        tokenAddress: predefinedToken.address,
        toAddress: recipientAddress,
        amount: amountAfterFeeStr,
        feeAmount: feeStr,
      });

      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      console.error('Paid transaction error:', error);
      Alert.alert(
        'Transaction Failed',
        error.message || 'An unexpected error occurred',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSendSponsored = async () => {
    if (!amount || !recipientAddress || !predefinedToken) {
      Alert.alert('Error', 'Missing transaction details');
      return;
    }

    if (!currentWallet?.address) {
      Alert.alert('Error', 'No wallet available');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }

    setIsLoading(true);
    
    try {
      router.replace('/send/active-transaction');
      const decimals = predefinedToken.decimals;
      const amountStr = normalizeAmount(amountNumber, decimals);
      await executeSponsoredTransfer({
        fromAddress: currentWallet.address,
        tokenAddress: predefinedToken.address,
        toAddress: recipientAddress,
        amount: amountStr,
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

  const tokenAmount = parseFloat(amount || '0');
  const usdValue = calculateUSDValue(tokenAmount);
  const networkFee = calculateNetworkFee(tokenAmount);
  const balanceCheck = checkAvailableBalance();

  return (
    <ScreenWithImageBackground showScrollView={false}>
      <View className="flex-1 rounded-t-3xl bg-white mt-3">
        {/* Header with back/home buttons */}
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={handleBackNavigation}>
            <MaterialIcons name="arrow-back" size={24} color="#225D7C" />
          </TouchableOpacity>
          <View className="w-6" />
          <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')}>
            <MaterialIcons name="home" size={24} color="#225D7C" />
          </TouchableOpacity>
        </View>
        
        <ScrollView className="flex-1 px-6 mt-6">
          <View className="gap-4">
            {/* Amount Section */}
            <View className="gap-2">
              <Text className="text-base font-semibold text-lapis-lazuli/80">Amount to Send</Text>
              <View className="items-center rounded-xl bg-lapis-lazuli/5 p-4">
                <Text className="font-bold text-2xl text-lapis-lazuli">
                  {formatTokenAmount(tokenAmount)} {predefinedToken?.symbol || ''}
                </Text>
                <Text className="text-blue-green text-sm mt-1">
                  {formatCurrency(usdValue)}
                </Text>
              </View>
            </View>

            {/* Recipient Section */}
            <View className="gap-2">
              <Text className="text-base font-semibold text-lapis-lazuli/80">Recipient</Text>
              <View className="rounded-xl bg-cambridge-blue/10 p-4">
                <View className="gap-3">
                  <View className="gap-2">
                    <Text className="text-sm text-lapis-lazuli/80">Address</Text>
                    <Text 
                      className="text-lapis-lazuli font-mono font-bold" 
                      style={{ fontSize: 16, lineHeight: 22 }}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                    >
                      {formatAddress(recipientAddress)}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-lapis-lazuli/80">Status</Text>
                    <View className="flex-row items-center gap-1">
                      {isVerifiedUser ? (
                        <>
                          <MaterialIcons name="check-circle" size={16} color="#7FAFA1" />
                          <Text className="text-sm font-semibold text-cambridge-blue">Verified User</Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="warning" size={16} color="#225D7C" />
                          <Text className="text-sm text-lapis-lazuli/80">Not Verified</Text>
                        </>
                      )}
                    </View>
                  </View>
                  {!isVerifiedUser && (
                    <View className="px-2 rounded-lg">
                      <Text className="text-xs text-lapis-lazuli/70 leading-relaxed">
                        Address not delegated to our contract. Network fees apply.
                        Recipient can delegate to get free transactions.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Fee Information - only for non-verified users */}
            {!isVerifiedUser && (
              <View className="gap-2">
                <Text className="text-base font-semibold text-lapis-lazuli/80">Network Fees</Text>
                <View className="rounded-xl bg-hunyadi-yellow/10 p-4">
                  <View className="gap-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-lapis-lazuli/80">Network Fee (0.25%)</Text>
                      <Text className="text-sm font-semibold text-lapis-lazuli">
                        {formatNetworkFee(networkFee)}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-lapis-lazuli/80">Fee Status</Text>
                      <View className="flex-row items-center gap-1">
                        <MaterialIcons name="info" size={14} color="#4F7D96" />
                        <Text className="text-sm font-semibold text-lapis-lazuli">REQUIRED</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Buttons at bottom - fixed */}
        <View className="px-4 pb-4 pt-2">
          {/* Divider */}
          <View className="h-px bg-blue-green opacity-20 mb-4" />

          {isVerifiedUser ? (
            // Verified user - show sponsored/free button
            <Button 
              mode="contained"
              onPress={handleSendSponsored}
              disabled={isLoading}
              buttonColor="#225D7C"
              style={{ 
                backgroundColor: '#225D7C',
                paddingVertical: 12,
                opacity: isLoading ? 0.5 : 1
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
              {isLoading ? 'Sending...' : `Send ${predefinedToken?.symbol || 'Token'} (FREE)`}
            </Button>
          ) : (
            // Non-verified user - show both buttons, disable first if insufficient balance
            <View className="gap-3">
              <Button 
                mode="contained"
                onPress={handleSendWithFee}
                disabled={isLoading || !balanceCheck.hasBalance}
                buttonColor="#225D7C"
                style={{ 
                  backgroundColor: '#225D7C',
                  paddingVertical: 12,
                  opacity: (isLoading || !balanceCheck.hasBalance) ? 0.5 : 1
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
                {isLoading ? 'Sending...' : `Send ${formatTokenAmount(tokenAmount)} ${predefinedToken?.symbol || ''} + Fee`}
              </Button>
              
              <Button 
                mode="contained"
                onPress={handleSendWithFeeDeducted}
                disabled={isLoading}
                buttonColor="#4F7D96"
                style={{ 
                  backgroundColor: '#4F7D96',
                  paddingVertical: 12,
                  opacity: isLoading ? 0.5 : 1
                }}
                labelStyle={{ 
                  fontSize: 16,
                  color: '#FFFFFF'
                }}
                theme={{
                  colors: {
                    primary: '#4F7D96',
                    onPrimary: '#FFFFFF',
                    surface: '#4F7D96',
                    onSurface: '#FFFFFF'
                  }
                }}
              >
                {isLoading ? 'Sending...' : `Send ${formatAmountAfterFee(tokenAmount, networkFee)} ${predefinedToken?.symbol || ''} (Fee deducted)`}
              </Button>
            </View>
          )}
        </View>
      </View>
    </ScreenWithImageBackground>
  );
}

