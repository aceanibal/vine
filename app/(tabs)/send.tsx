import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { TokenIcon, getTokenIconProps } from '~/components/TokenIcon';
import { useColorScheme } from '~/lib/useColorScheme';
import { useAllTokens, useCurrentWallet, getNumericChainId } from '~/lib/stores/useGlobalStore';
// Import the JavaScript module
const { SPONSORED_CONFIG, SponsoredOrchestrator } = require('~/lib/services/sponsored-orchestrator');

export default function SendScreen() {
  const { colors } = useColorScheme();
  const tokens = useAllTokens();
  const currentWallet = useCurrentWallet();
  const params = useLocalSearchParams();
  
  // Get the source screen to determine where to go back
  const source = params.source as string;
  const paramTokenAddress = params.tokenAddress as string;
  const paramChainId = params.chainId as string;
  
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
  
  // Filter to show only ERC-20 tokens (not native tokens)
  const availableTokens = tokens.filter(token => !token.isNative);
  
  // Find the token from navigation params, or use first available token as default
  const findTokenFromParams = () => {
    if (paramTokenAddress && paramChainId) {
      const foundToken = availableTokens.find(token => 
        token.address.toLowerCase() === paramTokenAddress.toLowerCase() && 
        token.chainId === paramChainId
      );
      if (foundToken) {
        console.log('Send: Found ERC-20 token from params:', foundToken.symbol, 'on', foundToken.chainName);
        return foundToken;
      }
    }
    return availableTokens[0]; // Fallback to first available ERC-20 token
  };
  
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Component is ready when wallet is available
  useEffect(() => {
    if (currentWallet?.address) {
      console.log('Send: Wallet available, component ready');
    }
  }, [currentWallet]);

  // Update selected token when tokens change or when params are available
  useEffect(() => {
    if (availableTokens.length > 0) {
      const tokenFromParams = findTokenFromParams();
      if (tokenFromParams) {
        setSelectedToken(tokenFromParams);
        console.log('Send: Auto-selected ERC-20 token:', tokenFromParams.symbol, 'from', tokenFromParams.chainName);
      }
    }
  }, [availableTokens, paramTokenAddress, paramChainId]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(amount);
    } else if (amount >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amount);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  };

  const calculateUSDValue = () => {
    const numAmount = parseFloat(amount) || 0;
    const tokenPrice = selectedToken?.price?.usd || 0;
    return numAmount * tokenPrice;
  };

  const handleSend = async () => {
    if (!amount || !recipientAddress || !selectedToken) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Amount must be greater than 0');
      return;
    }

    if (!currentWallet?.address || !currentWallet?.privateKey) {
      Alert.alert('Error', 'No wallet available');
      return;
    }

    // Check if the token's chain is supported
    const numericChainId = getNumericChainId(selectedToken.chainId);
    if (!SponsoredOrchestrator.isChainSupported(numericChainId)) {
      Alert.alert(
        'Chain Not Supported', 
        `Sponsored transactions are currently only supported on Polygon mainnet (Chain ID: ${SPONSORED_CONFIG.chainId}). Please try a different token or chain.`
      );
      return;
    }

    setIsLoading(true);
    
    try {
      // Create sponsored orchestrator for the token's chain
      const orchestrator = new SponsoredOrchestrator(numericChainId, currentWallet.privateKey);

      // Execute sponsored transfer
      const result = await orchestrator.executeSponsoredTransfer({
        tokenAddress: selectedToken.address,
        toAddress: recipientAddress,
        amount: amount,
        chainId: numericChainId,
        privateKey: currentWallet.privateKey,
      });

      setIsLoading(false);

      if (result.success) {
        Alert.alert(
          'Transaction Sent',
          `Sponsored transaction submitted successfully!\n\n${result.transactionHash ? `Hash: ${result.transactionHash.slice(0, 10)}...${result.transactionHash.slice(-8)}\n\n` : ''}Amount: ${amount} ${selectedToken.symbol}\nTo: ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-6)}\n\n✨ No gas fees! This transaction was sponsored.\n\nYou can track the transaction status in your transaction history.`,
          [
            {
              text: 'OK',
              onPress: () => handleBackNavigation()
            }
          ]
        );
      } else {
        Alert.alert(
          'Transaction Failed',
          result.error || 'An unknown error occurred',
          [{ text: 'OK' }]
        );
      }
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
            {token.price?.usd ? formatCurrency(token.price.usd) : 'Price unavailable'} per {token.symbol}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {token.chainName} • ERC-20
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
          Send (Sponsored)
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
        <View className="gap-6">
          {/* Sponsored Transaction Info */}
          <View className="rounded-xl border border-green-200 bg-green-50 p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <MaterialIcons name="stars" size={16} color="#16a34a" />
              <Text className="text-sm font-semibold text-green-700">
                Sponsored Transaction
              </Text>
            </View>
            <Text className="text-xs text-green-600">
              No gas fees! This transaction is sponsored and completely free for you.
            </Text>
            <Text className="text-xs text-green-500 mt-1">
              Network: Polygon Mainnet (Chain ID: {SPONSORED_CONFIG.chainId})
            </Text>
          </View>

          {/* Token Selection */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="text-lg font-semibold">
              Token (ERC-20 Only)
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
                        {selectedToken.price?.usd ? formatCurrency(selectedToken.price.usd) : 'Price unavailable'} per {selectedToken.symbol}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {selectedToken.chainName} • ERC-20
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
                  Token Type
                </Text>
                <Text className="font-semibold">
                  ERC-20
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
                  Network Fee
                </Text>
                <View className="flex-row items-center gap-1">
                  <MaterialIcons name="stars" size={14} color="#16a34a" />
                  <Text className="font-semibold text-green-600">
                    FREE (Sponsored)
                  </Text>
                </View>
              </View>
              <View className="border-t border-border pt-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold">
                    Total Cost
                  </Text>
                  <Text className="font-bold text-green-600">
                    {formatCurrency(calculateUSDValue())}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-sm text-muted-foreground">
                    + Network Fee
                  </Text>
                  <Text className="text-sm text-green-600">
                    FREE
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
            disabled={isLoading || !amount || !recipientAddress || !selectedToken}
          >
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="hourglass-empty" size={20} color="white" />
                <Text>Sending...</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="stars" size={20} color="white" />
                <Text>Send {selectedToken?.symbol || 'Token'} (FREE)</Text>
              </View>
            )}
          </Button>

          {/* Info about ERC-20 only */}
          {availableTokens.length === 0 && (
            <View className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <MaterialIcons name="info" size={16} color="#d97706" />
                <Text className="text-sm font-semibold text-yellow-700">
                  No ERC-20 Tokens Available
                </Text>
              </View>
              <Text className="text-xs text-yellow-600">
                Sponsored transactions currently only support ERC-20 tokens. Native tokens (ETH, MATIC, etc.) are not supported yet.
              </Text>
            </View>
          )}
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
                Select ERC-20 Token
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
                  <MaterialIcons name="info" size={32} color={colors.grey} />
                  <Text className="mt-2 text-center text-muted-foreground">
                    No ERC-20 tokens available
                  </Text>
                  <Text className="text-xs text-center text-muted-foreground mt-1">
                    Sponsored transactions only support ERC-20 tokens
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