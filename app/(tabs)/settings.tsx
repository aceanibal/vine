import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore, useActiveChains, useIsActiveChainsLoaded } from '~/lib/stores/useGlobalStore';
import { dataManager } from '~/lib/dataManager';

import { CustomModal } from '~/components/CustomModal';
import { Toast } from '~/components/Toast';
import { RecoveryPhraseModal } from '~/components/RecoveryPhraseModal';
import * as LocalAuthentication from 'expo-local-authentication';

export default function SettingsScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useGlobalStore((state) => state.currentWallet);
  const clearWallets = useGlobalStore((state) => state.clearWallets);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const [isLoadingChains, setIsLoadingChains] = useState(false);

  // Get active chains from global store
  const activeChains = useActiveChains();
  const isActiveChainsLoaded = useIsActiveChainsLoaded();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setWalletAddress(currentWallet?.address || null);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshActiveChains = async () => {
    if (!currentWallet?.address) return;
    
    try {
      setIsLoadingChains(true);
      console.log('Settings: Refreshing wallet data...');
      
      // Use data manager to refresh wallet data (includes active chains and transactions)
      await dataManager.initializeWalletData(currentWallet.address);
      
      // Get updated active chains from global store
      const activeChains = useGlobalStore.getState().activeChains;
      console.log(`Settings: Found ${activeChains.length} active chains`);
      
      setToastConfig({
        message: `Found ${activeChains.length} active chains`,
        type: 'success'
      });
      setShowToast(true);
    } catch (error) {
      console.error('Settings: Failed to refresh active chains:', error);
      setToastConfig({
        message: 'Failed to refresh active chains',
        type: 'error'
      });
      setShowToast(true);
    } finally {
      setIsLoadingChains(false);
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
      title: 'Delete Wallet',
      message: 'Are you sure you want to delete your wallet? This will remove all your wallet data. This action cannot be undone.',
      type: 'warning',
      onConfirm: async () => {
        try {
          // Delete wallet data
          clearWallets();
          
          setWalletAddress(null);
          
          setToastConfig({
            message: 'Your wallet has been deleted successfully.',
            type: 'success'
          });
          setShowToast(true);
          // Navigate back to welcome screen
          router.replace('/');
        } catch (error) {
          console.error('Failed to delete wallet:', error);
          setToastConfig({
            message: 'Failed to delete wallet.',
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
      console.log('Wallet data loaded:', !!currentWallet);
      if (!currentWallet) {
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
          setRecoveryMnemonic(currentWallet.mnemonic || '');
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
        setRecoveryMnemonic(currentWallet.mnemonic || '');
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
        <View className="w-6" />
        <Text className="text-lg font-bold">
          Settings
        </Text>
        <View className="w-6" />
      </View>
      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
        <View className="gap-6">

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
              Wallet Security
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="security" size={20} color={colors.primary} />
                <Text>Private keys encrypted</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="backup" size={20} color={colors.primary} />
                <Text>Recovery phrase available</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="lock" size={20} color={colors.primary} />
                <Text>Secure storage enabled</Text>
              </View>
            </View>
          </View>

          {/* Active Chains Section */}
          {walletAddress && (
            <View className="gap-4 rounded-xl border border-border bg-card p-6">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold">
                  Active Chains
                </Text>
                <TouchableOpacity 
                  onPress={refreshActiveChains}
                  disabled={isLoadingChains}
                  className="flex-row items-center gap-1"
                >
                  <MaterialIcons 
                    name="refresh" 
                    size={16} 
                    color={isLoadingChains ? colors.grey : colors.primary} 
                  />
                  <Text className="text-xs text-primary font-medium">
                    {isLoadingChains ? 'Loading...' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {activeChains.length > 0 ? (
                <View className="gap-3">
                  {activeChains.map((chain, index) => (
                    <View key={index} className="flex-row items-center justify-between p-3 border border-border rounded-lg bg-background">
                      <View className="flex-row items-center gap-3">
                        <View className="w-3 h-3 rounded-full bg-green-500" />
                        <View>
                          <Text className="font-semibold capitalize">
                            {chain.chain}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            Chain ID: {chain.chain_id}
                          </Text>
                          {chain.first_transaction && (
                            <Text className="text-xs text-muted-foreground">
                              First tx: {new Date(chain.first_transaction.block_timestamp).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs text-green-600 font-medium">
                          Active
                        </Text>
                        {chain.last_transaction && (
                          <Text className="text-xs text-muted-foreground">
                            Last: {new Date(chain.last_transaction.block_timestamp).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                  <Text className="text-xs text-muted-foreground text-center mt-2">
                    Tokens are automatically discovered from transaction history on these chains
                  </Text>
                </View>
              ) : (
                <View className="items-center justify-center py-6">
                  <MaterialIcons name="account-balance-wallet" size={32} color={colors.grey} />
                  <Text className="mt-2 text-center text-muted-foreground">
                    {isActiveChainsLoaded ? 'No active chains found' : 'Active chains not loaded yet'}
                  </Text>
                  <Text className="text-xs text-center text-muted-foreground mt-1">
                    {isActiveChainsLoaded 
                      ? 'This wallet has no transaction history on any supported chains'
                      : 'Active chains are loaded when you create or import a wallet'
                    }
                  </Text>
                  <Text className="text-xs text-center text-muted-foreground mt-1">
                    Use the "Refresh" button to check for active chains
                  </Text>
                </View>
              )}
            </View>
          )}


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