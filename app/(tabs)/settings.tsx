import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';

import { Button } from 'react-native-paper';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore } from '~/lib/stores/useGlobalStore';
import { approveAuthorizationWithTracking, revokeAuthorizationWithTracking } from '~/lib/services/sponsored-orchestrator';
import { removeWalletSecrets, loadWalletSecrets } from '~/lib/services/wallet-secure-store';

import { CustomModal } from '~/components/CustomModal';
import { Toast } from '~/components/Toast';
import { RecoveryPhraseModal } from '~/components/RecoveryPhraseModal';
import { ScreenWithImageBackground } from '~/components/ScreenWithImageBackground';
 

export default function SettingsScreen() {
  const { colors } = useColorScheme();
  const currentWallet = useGlobalStore((state) => state.currentWallet);
  const wallets = useGlobalStore((state) => state.wallets);
  const clearWallets = useGlobalStore((state) => state.clearWallets);
  const authorizationStatus = useGlobalStore((state) => state.authorizationStatus);
  const isWalletAuthorized = useGlobalStore((state) => state.isWalletAuthorized);
  const unofficialAuthorizationStatus = useGlobalStore((state) => state.unofficialAuthorizationStatus);
  const authorizationPending = useGlobalStore((state) => state.authorizationPending);
  const checkWalletAuthorization = useGlobalStore((state) => state.checkWalletAuthorization);
  const setUnofficialAuthorization = useGlobalStore((state) => state.setUnofficialAuthorization);
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
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentWallet?.address) {
      checkWalletAuthorization();
    }
  }, [currentWallet?.address, checkWalletAuthorization]);

  // Clear pending transaction hash when authorization status is reconciled
  useEffect(() => {
    if (!authorizationPending && !(unofficialAuthorizationStatus !== null && unofficialAuthorizationStatus !== isWalletAuthorized) && pendingTxHash) {
      setPendingTxHash(null);
    }
  }, [authorizationPending, unofficialAuthorizationStatus, isWalletAuthorized, pendingTxHash]);

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

  const handleRevokeAuthorization = () => {
    setModalConfig({
      title: 'Revoke Authorization',
      message: 'Are you sure you want to revoke your wallet authorization? This will prevent us from sponsoring your gas fees for future transactions.',
      type: 'warning',
      onConfirm: async () => {
        setShowModal(false); // Close modal immediately
        if (!currentWallet?.address) return;
        setIsRevoking(true);
        try {
          console.log('[Settings] Revoke pressed');
          const res = await revokeAuthorizationWithTracking(currentWallet.address);
          console.log('[Settings] Revoke result:', res);
          if (res.success && res.unofficial) {
            // Set unofficial status immediately
            setUnofficialAuthorization(false);
            setPendingTxHash(res.revokeTxHash);
          }
          setToastConfig({
            message: res.success ? 'Authorization revoked successfully' : 'Failed to revoke authorization',
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
        <Text className="text-lapis-lazuli">Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScreenWithImageBackground>
      <View className="flex-1 rounded-t-3xl bg-white p-6">
          <View className="gap-8">

          {/* Wallet Section */}
          <View className="gap-4">
            <Text className="text-xl font-bold text-lapis-lazuli/80 mb-2">
              Wallet
            </Text>
            
            {walletAddress ? (
              <View className="gap-4">
                {/* Wallet Info */}
                <View className="gap-2 pb-4">
                  <Text className="text-base font-semibold text-lapis-lazuli/80">
                    Wallet Address
                  </Text>
                  <Text 
                    className="text-lapis-lazuli font-bold font-mono" 
                    style={{ fontSize: 20, lineHeight: 28 }}
                    numberOfLines={2} 
                    adjustsFontSizeToFit
                  >
                    {walletAddress ? (() => {
                      const prefix = walletAddress.slice(0, 2); // 0x
                      const rest = walletAddress.slice(2);
                      const chunks: string[] = [];
                      for (let i = 0; i < rest.length; i += 10) {
                        chunks.push(rest.slice(i, i + 10));
                      }
                      const firstRow = `${prefix} ${chunks[0] || ''}${chunks[1] ? ' ' + chunks[1] : ''}`;
                      const secondRow = `   ${chunks[2] || ''}${chunks[3] ? ' ' + chunks[3] : ''}`;
                      return `${firstRow}\n${secondRow}`.trim();
                    })() : ''}
                  </Text>
                </View>

                {/* Wallet Actions */}
                <TouchableOpacity 
                  onPress={handleViewRecoveryPhrase}
                  className="rounded-xl bg-lapis-lazuli/10 p-6"
                  activeOpacity={0.7}
                >
                  <View className="items-center gap-3">
                    <MaterialIcons name="visibility" size={48} color="#225D7C" />
                    <Text 
                      className="text-lapis-lazuli/80 font-semibold text-center"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={{ fontSize: 16 }}
                    >
                      View Recovery Phrase
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-4">
                <Text className="text-center text-blue-green mb-2">
                  No wallet found. Create or import a wallet to get started.
                </Text>
                
                <View className="gap-3">
                  <Button 
                    mode="contained"
                    buttonColor="#225D7C"
                    onPress={handleCreateWallet}
                    style={{ width: '100%' }}
                    contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 8 }}
                  >
                    <Text className="text-white" numberOfLines={1} adjustsFontSizeToFit>Create New Wallet</Text>
                  </Button>
                  
                  <Button 
                    mode="contained"
                    buttonColor="#225D7C"
                    onPress={handleImportWallet}
                    style={{ width: '100%' }}
                    contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 8 }}
                  >
                    <Text className="text-white" numberOfLines={1} adjustsFontSizeToFit>Import Existing Wallet</Text>
                  </Button>
                </View>
              </View>
            )}
          </View>

          {/* Authorization Section */}
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-lapis-lazuli/80">Authorization</Text>
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
                  size={18} 
                  color={isRefreshing || isStoreLoading ? '#9CA3AF' : '#3499BC'} 
                />
                <Text className="text-sm text-blue-green font-medium">
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="gap-4">
              <View className={`gap-4 rounded-xl p-6 ${isStoreLoading ? 'bg-cambridge-blue/10' : ((unofficialAuthorizationStatus ?? isWalletAuthorized) ? 'bg-cambridge-blue/10' : 'bg-boston-red/10')}`}>
                <View className="items-center gap-2">
                  <MaterialIcons 
                    name={isStoreLoading ? 'sync' : ((unofficialAuthorizationStatus ?? isWalletAuthorized) ? 'check-circle' : 'cancel')} 
                    size={28} 
                    color={isStoreLoading ? '#9CA3AF' : ((unofficialAuthorizationStatus ?? isWalletAuthorized) ? '#7FAFA1' : '#FC7E7E')} 
                  />
                  <Text 
                    className={`font-semibold ${isStoreLoading ? 'text-gray-500' : ((unofficialAuthorizationStatus ?? isWalletAuthorized) ? 'text-cambridge-blue' : 'text-boston-red')}`}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{ fontSize: 20 }}
                  >
                    {isStoreLoading ? 'Loading...' : ((unofficialAuthorizationStatus ?? isWalletAuthorized) ? 'Authorized' : 'Not Authorized')}
                  </Text>
                  {(authorizationPending || pendingTxHash) && (
                    <View className="items-center gap-1">
                      <Text className="text-xs text-lapis-lazuli text-center">
                        Waiting for validator confirmation
                      </Text>
                      {pendingTxHash && (
                        <Text className="text-xs text-lapis-lazuli/60 text-center font-mono">
                          TX: {pendingTxHash.slice(0, 10)}...{pendingTxHash.slice(-8)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                <View className="gap-2">
                  <View className="flex-row items-start gap-2">
                    <Text className="text-xs text-lapis-lazuli/80 font-medium" style={{ width: 120 }}>
                      Delegated To:
                    </Text>
                    <Text className="text-xs text-lapis-lazuli flex-1" numberOfLines={2}>
                      {authorizationStatus?.delegatedTo || '—'}
                    </Text>
                  </View>
                  <View className="flex-row items-start gap-2">
                    <Text className="text-xs text-lapis-lazuli/80 font-medium" style={{ width: 120 }}>
                      Matches Target:
                    </Text>
                    <Text className="text-xs text-lapis-lazuli flex-1">
                      {authorizationStatus?.matchesTarget ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  <View className="flex-row items-start gap-2">
                    <Text className="text-xs text-lapis-lazuli/80 font-medium" style={{ width: 120 }}>
                      Contract:
                    </Text>
                    <Text className="text-xs text-lapis-lazuli flex-1 font-mono" numberOfLines={2}>
                      {orchestratorConfig.delegationAddress}
                    </Text>
                  </View>
                </View>
                
              </View>

            </View>
          </View>

          {/* Authorization Actions Section */}
          <View className="gap-2 rounded-xl px-6">
            {/* Authorize (only when not authorized) */}
            {!(unofficialAuthorizationStatus ?? isWalletAuthorized) && (
              <>
                <Text className="text-xs text-center text-lapis-lazuli">
                  Authorize your wallet to enable sponsored gas fees for transactions.
                </Text>
                <Button
                  mode="contained"
                  buttonColor={isAuthorizing || isStoreLoading ? "rgba(34, 93, 124, 0.1)" : "#225D7C"}
                  onPress={async () => {
                    if (!currentWallet?.address || isAuthorizing || isStoreLoading) return;
                    setIsAuthorizing(true);
                    try {
                      console.log('[Settings] Starting authorization...');
                      const res = await approveAuthorizationWithTracking(currentWallet.address);
                      if (res.success && res.unofficial) {
                        // Set unofficial status immediately
                        setUnofficialAuthorization(true);
                        setPendingTxHash(res.delegationTxHash);
                      }
                      setToastConfig({
                        message: res.success ? 'Authorization completed successfully' : 'Authorization failed',
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
                  style={{ 
                    width: '100%',
                    backgroundColor: isAuthorizing || isStoreLoading ? 'rgba(34, 93, 124, 0.1)' : '#225D7C',
                    opacity: 1
                  }}
                  contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 8 }}
                  theme={{
                    colors: {
                      primary: isAuthorizing || isStoreLoading ? 'rgba(34, 93, 124, 0.1)' : '#225D7C',
                      onPrimary: isAuthorizing || isStoreLoading ? '#225D7C' : '#FFFFFF',
                      surface: isAuthorizing || isStoreLoading ? 'rgba(34, 93, 124, 0.1)' : '#225D7C',
                      onSurface: isAuthorizing || isStoreLoading ? '#225D7C' : '#FFFFFF'
                    }
                  }}
                >
                  <Text className={`font-semibold`} style={{ fontSize: 18, color: isAuthorizing || isStoreLoading ? '#225D7C' : '#FFFFFF' }} numberOfLines={1} adjustsFontSizeToFit>{isAuthorizing ? 'Authorizing...' : 'Authorize Wallet'}</Text>
                </Button>
              </>
            )}
            
            {/* Revoke Authorization (only when authorized) */}
            {(unofficialAuthorizationStatus ?? isWalletAuthorized) && (
              <>
                <Text className="text-xs text-center text-lapis-lazuli">
                  This will revoke your wallet authorization and prevent us from sponsoring your gas fees for future transactions.
                </Text>
                <Button 
                  mode="contained"
                  buttonColor="rgba(252, 126, 126, 0.1)"
                  onPress={handleRevokeAuthorization}
                  disabled={isRevoking}
                  style={{ 
                    width: '100%',
                    backgroundColor: 'rgba(252, 126, 126, 0.1)',
                    opacity: isRevoking ? 0.5 : 1
                  }}
                  contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 8 }}
                  theme={{
                    colors: {
                      primary: 'rgba(252, 126, 126, 0.1)',
                      onPrimary: '#FC7E7E',
                      surface: 'rgba(252, 126, 126, 0.1)',
                      onSurface: '#FC7E7E'
                    }
                  }}
                >
                  <Text className="text-boston-red font-semibold" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 18 }}>{isRevoking ? 'Revoking...' : 'Revoke Authorization'}</Text>
                </Button>
              </>
            )}
          </View>

          {/* Active Chains Section - removed in XRBG branch */}

          {/* Delete Wallet Section - only show if wallet exists */}
          {walletAddress && (
            <View className="gap-4 mt-auto pt-4">
              <View className="gap-3 rounded-xl p-6">

               
                <Text className="text-xs text-center text-lapis-lazuli">
                  This will permanently delete your wallet address and private keys from this device. Make sure you have backed up your recovery phrase before proceeding.
                </Text>
                <Button 
                  mode="contained"
                  buttonColor="rgba(252, 126, 126, 0.1)"
                  onPress={handleDeleteWallet}
                  style={{ width: '100%' }}
                  contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 8 }}
                >
                  <Text className="text-boston-red font-semibold" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 18 }}>Delete Wallet</Text>
                </Button>
              </View>
            </View>
          )}

        
        </View>
        </View>

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
    </ScreenWithImageBackground>
  );
} 