import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { WalletStorage } from '~/lib/walletStorage';

export default function SettingsScreen() {
  const { colors } = useColorScheme();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const address = await WalletStorage.getWalletAddress();
      setWalletAddress(address);
    } catch (error) {
      console.error('Failed to load wallet:', error);
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
    Alert.alert(
      'Delete Wallet',
      'Are you sure you want to delete your wallet? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await WalletStorage.deleteWallet();
              setWalletAddress(null);
              Alert.alert('Wallet Deleted', 'Your wallet has been deleted successfully.');
            } catch (error) {
              console.error('Failed to delete wallet:', error);
              Alert.alert('Error', 'Failed to delete wallet.');
            }
          }
        }
      ]
    );
  };

  const handleViewRecoveryPhrase = async () => {
    try {
      const walletData = await WalletStorage.loadWallet();
      if (!walletData) {
        Alert.alert('Error', 'No wallet data found.');
        return;
      }

      Alert.alert(
        'Recovery Phrase',
        `Your 12-word recovery phrase:\n\n${walletData.mnemonic}\n\n⚠️ Keep this phrase safe and never share it with anyone.`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Failed to load recovery phrase:', error);
      Alert.alert('Error', 'Failed to load recovery phrase.');
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
    <SafeAreaView className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <View className="gap-6">
          {/* Wallet Section */}
          <View className="gap-4">
            <Text variant="title2" className="font-bold">
              Wallet
            </Text>
            
            {walletAddress ? (
              <View className="gap-4 rounded-xl border border-border bg-card p-6">
                {/* Wallet Info */}
                <View className="gap-4">
                  <View className="flex-row items-center gap-3">
                    <View className="rounded-full bg-primary p-3">
                      <MaterialIcons name="account-balance-wallet" size={24} color="white" />
                    </View>
                    <View>
                      <Text variant="title3" className="font-bold">
                        Vine Wallet
                      </Text>
                      <Text variant="caption1" className="text-muted-foreground">
                        {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                      </Text>
                    </View>
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
                    variant="destructive" 
                    className="flex-row items-center justify-start gap-3"
                    onPress={handleDeleteWallet}
                  >
                    <MaterialIcons name="delete" size={20} color={colors.destructive} />
                    <Text>Delete Wallet</Text>
                  </Button>
                </View>
              </View>
            ) : (
              <View className="gap-4 rounded-xl border border-border bg-card p-6">
                <View className="gap-3">
                  <Text variant="body" className="text-center text-muted-foreground">
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
              </View>
            )}
          </View>

          {/* Security Section */}
          <View className="gap-4">
            <Text variant="title2" className="font-bold">
              Security
            </Text>
            
            <View className="gap-4 rounded-xl border border-border bg-card p-6">
              <View className="gap-3">
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="security" size={20} color={colors.primary} />
                  <Text variant="body">Wallet stored securely</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="backup" size={20} color={colors.primary} />
                  <Text variant="body">Recovery phrase backed up</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="lock" size={20} color={colors.primary} />
                  <Text variant="body">Encrypted storage</Text>
                </View>
              </View>
            </View>
          </View>

          {/* App Info Section */}
          <View className="gap-4">
            <Text variant="title2" className="font-bold">
              App Info
            </Text>
            
            <View className="gap-4 rounded-xl border border-border bg-card p-6">
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text variant="body">Version</Text>
                  <Text variant="body" className="text-muted-foreground">1.0.0</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text variant="body">Build</Text>
                  <Text variant="body" className="text-muted-foreground">1</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 