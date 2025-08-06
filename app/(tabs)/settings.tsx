import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { WalletStorage } from '~/lib/walletStorage';
import { ProfileStorage, UserProfile } from '~/lib/profileStorage';
import { ProfileCollectionModal } from '~/components/ProfileCollectionModal';
import { CustomModal } from '~/components/CustomModal';
import { Toast } from '~/components/Toast';
import { RecoveryPhraseModal } from '~/components/RecoveryPhraseModal';
import * as LocalAuthentication from 'expo-local-authentication';

export default function SettingsScreen() {
  const { colors } = useColorScheme();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalType, setProfileModalType] = useState<'buy' | 'sell'>('buy');
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
    onConfirm: () => {}
  });
  const [showToast, setShowToast] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryMnemonic, setRecoveryMnemonic] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [address, userProfile] = await Promise.all([
        WalletStorage.getWalletAddress(),
        ProfileStorage.getProfile()
      ]);
      setWalletAddress(address);
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWallet = () => {
    router.push('/(auth)/create-wallet' as any);
  };

  const handleImportWallet = () => {
    router.push('/(auth)/import-wallet' as any);
  };

  const handleDeleteWallet = () => {
    setModalConfig({
      title: 'Delete Wallet & Profile',
      message: 'Are you sure you want to delete your wallet and profile? This will remove all your wallet data and profile information. This action cannot be undone.',
      type: 'warning',
      onConfirm: async () => {
        try {
          // Delete wallet and clear profile data
          await Promise.all([
            WalletStorage.deleteWallet(),
            ProfileStorage.clearProfile()
          ]);
          
          setWalletAddress(null);
          setProfile(null);
          
          setToastConfig({
            message: 'Your wallet and profile have been deleted successfully.',
            type: 'success'
          });
          setShowToast(true);
          // Navigate back to welcome screen
          router.replace('/');
        } catch (error) {
          console.error('Failed to delete wallet and profile:', error);
          setToastConfig({
            message: 'Failed to delete wallet and profile.',
            type: 'error'
          });
          setShowToast(true);
        }
      }
    });
    setShowModal(true);
  };

  const handleViewRecoveryPhrase = async () => {
    console.log('View recovery phrase button pressed');
    try {
      const walletData = await WalletStorage.loadWallet();
      console.log('Wallet data loaded:', !!walletData);
      if (!walletData) {
        setToastConfig({
          message: 'No wallet data found.',
          type: 'error'
        });
        setShowToast(true);
        return;
      }

      // Check if biometric authentication is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('Biometric check:', { hasHardware, isEnrolled });

      if (!hasHardware || !isEnrolled) {
        console.log('Biometric not available');
        
        // For simulator testing - bypass biometric check
        if (__DEV__) {
          console.log('Development mode - bypassing biometric for simulator');
          setRecoveryMnemonic(walletData.mnemonic);
          setShowRecoveryModal(true);
          return;
        }
        
        setToastConfig({
          message: 'Biometric authentication is required to view recovery phrase.',
          type: 'error'
        });
        setShowToast(true);
        return;
      }

      console.log('Requesting biometric authentication');
      // Request biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to view recovery phrase',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });

      console.log('Biometric result:', result);
      if (result.success) {
        console.log('Authentication successful, showing recovery modal');
        // Show recovery phrase in bottom modal
        setRecoveryMnemonic(walletData.mnemonic);
        setShowRecoveryModal(true);
      } else {
        console.log('Authentication failed');
        setToastConfig({
          message: 'Authentication failed.',
          type: 'error'
        });
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to load recovery phrase:', error);
      setToastConfig({
        message: 'Failed to load recovery phrase.',
        type: 'error'
      });
      setShowToast(true);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <View style={{ width: 24 }} />
        <Text className="text-lg font-bold">
          Settings
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
        <View className="gap-6">

          {/* Profile Section */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="text-lg font-semibold">
              Profile
            </Text>
            
            {walletAddress ? (
              <View className="gap-4">
                {/* Profile Info */}
                <View className="flex-row items-center gap-4">
                  <View className="rounded-full bg-primary p-4">
                    <MaterialIcons name="person" size={32} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold">
                      Vine User
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Member since 2024
                    </Text>
                  </View>
                </View>

                {/* Profile Actions */}
                <View className="gap-3">
                  <Button 
                    variant="secondary" 
                    className="flex-row items-center justify-start gap-3"
                    onPress={() => router.push('/(tabs)/account-details' as any)}
                  >
                    <MaterialIcons name="account-circle" size={20} color={colors.primary} />
                    <Text>View Account Details</Text>
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    className="flex-row items-center justify-start gap-3"
                    onPress={() => {
                      setProfileModalType('buy');
                      setShowProfileModal(true);
                    }}
                  >
                    <MaterialIcons name="edit" size={20} color={colors.primary} />
                    <Text>Edit Buy Info</Text>
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    className="flex-row items-center justify-start gap-3"
                    onPress={() => {
                      setProfileModalType('sell');
                      setShowProfileModal(true);
                    }}
                  >
                    <MaterialIcons name="edit" size={20} color={colors.primary} />
                    <Text>Edit Bank Details</Text>
                  </Button>
                </View>
              </View>
            ) : (
              <View className="gap-3">
                <Text className="text-center text-base text-muted-foreground">
                  Create a wallet to set up your profile.
                </Text>
              </View>
            )}

            {/* Profile Status */}
            {profile && (
              <View className="mt-4 p-3 bg-gray-50 rounded-lg">
                <Text className="text-xs font-medium mb-2">Profile Status</Text>
                <View className="gap-1">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons 
                      name={profile.country && profile.mobileMoneyNumber ? "check-circle" : "info"} 
                      size={16} 
                      color={profile.country && profile.mobileMoneyNumber ? colors.primary : colors.grey} 
                    />
                    <Text className="text-xs text-muted-foreground">
                      Buy Info: {profile.country && profile.mobileMoneyNumber ? 'Complete' : 'Incomplete'}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons 
                      name={profile.country && profile.bankName && profile.branchName && profile.swiftCode && profile.accountNumber ? "check-circle" : "info"} 
                      size={16} 
                      color={profile.country && profile.bankName && profile.branchName && profile.swiftCode && profile.accountNumber ? colors.primary : colors.grey} 
                    />
                    <Text className="text-xs text-muted-foreground">
                      Bank Details: {profile.country && profile.bankName && profile.branchName && profile.swiftCode && profile.accountNumber ? 'Complete' : 'Incomplete'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Wallet Section */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Wallet
            </Text>
            
            {walletAddress ? (
              <View className="gap-4">
                {/* Wallet Info */}
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-primary p-3">
                    <MaterialIcons name="account-balance-wallet" size={24} color="white" />
                  </View>
                  <View>
                    <Text className="font-bold">
                      Vine Wallet
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                    </Text>
                  </View>
                </View>

                {/* Wallet Actions */}
                <View className="gap-3">
                  <Button 
                    variant="secondary" 
                    className="flex-row items-center justify-start gap-3"
                    onPress={handleViewRecoveryPhrase}
                  >
                    <MaterialIcons name="visibility" size={20} color={colors.primary} />
                    <Text>View Recovery Phrase</Text>
                  </Button>
                  

                  
                  <Button 
                    variant="secondary"
                    className="flex-row items-center justify-start gap-3 border-red-500"
                    onPress={handleDeleteWallet}
                  >
                    <MaterialIcons name="delete" size={20} color={colors.destructive} />
                    <Text className="text-red-500">Delete Wallet</Text>
                  </Button>
                </View>
              </View>
            ) : (
              <View className="gap-3">
                <Text className="text-center text-muted-foreground">
                  No wallet found. Create or import a wallet to get started.
                </Text>
                
                <View className="gap-3">
                  <Button 
                    className="flex-row items-center justify-center gap-3"
                    onPress={handleCreateWallet}
                  >
                    <MaterialIcons name="add-circle" size={20} color="white" />
                    <Text>Create New Wallet</Text>
                  </Button>
                  
                  <Button 
                    variant="secondary"
                    className="flex-row items-center justify-center gap-3"
                    onPress={handleImportWallet}
                  >
                    <MaterialIcons name="file-download" size={20} color={colors.primary} />
                    <Text>Import Existing Wallet</Text>
                  </Button>
                </View>
              </View>
            )}
          </View>

          {/* Security Section */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              Security
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="security" size={20} color={colors.primary} />
                <Text>Wallet stored securely</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="backup" size={20} color={colors.primary} />
                <Text>Recovery phrase backed up</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="lock" size={20} color={colors.primary} />
                <Text>Encrypted storage</Text>
              </View>
            </View>
          </View>

          {/* App Info Section */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              App Info
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text>Version</Text>
                <Text className="text-muted-foreground">1.0.0</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text>Build</Text>
                <Text className="text-muted-foreground">1</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Profile Collection Modal */}
      <ProfileCollectionModal
        visible={showProfileModal}
        type={profileModalType}
        onClose={() => setShowProfileModal(false)}
        onComplete={() => {
          setShowProfileModal(false);
          loadData(); // Reload profile data
        }}
      />

      {/* Custom Modal */}
      <CustomModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        showCancel={modalConfig.type === 'warning'}
      />

      {/* Recovery Phrase Modal */}
      <RecoveryPhraseModal
        visible={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
        mnemonic={recoveryMnemonic}
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