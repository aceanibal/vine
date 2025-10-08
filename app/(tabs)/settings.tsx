import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore } from '~/lib/stores/useGlobalStore';
import { approveAuthorizationWithTracking, revokeAuthorizationWithTracking } from '~/lib/services/sponsored-orchestrator';
import { removeWalletSecrets, loadWalletSecrets } from '~/lib/services/wallet-secure-store';

import { CustomModal } from '~/components/CustomModal';
import { Toast } from '~/components/Toast';
import { RecoveryPhraseModal } from '~/components/RecoveryPhraseModal';
 

export default function SettingsScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useGlobalStore((state) => state.currentWallet);
  const wallets = useGlobalStore((state) => state.wallets);
  const clearWallets = useGlobalStore((state) => state.clearWallets);
  const authorizationStatus = useGlobalStore((state) => state.authorizationStatus);
  const isWalletAuthorized = useGlobalStore((state) => state.isWalletAuthorized);
  const checkWalletAuthorization = useGlobalStore((state) => state.checkWalletAuthorization);
  const orchestratorConfig = useGlobalStore((state) => state.orchestratorConfig);
  const isStoreLoading = useGlobalStore((state) => state.appState.isLoading);  
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      setWalletAddress(currentWallet?.address || null);
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
      title: 'Delete Wallet',
      message: 'Are you sure you want to delete your wallet? This will remove all your wallet data. This action cannot be undone.',
      type: 'warning',
      onConfirm: async () => {
        try {
          // Remove secrets for all stored wallets
          const addresses = wallets.map(w => w.address).filter(Boolean);
          await Promise.all(addresses.map(addr => removeWalletSecrets(addr)));
          // Delete wallet data from store
          clearWallets();    
          setWalletAddress(null);
          console.log('Wallet deleted');
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
      if (!currentWallet || !currentWallet.address) {
        setToastConfig({
          message: 'No wallet data found.',
          type: 'error'
        });
        setShowToast(true);
        return;
      }
      // Load and show recovery phrase without biometric requirement
      const { mnemonic } = await loadWalletSecrets(currentWallet.address);
      if (!mnemonic) {
        setToastConfig({
          message: 'Recovery phrase not available.',
          type: 'error'
        });
        setShowToast(true);
        return;
      }
      setRecoveryMnemonic(mnemonic);
      setShowRecoveryModal(true);
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
      <View className="flex-row items-center justify-between px-2 py-4 border-b border-border bg-white">
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
                <View className="gap-2">
                  <Text className="font-bold">
                    XRBG Gold Wallet
                  </Text>
                  <Text className="text-xs text-muted-foreground break-all">
                    {walletAddress}
                  </Text>
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

          {/* Authorization Section */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold">Authorization</Text>
              <TouchableOpacity 
                onPress={async () => {
                  if (!currentWallet?.address) return;
                  setIsRefreshing(true);
                  try {
                    console.log('[Settings] Refreshing authorization status...');
                    await checkWalletAuthorization();
                    console.log('[Settings] Authorization status updated');
                    setToastConfig({
                      message: 'Authorization status refreshed',
                      type: 'success',
                    });
                    setShowToast(true);
                  } catch (e) {
                    console.error('[Settings] Failed to refresh authorization:', e);
                    setToastConfig({
                      message: 'Failed to refresh authorization status',
                      type: 'error',
                    });
                    setShowToast(true);
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing || isStoreLoading}
                className="flex-row items-center gap-1"
              >
                <MaterialIcons 
                  name="refresh" 
                  size={16} 
                  color={isRefreshing || isStoreLoading ? colors.grey : colors.primary} 
                />
                <Text className="text-xs text-primary font-medium">
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text>Status</Text>
                <Text className={isStoreLoading ? 'text-muted-foreground' : (isWalletAuthorized ? 'text-green-600' : 'text-red-600')}>
                  {isStoreLoading ? '(loading)' : (isWalletAuthorized ? 'Authorized' : 'Not Authorized')}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-muted-foreground">
                  Delegated To: {authorizationStatus?.delegatedTo || '—'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Matches Target: {authorizationStatus?.matchesTarget ? 'Yes' : 'No'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Delegation Contract: {orchestratorConfig.delegationAddress}
                </Text>
              </View>
              {/* Authorize (only when not authorized) */}
              {!isWalletAuthorized && (
                <Button
                  className="flex-row items-center justify-start gap-3"
                  onPress={async () => {
                    if (!currentWallet?.address) return;
                    setIsAuthorizing(true);
                    try {
                      console.log('[Settings] Starting authorization...');
                      const res = await approveAuthorizationWithTracking(currentWallet.address);
                      // Use single source of truth to update status
                      await checkWalletAuthorization();
                      setToastConfig({
                        message: res.success ? 'Authorization successful' : 'Authorization failed',
                        type: res.success ? 'success' : 'error',
                      });
                      setShowToast(true);
                    } catch (e: any) {
                      console.error('[Settings] Authorization error:', e);
                      setToastConfig({ message: e?.message || 'Authorization failed', type: 'error' });
                      setShowToast(true);
                    } finally {
                      setIsAuthorizing(false);
                    }
                  }}
                  disabled={isAuthorizing || isStoreLoading}
                >
                  <MaterialIcons name="check-circle" size={20} color="white" />
                  <Text>{isAuthorizing ? 'Authorizing...' : 'Authorize Wallet'}</Text>
                </Button>
              )}
              {/* Revoke Authorization moved below details (only when authorized) */}
              {isWalletAuthorized && (
                <Button
                  variant="secondary"
                  className="flex-row items-center justify-start gap-3"
                  onPress={async () => {
                    if (!currentWallet?.address) return;
                    setIsRevoking(true);
                    try {
                      console.log('[Settings] Revoke pressed');
                      const res = await revokeAuthorizationWithTracking(currentWallet.address);
                      console.log('[Settings] Revoke result:', res);
                      // Use single source of truth to update status
                      await checkWalletAuthorization();
                      setToastConfig({
                        message: res.success ? `Authorization revoked${res.revokeTxHash ? ` (tx: ${res.revokeTxHash.slice(0,10)}...${res.revokeTxHash.slice(-8)})` : ''}` : 'Failed to revoke authorization',
                        type: res.success ? 'success' : 'error',
                      });
                      setShowToast(true);
                    } catch (e: any) {
                      console.log('[Settings] Revoke error:', e);
                      setToastConfig({ message: e?.message || 'Revocation failed', type: 'error' });
                      setShowToast(true);
                    } finally {
                      setIsRevoking(false);
                    }
                  }}
                  disabled={isRevoking}
                >
                  <MaterialIcons name="block" size={20} color={colors.primary} />
                  <Text className="text-primary">{isRevoking ? 'Revoking...' : 'Revoke Authorization'}</Text>
                </Button>
              )}
              

              
            </View>
          </View>

          {/* Active Chains Section - removed in XRBG branch */}


          {/* App Info Section */}
          <View className="gap-4 rounded-xl border border-border bg-card p-6">
            <Text className="font-semibold">
              App Info
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text>Version</Text>
                <Text className="text-muted-foreground">1.0.1</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text>Build</Text>
                <Text className="text-muted-foreground">2</Text>
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