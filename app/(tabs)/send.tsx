import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { PREDEFINED_TOKENS, getTokenById } from '~/lib/tokens';

export default function SendScreen() {
  const { colors } = useColorScheme();
  const params = useLocalSearchParams();
  console.log('Send page params:', params);
  const defaultTokenId = (params.tokenId as string) || (params.token as string) || 'gold';
  console.log('Default token ID:', defaultTokenId);
  const defaultToken = PREDEFINED_TOKENS.find(t => t.id === defaultTokenId) || PREDEFINED_TOKENS[0];
  console.log('Default token:', defaultToken);
  
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
  
  const [selectedToken, setSelectedToken] = useState(() => {
    const tokenId = (params.tokenId as string) || (params.token as string) || 'gold';
    return PREDEFINED_TOKENS.find(t => t.id === tokenId) || PREDEFINED_TOKENS[0];
  });
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Update selected token whenever params change
  useEffect(() => {
    const tokenId = (params.tokenId as string) || (params.token as string) || 'gold';
    const newToken = PREDEFINED_TOKENS.find(t => t.id === tokenId) || PREDEFINED_TOKENS[0];
    setSelectedToken(newToken);
    // Reset form when token changes
    setAmount('');
    setRecipientAddress('');
  }, [params.tokenId, params.token]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const calculateUSDValue = () => {
    const numAmount = parseFloat(amount) || 0;
    return numAmount * selectedToken.price;
  };

  const handleSend = () => {
    if (!amount || !recipientAddress) {
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
            text: 'View Transaction',
            onPress: () => router.push('/(tabs)/transactions' as any)
          },
          {
            text: 'OK',
            onPress: () => handleBackNavigation()
          }
        ]
      );
    }, 2000);
  };

  const TokenSelector = ({ token }: { token: typeof PREDEFINED_TOKENS[0] }) => (
    <TouchableOpacity
      onPress={() => setSelectedToken(token)}
      className={`flex-row items-center gap-3 p-3 rounded-lg border ${
        selectedToken.id === token.id 
          ? 'border-primary bg-primary/10' 
          : 'border-border bg-background'
      }`}
    >
      <View 
        className="rounded-full p-2" 
        style={{ backgroundColor: token.color + '20' }}
      >
        <MaterialIcons 
          name={token.icon as any} 
          size={20} 
          color={token.color} 
        />
      </View>
      <View className="flex-1">
        <Text className="font-semibold">
          {token.name}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {formatCurrency(token.price)} per {token.symbol}
        </Text>
      </View>
      {selectedToken.id === token.id && (
        <MaterialIcons name="check-circle" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

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
              onPress={() => setShowTokenModal(true)}
              className="flex-row items-center justify-between p-4 border border-border rounded-lg bg-background"
            >
              <View className="flex-row items-center gap-3">
                <View 
                  className="rounded-full p-2" 
                  style={{ backgroundColor: selectedToken.color + '20' }}
                >
                  <MaterialIcons 
                    name={selectedToken.icon as any} 
                    size={20} 
                    color={selectedToken.color} 
                  />
                </View>
                <View>
                  <Text className="font-semibold">
                    {selectedToken.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {formatCurrency(selectedToken.price)} per {selectedToken.symbol}
                  </Text>
                </View>
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
                <View 
                  className="rounded-full p-2" 
                  style={{ backgroundColor: selectedToken.color + '20' }}
                >
                  <MaterialIcons 
                    name={selectedToken.icon as any} 
                    size={20} 
                    color={selectedToken.color} 
                  />
                </View>
                <View className="flex-1">
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder={`0.00 ${selectedToken.symbol}`}
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
                  {amount || '0'} {selectedToken.symbol}
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
                <Text className="font-semibold">
                  $0.50
                </Text>
              </View>
              <View className="border-t border-border pt-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold">
                    Total
                  </Text>
                  <Text className="font-bold">
                    {formatCurrency(calculateUSDValue() + 0.50)}
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
                <Text>Send {selectedToken.symbol}</Text>
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
              {PREDEFINED_TOKENS.map((token) => (
                <TouchableOpacity
                  key={token.id}
                  onPress={() => {
                    setSelectedToken(token);
                    setShowTokenModal(false);
                  }}
                  className={`flex-row items-center gap-3 p-4 rounded-lg border ${
                    selectedToken.id === token.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-background'
                  }`}
                >
                  <View 
                    className="rounded-full p-2" 
                    style={{ backgroundColor: token.color + '20' }}
                  >
                    <MaterialIcons 
                      name={token.icon as any} 
                      size={20} 
                      color={token.color} 
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold">
                      {token.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatCurrency(token.price)} per {token.symbol}
                    </Text>
                  </View>
                  {selectedToken.id === token.id && (
                    <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 