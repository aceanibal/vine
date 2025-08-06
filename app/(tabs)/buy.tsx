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


interface BuyFormData {
  amount: string;
  country: string;
  mobileMoneyNumber: string;
}

export default function BuyScreen() {
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
  const [formData, setFormData] = useState<BuyFormData>({
    amount: '',
    country: '',
    mobileMoneyNumber: ''
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'buy' | 'alert'>('buy');
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
    onConfirm: () => {},
    showCancel: true,
    cancelText: 'Cancel',
    confirmText: 'OK'
  });

  // Mock exchange rate (in real app, this would come from API)
  const exchangeRate = 1.85; // USD to local currency
  const localCurrency = 'GHS'; // Ghanaian Cedi

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
          mobileMoneyNumber: userProfile.mobileMoneyNumber || ''
        }));
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const calculateLocalAmount = () => {
    const amount = parseFloat(formData.amount) || 0;
    return amount * exchangeRate;
  };

  const handleBuyGold = async () => {
    // Check if required profile info is missing
    const hasRequiredInfo = await ProfileStorage.hasRequiredBuyInfo();
    if (!hasRequiredInfo) {
      setModalType('buy');
      setShowModal(true);
      return;
    }

    if (!formData.amount || !formData.country || !formData.mobileMoneyNumber) {
      setAlertConfig({
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
      // Step 1: Generate unique invoice number
      const invoiceNo = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Step 2: Call collection API (mock)
      console.log('Calling POST /collect with:', {
        invoiceNo,
        amount: parseFloat(formData.amount),
        customer: formData.mobileMoneyNumber,
        country: formData.country,
        currency: localCurrency,
        signature: 'mock-signature'
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Check if OTP is required (mock)
      const requiresOTP = Math.random() > 0.5; // 50% chance
      
      if (requiresOTP) {
        // Show OTP modal
        setAlertConfig({
          title: 'OTP Required',
          message: 'Please enter the OTP sent to your mobile money number:',
          type: 'info',
          onConfirm: async () => {
            // TODO: Get OTP from input field
            const otp = '123456'; // Mock OTP for now
            if (otp) {
              await handleOTPValidation(invoiceNo, otp);
            }
          },
          showCancel: true,
          cancelText: 'Cancel',
          confirmText: 'Submit'
        });
        setModalType('alert');
        setShowModal(true);
      } else {
        // Proceed to waiting status
        await handlePaymentStatus(invoiceNo);
      }

    } catch (error) {
      console.error('Buy transaction failed:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Transaction failed. Please try again.',
        type: 'error',
        onConfirm: () => {},
        showCancel: false,
        confirmText: 'OK',
        cancelText: 'Cancel'
      });
      setModalType('alert');
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPValidation = async (invoiceNo: string, otp: string) => {
    try {
      console.log('Calling POST /collectauthorize with:', {
        invoiceNo,
        otp
      });

      // Simulate OTP validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await handlePaymentStatus(invoiceNo);
    } catch (error) {
      console.error('OTP validation failed:', error);
      setAlertConfig({
        title: 'Error',
        message: 'OTP validation failed. Please try again.',
        type: 'error',
        onConfirm: () => {},
        showCancel: false,
        confirmText: 'OK',
        cancelText: 'Cancel'
      });
      setModalType('alert');
      setShowModal(true);
    }
  };

  const handlePaymentStatus = async (invoiceNo: string) => {
    try {
      // Show waiting status
      setAlertConfig({
        title: 'Processing Payment',
        message: 'Waiting for confirmation...',
        type: 'info',
        onConfirm: () => {},
        showCancel: false,
        confirmText: 'OK',
        cancelText: 'Cancel'
      });
      setModalType('alert');
      setShowModal(true);

      // Simulate polling /collectstatus
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock result
      const isSuccess = Math.random() > 0.2; // 80% success rate
      
      if (isSuccess) {
        setAlertConfig({
          title: 'Payment Successful!',
          message: `Transaction ID: ${invoiceNo}\nAmount: ${formData.amount} USD\nLocal Amount: ${calculateLocalAmount().toFixed(2)} ${localCurrency}`,
          type: 'success',
          onConfirm: () => router.back(),
          showCancel: false,
          confirmText: 'OK',
          cancelText: 'Cancel'
        });
        setModalType('alert');
        setShowModal(true);
      } else {
        setAlertConfig({
          title: 'Payment Failed',
          message: 'The transaction was not completed. Please try again.',
          type: 'error',
          onConfirm: () => router.back(),
          showCancel: false,
          confirmText: 'OK',
          cancelText: 'Cancel'
        });
        setModalType('alert');
        setShowModal(true);
      }
    } catch (error) {
      console.error('Payment status check failed:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to check payment status.',
        type: 'error',
        onConfirm: () => {},
        showCancel: false,
        confirmText: 'OK',
        cancelText: 'Cancel'
      });
      setModalType('alert');
      setShowModal(true);
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
          Buy Gold
        </Text>
        <View style={{ width: 40 }} />
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
                <Text className="text-xs font-medium mb-1">Amount (USD)</Text>
                <TextInput
                  className="border border-border rounded-lg p-3 bg-background"
                  placeholder="Enter amount in USD"
                  value={formData.amount}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
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

              <View>
                <Text className="text-xs font-medium mb-1">Mobile Money Number</Text>
                <TextInput
                  className="border border-border rounded-lg p-3 bg-background"
                  placeholder="Enter your mobile money number"
                  value={formData.mobileMoneyNumber}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, mobileMoneyNumber: text }))}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* Exchange Rate & Total */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Payment Summary
            </Text>
            
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text>Amount (USD)</Text>
                <Text className="font-semibold">
                  {formData.amount ? `$${parseFloat(formData.amount).toFixed(2)}` : '$0.00'}
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
                  <Text className="font-bold">Total ({localCurrency})</Text>
                  <Text className="font-bold">
                    {calculateLocalAmount().toFixed(2)} {localCurrency}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Pay Button */}
          <Button
            onPress={handleBuyGold}
            disabled={isLoading || !formData.amount || !formData.country || !formData.mobileMoneyNumber}
            className="flex-row items-center justify-center gap-2"
          >
            {isLoading ? (
              <MaterialIcons name="hourglass-empty" size={20} color="white" />
            ) : (
              <MaterialIcons name="payment" size={20} color="white" />
            )}
            <Text>
              {isLoading ? 'Processing...' : 'Pay with Mobile Money'}
            </Text>
          </Button>
        </View>
      </ScrollView>

      {/* Profile Collection Modal */}
      <ProfileCollectionModal
        visible={showModal && modalType === 'buy'}
        onClose={() => setShowModal(false)}
        onComplete={() => setShowModal(false)}
        type={modalType}
        alertConfig={modalType === 'alert' ? alertConfig : undefined}
      />

      {/* Custom Modal */}
      <CustomModal
        visible={showModal && modalType === 'alert'}
        onClose={() => setShowModal(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        showCancel={alertConfig.type === 'info'}
      />
    </SafeAreaView>
  );
} 