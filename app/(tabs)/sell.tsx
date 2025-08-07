import React, { useState, useEffect } from 'react';
import { View, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { ProfileStorage, UserProfile } from '~/lib/profileStorage';
import { PREDEFINED_TOKENS } from '~/lib/tokens';
import { ProfileCollectionModal } from '~/components/ProfileCollectionModal';
import { CustomModal } from '~/components/CustomModal';
import { Toast } from '~/components/Toast';

interface SellFormData {
  quantity: string;
  country: string;
  bankName: string;
  branchName: string;
  swiftCode: string;
  accountNumber: string;
}

export default function SellScreen() {
  const { colors } = useColorScheme();
  const params = useLocalSearchParams();
  
  // Get the source screen to determine where to go back
  const source = params.source as string;
  
  const handleBackNavigation = () => {
    if (source === 'exchange') {
      router.push('/(tabs)/exchange' as any);
    } else {
      // Default fallback
      router.back();
    }
  };
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<SellFormData>({
    quantity: '',
    country: '',
    bankName: '',
    branchName: '',
    swiftCode: '',
    accountNumber: ''
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'sell' | 'alert'>('sell');
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
    onConfirm: () => {},
    showCancel: true,
    cancelText: 'Cancel',
    confirmText: 'OK'
  });

  // Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  // Mock exchange rate (in real app, this would come from API)
  const exchangeRate = 1.85; // USD to local currency
  const localCurrency = 'GHS'; // Ghanaian Cedi
  const goldPrice = 1950.50; // USD per ounce

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userProfile = await ProfileStorage.getProfile();
      setProfile(userProfile);
      if (userProfile) {
        setFormData(prev => ({
          ...prev,
          country: userProfile.country || '',
          bankName: userProfile.bankName || '',
          branchName: userProfile.branchName || '',
          swiftCode: userProfile.swiftCode || '',
          accountNumber: userProfile.accountNumber || ''
        }));
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const calculatePayout = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const totalValue = quantity * goldPrice;
    return totalValue * exchangeRate;
  };

  const handleSellGold = async () => {
    // Check if required profile info is missing
    const hasRequiredInfo = await ProfileStorage.hasRequiredSellInfo();
    if (!hasRequiredInfo) {
      setModalType('sell');
      setShowModal(true);
      return;
    }

    if (!formData.quantity || !formData.country || !formData.bankName || 
        !formData.branchName || !formData.swiftCode || !formData.accountNumber) {
      setModalConfig({
        title: 'Error',
        message: 'Please fill in all required fields.',
        type: 'error',
        onConfirm: () => {},
        showCancel: false,
        cancelText: 'Cancel',
        confirmText: 'OK'
      });
      setModalType('alert');
      setShowModal(true);
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Generate unique transaction ID
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const invoiceNo = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Step 2: Call payment API (mock)
      console.log('Calling POST /payment with:', {
        service: 'Bank',
        serviceType: 'Credit',
        channel: 'bankdirect',
        amount: calculatePayout(),
        senderMobile: profile?.mobileMoneyNumber || 'N/A',
        customer: `${formData.bankName} - ${formData.accountNumber}`,
        invoiceNo,
        signature: 'mock-signature'
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Show processing status
      setModalConfig({
        title: 'Processing Payment',
        message: 'Processing your payment...',
        type: 'info',
        onConfirm: () => {},
        showCancel: false,
        cancelText: 'Cancel',
        confirmText: 'OK'
      });
      setModalType('alert');
      setShowModal(true);

      // Simulate polling /status
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock result
      const isSuccess = Math.random() > 0.15; // 85% success rate
      
      if (isSuccess) {
        setModalConfig({
          title: 'Payment Successful!',
          message: `Transaction ID: ${transactionId}\nInvoice: ${invoiceNo}\nQuantity: ${formData.quantity} oz Gold\nPayout: ${calculatePayout().toFixed(2)} ${localCurrency}\n\nPayment will be processed to your bank account within 2-3 business days.`,
          type: 'success',
          onConfirm: () => handleBackNavigation(),
          showCancel: false,
          cancelText: 'Cancel',
          confirmText: 'OK'
        });
        setModalType('alert');
        setShowModal(true);
      } else {
        setModalConfig({
          title: 'Payment Failed',
          message: 'The transaction was not completed. Please try again.',
          type: 'error',
          onConfirm: () => handleBackNavigation(),
          showCancel: false,
          cancelText: 'Cancel',
          confirmText: 'OK'
        });
        setModalType('alert');
        setShowModal(true);
      }

    } catch (error) {
      console.error('Sell transaction failed:', error);
      setToastConfig({
        message: 'Transaction failed. Please try again.',
        type: 'error'
      });
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <Button
          variant="plain"
          onPress={handleBackNavigation}
          className="p-2"
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Button>
        <Text className="font-bold">
          Sell Gold
        </Text>
                  <View className="w-10" />
      </View>

      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
        <View className="gap-6">

          {/* Product Selection */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Product Details
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="rounded-full bg-yellow-500 p-3">
                <MaterialIcons name="monetization-on" size={24} color="white" />
              </View>
              <View>
                <Text className="font-bold">
                  Gold
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Digital Gold Token
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Current Price: ${goldPrice.toFixed(2)}/oz
                </Text>
              </View>
            </View>
          </View>

          {/* Transaction Form */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Transaction Details
            </Text>
            
            <View className="gap-4">
              <View>
                <Text className="text-xs font-medium mb-1">Quantity (oz)</Text>
                <TextInput
                  className="border border-border rounded-lg p-3 bg-background"
                  placeholder="Enter quantity in ounces"
                  value={formData.quantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                  keyboardType="numeric"
                />
              </View>

              <View>
                <Text className="text-xs font-medium mb-1">Country</Text>
                <TextInput
                  className="border border-border rounded-lg p-3 bg-background"
                  placeholder="Enter your country"
                  value={formData.country}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, country: text }))}
                />
              </View>
            </View>
          </View>

          {/* Bank Details */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Bank Details
            </Text>
            
            <View className="gap-4">
              <View>
                <Text className="text-xs font-medium mb-1">Bank Name</Text>
                <TextInput
                  className="border border-border rounded-lg p-3 bg-background"
                  placeholder="Enter your bank name"
                  value={formData.bankName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, bankName: text }))}
                />
              </View>

              <View>
                <Text className="text-xs font-medium mb-1">Branch Name/Code</Text>
                <TextInput
                  className="border border-border rounded-lg p-3 bg-background"
                  placeholder="Enter branch name or code"
                  value={formData.branchName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, branchName: text }))}
                />
              </View>

              <View>
                <Text className="text-xs font-medium mb-1">SWIFT Code</Text>
                <TextInput
                  className="border border-border rounded-lg p-3 bg-background"
                  placeholder="Enter SWIFT code"
                  value={formData.swiftCode}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, swiftCode: text }))}
                  autoCapitalize="characters"
                />
              </View>

              <View>
                <Text className="text-xs font-medium mb-1">Account Number</Text>
                <TextInput
                  className="border border-border rounded-lg p-3 bg-background"
                  placeholder="Enter account number"
                  value={formData.accountNumber}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, accountNumber: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Payout Summary */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Payout Summary
            </Text>
            
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text>Quantity (oz)</Text>
                <Text className="font-semibold">
                  {formData.quantity ? `${parseFloat(formData.quantity).toFixed(2)} oz` : '0.00 oz'}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text>Gold Price (USD)</Text>
                <Text className="text-muted-foreground">
                  ${goldPrice.toFixed(2)}/oz
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text>Total Value (USD)</Text>
                <Text className="font-semibold">
                  {formData.quantity ? `$${(parseFloat(formData.quantity) * goldPrice).toFixed(2)}` : '$0.00'}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text>Exchange Rate</Text>
                <Text className="text-muted-foreground">
                  1 USD = {exchangeRate} {localCurrency}
                </Text>
              </View>
              
              <View className="border-t border-border pt-3">
                <View className="flex-row justify-between">
                  <Text className="font-bold">Expected Payout ({localCurrency})</Text>
                  <Text className="font-bold">
                    {calculatePayout().toFixed(2)} {localCurrency}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Request Payment Button */}
          <Button
            onPress={handleSellGold}
            disabled={isLoading || !formData.quantity || !formData.country || !formData.bankName || 
                     !formData.branchName || !formData.swiftCode || !formData.accountNumber}
            className="flex-row items-center justify-center gap-2"
          >
            {isLoading ? (
              <MaterialIcons name="hourglass-empty" size={20} color="white" />
            ) : (
              <MaterialIcons name="account-balance" size={20} color="white" />
            )}
            <Text>
              {isLoading ? 'Processing...' : 'Request Payment'}
            </Text>
          </Button>
        </View>
      </ScrollView>

      {/* Profile Collection Modal */}
      <ProfileCollectionModal
        visible={showModal && modalType === 'sell'}
        onClose={() => setShowModal(false)}
        onComplete={() => setShowModal(false)}
        type={modalType}
        alertConfig={modalType === 'alert' ? modalConfig : undefined}
      />

      {/* Custom Modal */}
      <CustomModal
        visible={showModal && modalType === 'alert'}
        onClose={() => setShowModal(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        showCancel={modalConfig.type === 'info'}
      />

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
} 