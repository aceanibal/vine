import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore } from '~/lib/stores/useGlobalStore';

export default function ActiveTransactionScreen() {
  const { colors } = useColorScheme();
  const activeTransaction = useGlobalStore((s) => s.activeTransaction);
  const clearActiveTransaction = useGlobalStore((s) => s.clearActiveTransaction);
  const fetchTransactionData = useGlobalStore((s) => s.fetchTransactionData);

  const prevTxStatusRef = useRef<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // When a transaction succeeds, refresh data and show button
  useEffect(() => {
    const currentStatus = activeTransaction?.status;
    if (prevTxStatusRef.current !== 'success' && currentStatus === 'success') {
      (async () => {
        try {
          await fetchTransactionData();
        } catch (e) {
          console.error('Failed to refresh activity after success:', e);
        } finally {
          setIsCompleted(true);
        }
      })();
    }
    prevTxStatusRef.current = currentStatus || null;
  }, [activeTransaction?.status, fetchTransactionData]);

  const formatAddress = (address: string) => {
    if (!address) return '';
    const prefix = address.slice(0, 2); // 0x
    const rest = address.slice(2);
    const chunks: string[] = [];
    for (let i = 0; i < rest.length; i += 10) {
      chunks.push(rest.slice(i, i + 10));
    }
    const firstRow = `${prefix} ${chunks[0] || ''}${chunks[1] ? ' ' + chunks[1] : ''}`;
    const secondRow = `   ${chunks[2] || ''}${chunks[3] ? ' ' + chunks[3] : ''}`;
    return `${firstRow}\n${secondRow}`.trim();
  };

  const getStatusColor = () => {
    if (activeTransaction?.status === 'success') return '#16a34a';
    if (activeTransaction?.status === 'failed') return '#dc2626';
    return '#225D7C';
  };

  return (
    <SafeAreaView className="flex-1 bg-lapis-lazuli" edges={['top']}>
      <View className="flex-1 rounded-t-3xl bg-white mt-6">
        {/* Header with back/home buttons */}
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#225D7C" />
          </TouchableOpacity>
          <View className="w-6" />
          <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')}>
            <MaterialIcons name="home" size={24} color="#225D7C" />
          </TouchableOpacity>
        </View>
        
        <ScrollView className="flex-1 px-6">
          <View className="gap-4">
            {/* Activity Log - at top */}
            {activeTransaction.logs && activeTransaction.logs.length > 0 && (
              <View className="gap-2">
                <Text className="text-lg font-semibold text-lapis-lazuli">Activity Log</Text>
                <View className="gap-2">
                  {activeTransaction.logs.slice(-8).map((log, idx) => (
                    <View key={`${log.at}-${idx}`} className="gap-0.5">
                      <Text className="text-xs text-blue-green">{new Date(log.at).toLocaleTimeString()}</Text>
                      <Text className="text-sm text-lapis-lazuli">{log.message}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Status Section */}
            <View className="gap-1">
              <Text className="text-base font-semibold text-lapis-lazuli">Status</Text>
              <Text className="text-base font-medium" style={{ color: getStatusColor() }}>
                {activeTransaction.status?.toUpperCase()}
              </Text>
            </View>

            {/* Operation */}
            {activeTransaction.operation && (
              <View className="gap-1">
                <Text className="text-base font-semibold text-lapis-lazuli">Operation</Text>
                <Text className="text-base text-blue-green">{activeTransaction.operation}</Text>
              </View>
            )}

            {/* Step */}
            {activeTransaction.step && (
              <View className="gap-1">
                <Text className="text-base font-semibold text-lapis-lazuli">Current Step</Text>
                <Text className="text-base text-blue-green">{activeTransaction.step}</Text>
              </View>
            )}

            {/* Transaction Hash */}
            {activeTransaction.hash && (
              <View className="gap-1">
                <Text className="text-base font-semibold text-lapis-lazuli">Transaction Hash</Text>
                <Text 
                  className="text-lapis-lazuli font-mono" 
                  style={{ fontSize: 16, lineHeight: 22 }}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {formatAddress(activeTransaction.hash)}
                </Text>
              </View>
            )}

            {/* Amount */}
            {activeTransaction.context?.amount && (
              <View className="gap-1">
                <Text className="text-base font-semibold text-lapis-lazuli">Amount</Text>
                <Text className="text-lg font-medium text-lapis-lazuli">{activeTransaction.context.amount}</Text>
              </View>
            )}
            
            {/* Recipient Address */}
            {activeTransaction.context?.toAddress && (
              <View className="gap-1">
                <Text className="text-base font-semibold text-lapis-lazuli">Recipient Address</Text>
                <Text 
                  className="text-lapis-lazuli font-mono" 
                  style={{ fontSize: 16, lineHeight: 22 }}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {formatAddress(activeTransaction.context.toAddress)}
                </Text>
              </View>
            )}
            
            {/* Token Address */}
            {activeTransaction.context?.tokenAddress && (
              <View className="gap-1">
                <Text className="text-base font-semibold text-lapis-lazuli">Token Address</Text>
                <Text 
                  className="text-lapis-lazuli font-mono" 
                  style={{ fontSize: 16, lineHeight: 22 }}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {formatAddress(activeTransaction.context.tokenAddress)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Return Button - Fixed at bottom */}
        {isCompleted && (
          <View className="px-6 pb-4 bg-white">
            <Button className="bg-lapis-lazuli w-full" onPress={() => {
              clearActiveTransaction();
              router.replace('/(tabs)/dashboard');
            }}>
              <Text className="text-white">Return to Dashboard</Text>
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}


