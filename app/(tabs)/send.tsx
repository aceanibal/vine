import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { TokenIcon, getTokenIconProps } from '~/components/TokenIcon';
import { useColorScheme } from '~/lib/useColorScheme';
import { useAllTokens, useGasPriority, useGlobalStore, useCurrentWallet } from '~/lib/stores/useGlobalStore';

export default function SendScreen() {
  const { colors } = useColorScheme();
  const tokens = useAllTokens();
  const currentWallet = useCurrentWallet();
  const params = useLocalSearchParams();
  
  // Get the source screen to determine where to go back
  const source = params.source as string;
  
  const handleBackNavigation = () => {
    if (source === 'transfer') {
      router.push('/(tabs)/transfer' as any);
    } else if (source === 'dashboard') {
      router.push('/(tabs)/dashboard' as any);
    } else {
      // Default fallback
      router.back();
    }
  };
  
  // Show all available tokens (not filtered by chain)
  const availableTokens = tokens; // Show all tokens regardless of chain
  const defaultToken = availableTokens[0]; // Use first available token as default
  
  const [selectedToken, setSelectedToken] = useState(defaultToken);
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const gasPriority = useGasPriority();
  const setGasPriority = useGlobalStore((state) => state.setGasPriority);

  // Component is ready when wallet is available
  useEffect(() => {
    if (currentWallet?.address) {
      console.log('Send: Wallet available, component ready');
    }
  }, [currentWallet]);

  // Update selected token when tokens change
  useEffect(() => {
    if (availableTokens.length > 0 && !selectedToken) {
      setSelectedToken(availableTokens[0]);
    }
  }, [availableTokens, selectedToken]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatWei = (wei: number) => {
    if (wei === 0) return '0 wei';
    
    // Convert to gwei for better readability
    const gwei = wei / Math.pow(10, 9);
    if (gwei >= 1) {
      return `${gwei.toFixed(2)} gwei`;
    }
    
    // Show in wei if less than 1 gwei
    return `${wei.toLocaleString()} wei`;
  };

  const calculateUSDValue = () => {
    const numAmount = parseFloat(amount) || 0;
    return numAmount * (selectedToken?.price || 0);
  };

  const calculateGasFeeForPriority = (priority: 'slow' | 'standard' | 'fast' = gasPriority) => {
    // Simple gas fee calculation using global store data
    const baseGasPrice = 30000000000; // 30 gwei in wei
    const gasLimit = selectedToken?.isNative ? 21000 : 65000;
    
    // Adjust gas price based on priority
    const multiplier = priority === 'slow' ? 0.8 : priority === 'fast' ? 1.5 : 1.0;
    return baseGasPrice * gasLimit * multiplier;
  };

  const handleSend = () => {
    if (!amount || !recipientAddress || !selectedToken) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Amount must be greater than 0');
      return;
    }

    setIsLoading(true);
    
    // Simulate transaction processing
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Transaction Sent',
        `Successfully sent ${amount} ${selectedToken.symbol} to ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-6)}`,
        [
          {
            text: 'OK',
            onPress: () => handleBackNavigation()
          }
        ]
      );
    }, 2000);
  };

  const TokenSelector = ({ token, onSelect }: { token: any; onSelect?: () => void }) => {
    const iconProps = getTokenIconProps(token);
    const isSelected = selectedToken?.address === token.address;
    
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedToken(token);
          if (onSelect) onSelect();
        }}
        className={`flex-row items-center gap-3 p-3 rounded-lg border ${
          isSelected
            ? 'border-primary bg-primary/10' 
            : 'border-border bg-background'
        }`}
      >
        <TokenIcon
          {...iconProps}
          size={20}
          backgroundColor={iconProps.color + '20'}
        />
        <View className="flex-1">
          <Text className="font-semibold">
            {token.name}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {token.price ? formatCurrency(token.price) : 'Price unavailable'} per {token.symbol}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {token.chainName}
          </Text>
        </View>
        {isSelected && (
          <MaterialIcons name="check-circle" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
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
          {/* Token Selection */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="text-lg font-semibold">
              Token
            </Text>
            <TouchableOpacity 
              onPress={() => availableTokens.length > 0 && setShowTokenModal(true)}
              className="flex-row items-center justify-between p-4 border border-border rounded-lg bg-background"
            >
              <View className="flex-row items-center gap-3">
                {selectedToken && (
                  <>
                    <TokenIcon
                      {...getTokenIconProps(selectedToken)}
                      size={20}
                      backgroundColor={getTokenIconProps(selectedToken).color + '20'}
                    />
                    <View>
                      <Text className="font-semibold">
                        {selectedToken.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {selectedToken.price ? formatCurrency(selectedToken.price) : 'Price unavailable'} per {selectedToken.symbol}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {selectedToken.chainName}
                      </Text>
                    </View>
                  </>
                )}
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-muted-foreground">
                  Change
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.grey} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="text-lg font-semibold">
              Amount
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                {selectedToken && (
                  <TokenIcon
                    {...getTokenIconProps(selectedToken)}
                    size={20}
                    backgroundColor={getTokenIconProps(selectedToken).color + '20'}
                  />
                )}
                <View className="flex-1">
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder={selectedToken ? `0.00 ${selectedToken.symbol}` : '0.00'}
                    keyboardType="decimal-pad"
                    className="text-lg font-bold"
                    style={{ color: colors.foreground }}
                  />
                  <Text className="text-xs text-muted-foreground">
                    ≈ {formatCurrency(calculateUSDValue())}
                  </Text>
                </View>
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

          {/* Gas Priority Selector */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Gas Priority
            </Text>
            <View className="flex-row gap-2">
              {(['slow', 'standard', 'fast'] as const).map((priority) => (
                <TouchableOpacity
                  key={priority}
                  onPress={() => setGasPriority(priority)}
                  className={`flex-1 p-3 rounded-lg border ${
                    gasPriority === priority
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background'
                  }`}
                >
                  <Text className={`text-center font-medium ${
                    gasPriority === priority ? 'text-primary' : 'text-foreground'
                  }`}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                  <Text className="text-xs text-center text-muted-foreground mt-1">
                    {formatWei(calculateGasFeeForPriority(priority))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-xs text-muted-foreground">
              Higher priority = faster confirmation, higher cost
            </Text>
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
                  {amount || '0'} {selectedToken?.symbol || ''}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Network
                </Text>
                <Text className="font-semibold">
                  {selectedToken?.chainName || ''}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Value (USD)
                </Text>
                <Text className="font-semibold">
                  {formatCurrency(calculateUSDValue())}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">
                  Network Fee ({gasPriority})
                </Text>
                <Text className="font-semibold">
                  {formatWei(calculateGasFeeForPriority(gasPriority))}
                </Text>
              </View>
              <View className="border-t border-border pt-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold">
                    Token Value
                  </Text>
                  <Text className="font-bold">
                    {formatCurrency(calculateUSDValue())}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-sm text-muted-foreground">
                    + Network Fee
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {formatWei(calculateGasFeeForPriority(gasPriority))}
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
            disabled={isLoading || !amount || !recipientAddress}
          >
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="hourglass-empty" size={20} color="white" />
                <Text>Sending...</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="send" size={20} color="white" />
                <Text>Send {selectedToken?.symbol || 'Token'}</Text>
              </View>
            )}
          </Button>
        </View>
      </ScrollView>

      {/* Token Selection Modal */}
      <Modal
        visible={showTokenModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-bold">
                Select Token
              </Text>
              <TouchableOpacity onPress={() => setShowTokenModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.grey} />
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              {availableTokens.length > 0 ? (
                availableTokens.map((token) => (
                  <TokenSelector 
                    key={token.address} 
                    token={token} 
                    onSelect={() => setShowTokenModal(false)}
                  />
                ))
              ) : (
                <View className="items-center justify-center py-8">
                  <MaterialIcons name="add-circle" size={32} color={colors.grey} />
                  <Text className="mt-2 text-center text-muted-foreground">
                    No tokens available
                  </Text>
                  <Text className="text-xs text-center text-muted-foreground mt-1">
                    Tokens will appear here when available
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 