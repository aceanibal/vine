import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Button } from 'react-native-paper';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useCurrentWallet, usePredefinedToken, useTokenBalance } from '~/lib/stores/useGlobalStore';
import { executeSponsoredTransfer } from '~/lib/services/sponsored-orchestrator';

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

  const shortenAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
      // TODO: Implement paid transfer with fee
      await executeSponsoredTransfer({
        fromAddress: currentWallet.address,
        tokenAddress: predefinedToken.address,
        toAddress: recipientAddress,
        amount: amount,
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
      // TODO: Implement paid transfer with fee deducted from amount
      await executeSponsoredTransfer({
        fromAddress: currentWallet.address,
        tokenAddress: predefinedToken.address,
        toAddress: recipientAddress,
        amount: amountAfterFee.toString(),
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
      await executeSponsoredTransfer({
        fromAddress: currentWallet.address,
        tokenAddress: predefinedToken.address,
        toAddress: recipientAddress,
        amount: amount,
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
    <SafeAreaView className="flex-1 bg-lapis-lazuli" edges={['top']}>
      <View className="flex-1 rounded-t-3xl bg-white mt-6">
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
        
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <View className="gap-3">
          {/* Amount to send */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-lapis-lazuli">Amount to send</Text>
            <View className="items-center">
              <Text className="font-bold text-2xl text-lapis-lazuli">
                {formatTokenAmount(tokenAmount)} {predefinedToken?.symbol || ''}
              </Text>
              <Text className="text-blue-green text-sm">
                {formatCurrency(usdValue)}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View className="h-px bg-blue-green opacity-20 my-1" />

          {/* Recipient Details */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-lapis-lazuli">Recipient</Text>
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-blue-green">Address</Text>
                <Text className="font-mono text-sm font-semibold text-lapis-lazuli">
                  {shortenAddress(recipientAddress)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-blue-green">Status</Text>
                <View className="flex-row items-center gap-1">
                  {isVerifiedUser ? (
                    <>
                      <MaterialIcons name="check-circle" size={14} color="#225D7C" />
                      <Text className="text-sm font-semibold text-lapis-lazuli">Verified User</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="warning" size={14} color="#4F7D96" />
                      <Text className="text-sm font-semibold text-blue-green">Not Verified</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Fee Information - only for non-verified users */}
          {!isVerifiedUser && (
            <>
              {/* Divider */}
              <View className="h-px bg-blue-green opacity-20 my-1" />
              
              <View className="gap-2">
                <Text className="text-sm font-semibold text-lapis-lazuli">Fees</Text>
                <View className="gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-blue-green">Network Fee (0.25%)</Text>
                    <Text className="text-sm font-semibold text-lapis-lazuli">
                      {formatNetworkFee(networkFee)}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-blue-green">Fee Status</Text>
                    <Text className="text-sm font-semibold text-lapis-lazuli">REQUIRED</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
        </ScrollView>

        {/* Total and Buttons at bottom - fixed */}
        <View className="px-4 pb-4 pt-2 gap-2">
        {/* Divider */}
        <View className="h-px bg-blue-green opacity-20 mb-1" />
        
        {/* Total Cost */}
        <View className="pb-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-lapis-lazuli">Total Cost</Text>
            <Text className="text-sm font-bold text-lapis-lazuli">
              {formatTokenAmount(tokenAmount)} {predefinedToken?.symbol || 'XRBG'}
            </Text>
          </View>
          {!isVerifiedUser && (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-blue-green">+ Network Fee</Text>
              <Text className="text-sm text-blue-green">{formatNetworkFee(networkFee)}</Text>
            </View>
          )}
        </View>

        {isVerifiedUser ? (
          // Verified user - show sponsored/free button
          <Button 
            mode="contained"
            buttonColor="#225D7C"
            textColor="#FFFFFF"
            onPress={handleSendSponsored}
            disabled={isLoading}
            style={{ borderRadius: 8 }}
            contentStyle={{ paddingVertical: 8 }}
            labelStyle={{ fontSize: 16, fontWeight: '600' }}
          >
            {isLoading ? 'Sending...' : `Send ${predefinedToken?.symbol || 'Token'} (FREE)`}
          </Button>
        ) : (
          // Non-verified user - show both buttons, disable first if insufficient balance
          <>
            <Button 
              mode="contained"
              buttonColor="#225D7C"
              textColor="#FFFFFF"
              onPress={handleSendWithFee}
              disabled={isLoading || !balanceCheck.hasBalance}
              style={{ borderRadius: 8 }}
              contentStyle={{ paddingVertical: 8 }}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
            >
              {isLoading ? 'Sending...' : `Send ${formatTokenAmount(tokenAmount)} ${predefinedToken?.symbol || ''} + ${formatNetworkFee(networkFee)}`}
            </Button>
            
            <Button 
              mode="contained"
              buttonColor="#4F7D96"
              textColor="#FFFFFF"
              onPress={handleSendWithFeeDeducted}
              disabled={isLoading}
              style={{ borderRadius: 8 }}
              contentStyle={{ paddingVertical: 8 }}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
            >
              {isLoading ? 'Sending...' : `Send ${formatAmountAfterFee(tokenAmount, networkFee)} ${predefinedToken?.symbol || ''} (Fee deducted)`}
            </Button>
          </>
        )}
        </View>
      </View>
    </SafeAreaView>
  );
}

