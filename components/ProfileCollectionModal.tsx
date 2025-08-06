import React, { useState } from 'react';
import { View, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { ProfileStorage, UserProfile } from '~/lib/profileStorage';

interface ProfileCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  type: 'buy' | 'sell' | 'alert';
  alertConfig?: {
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onConfirm?: () => void;
    showCancel?: boolean;
    cancelText?: string;
    confirmText?: string;
  };
}

export function ProfileCollectionModal({ 
  visible, 
  onClose, 
  onComplete, 
  type,
  alertConfig
}: ProfileCollectionModalProps) {
  const { colors } = useColorScheme();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await ProfileStorage.saveProfile(formData);
      Alert.alert('Success', 'Profile information saved successfully!');
      onComplete();
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save profile information.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    if (type === 'buy') {
      return formData.country && formData.mobileMoneyNumber;
    } else if (type === 'sell') {
      return formData.country && formData.bankName && formData.branchName && 
             formData.swiftCode && formData.accountNumber;
    }
    return true;
  };

  const renderBuyForm = () => (
    <View className="gap-4">
      <Text variant="body" className="text-center text-muted-foreground mb-4">
        Please provide your information to complete the purchase
      </Text>
      
      <View className="gap-3">
        <View>
          <Text variant="caption1" className="font-medium mb-1">Country</Text>
          <TextInput
            className="border border-border rounded-lg p-3 bg-background"
            placeholder="Enter your country"
            value={formData.country}
            onChangeText={(text) => setFormData(prev => ({ ...prev, country: text }))}
          />
        </View>
        
        <View>
          <Text variant="caption1" className="font-medium mb-1">Mobile Money Number</Text>
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
  );

  const renderSellForm = () => (
    <View className="gap-4">
      <Text variant="body" className="text-center text-muted-foreground mb-4">
        Please provide your bank details to receive payment
      </Text>
      
      <View className="gap-3">
        <View>
          <Text variant="caption1" className="font-medium mb-1">Country</Text>
          <TextInput
            className="border border-border rounded-lg p-3 bg-background"
            placeholder="Enter your country"
            value={formData.country}
            onChangeText={(text) => setFormData(prev => ({ ...prev, country: text }))}
          />
        </View>
        
        <View>
          <Text variant="caption1" className="font-medium mb-1">Bank Name</Text>
          <TextInput
            className="border border-border rounded-lg p-3 bg-background"
            placeholder="Enter your bank name"
            value={formData.bankName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, bankName: text }))}
          />
        </View>
        
        <View>
          <Text variant="caption1" className="font-medium mb-1">Branch Name/Code</Text>
          <TextInput
            className="border border-border rounded-lg p-3 bg-background"
            placeholder="Enter branch name or code"
            value={formData.branchName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, branchName: text }))}
          />
        </View>
        
        <View>
          <Text variant="caption1" className="font-medium mb-1">SWIFT Code</Text>
          <TextInput
            className="border border-border rounded-lg p-3 bg-background"
            placeholder="Enter SWIFT code"
            value={formData.swiftCode}
            onChangeText={(text) => setFormData(prev => ({ ...prev, swiftCode: text }))}
            autoCapitalize="characters"
          />
        </View>
        
        <View>
          <Text variant="caption1" className="font-medium mb-1">Account Number</Text>
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
  );

  const renderAlertContent = () => {
    if (!alertConfig) return null;

    const getIconAndColor = () => {
      switch (alertConfig.type) {
        case 'success':
          return { icon: 'check-circle', color: '#10B981', bgColor: '#D1FAE5' };
        case 'error':
          return { icon: 'error', color: '#EF4444', bgColor: '#FEE2E2' };
        case 'warning':
          return { icon: 'warning', color: '#F59E0B', bgColor: '#FEF3C7' };
        default:
          return { icon: 'info', color: '#3B82F6', bgColor: '#DBEAFE' };
      }
    };

    const { icon, color, bgColor } = getIconAndColor();

    return (
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-border bg-background">
          <View className="flex-row items-center gap-3">
            <View 
              className="rounded-full p-2"
              style={{ backgroundColor: bgColor }}
            >
              <MaterialIcons name={icon as any} size={24} color={color} />
            </View>
            <Text variant="title2" className="font-bold">
              {alertConfig.title}
            </Text>
          </View>
          <Button
            variant="ghost"
            onPress={onClose}
            className="p-2"
          >
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </Button>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4" contentContainerClassName="pb-8">
          <Text variant="body" className="text-muted-foreground">
            {alertConfig.message}
          </Text>
        </ScrollView>

        {/* Footer */}
        <View className="p-4 border-t border-border bg-background">
          <View className="gap-3">
            {alertConfig.showCancel && (
              <Button
                variant="secondary"
                onPress={onClose}
                className="flex-1"
              >
                <Text>{alertConfig.cancelText || 'Cancel'}</Text>
              </Button>
            )}
            <Button
              onPress={() => {
                if (alertConfig.onConfirm) {
                  alertConfig.onConfirm();
                }
                onClose();
              }}
              className="flex-1"
              style={{ backgroundColor: color }}
            >
              <Text>{alertConfig.confirmText || 'OK'}</Text>
            </Button>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      {type === 'alert' ? (
        renderAlertContent()
      ) : (
        <View className="flex-1 bg-background">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-border bg-background">
            <Text variant="title2" className="font-bold">
              {type === 'buy' ? 'Complete Purchase' : 'Bank Details'}
            </Text>
            <Button
              variant="ghost"
              onPress={onClose}
              className="p-2"
            >
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Button>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 p-4" contentContainerClassName="pb-8">
            {type === 'buy' ? renderBuyForm() : renderSellForm()}
          </ScrollView>

          {/* Footer */}
          <View className="p-4 border-t border-border bg-background">
            <View className="gap-3">
              <Button
                onPress={handleSave}
                disabled={!isFormValid() || isLoading}
                className="flex-row items-center justify-center gap-2"
              >
                {isLoading ? (
                  <MaterialIcons name="hourglass-empty" size={20} color="white" />
                ) : (
                  <MaterialIcons name="save" size={20} color="white" />
                )}
                <Text>
                  {isLoading ? 'Saving...' : 'Save & Continue'}
                </Text>
              </Button>
              
              <Button
                variant="secondary"
                onPress={onClose}
                disabled={isLoading}
              >
                <Text>Cancel</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
} 