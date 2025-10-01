import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView } from 'react-native';
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

  // When a transaction succeeds, refresh data, show button, and route back after 1s
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
          setTimeout(() => {
            clearActiveTransaction();
            router.replace('/(tabs)/dashboard');
          }, 5000);
        }
      })();
    }
    prevTxStatusRef.current = currentStatus || null;
  }, [activeTransaction?.status, clearActiveTransaction, fetchTransactionData]);

  const ProgressBar = () => (
    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <View
        className={`h-2 ${activeTransaction?.status === 'failed' ? 'bg-red-500' : 'bg-primary'}`}
        style={{ width: `${Math.min(Math.max(activeTransaction?.progress ?? (activeTransaction?.status === 'success' ? 100 : 10), 0), 100)}%` }}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <Button variant="secondary" onPress={() => router.back()} className="px-0">
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Button>
        <Text className="text-lg font-bold">Active Transaction</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-6">
          <View className="gap-3 rounded-xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold">Transaction</Text>
              <View className={`px-2 py-1 rounded-full ${activeTransaction.status === 'pending' ? 'bg-blue-100' : activeTransaction.status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                <Text className={`text-xs font-medium ${activeTransaction.status === 'pending' ? 'text-blue-600' : activeTransaction.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {activeTransaction.status?.toUpperCase()}
                </Text>
              </View>
            </View>

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">Operation</Text>
                <Text className="font-semibold">{activeTransaction.operation || '—'}</Text>
              </View>
              {!!activeTransaction.hash && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted-foreground">Hash</Text>
                  <Text className="text-xs text-primary break-all">{activeTransaction.hash}</Text>
                </View>
              )}
              {!!activeTransaction.step && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted-foreground">Step</Text>
                  <Text className="font-medium">{activeTransaction.step}</Text>
                </View>
              )}

              <View>
                <ProgressBar />
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-xs text-muted-foreground">Progress</Text>
                  <Text className="text-xs font-medium">{Math.round(activeTransaction.progress ?? (activeTransaction.status === 'success' ? 100 : 10))}%</Text>
                </View>
              </View>
            </View>

            {(activeTransaction.context && (activeTransaction.context.tokenAddress || activeTransaction.context.toAddress || activeTransaction.context.amount)) && (
              <View className="gap-2 pt-2 border-t border-border">
                <Text className="text-sm font-semibold">Details</Text>
                {!!activeTransaction.context.tokenAddress && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">Token</Text>
                    <Text className="text-xs break-all">{activeTransaction.context.tokenAddress}</Text>
                  </View>
                )}
                {!!activeTransaction.context.toAddress && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">To</Text>
                    <Text className="text-xs break-all">{activeTransaction.context.toAddress}</Text>
                  </View>
                )}
                {!!activeTransaction.context.amount && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">Amount</Text>
                    <Text className="text-sm font-medium">{activeTransaction.context.amount}</Text>
                  </View>
                )}
              </View>
            )}

            {(activeTransaction.logs && activeTransaction.logs.length > 0) && (
              <View className="gap-2 pt-2 border-t border-border">
                <Text className="text-sm font-semibold">Activity</Text>
                <View className="gap-1">
                  {activeTransaction.logs.slice(-8).map((log, idx) => (
                    <View key={`${log.at}-${idx}`} className="flex-row items-start justify-between">
                      <Text className="text-[10px] text-muted-foreground mr-2">{new Date(log.at).toLocaleTimeString()}</Text>
                      <Text className="text-xs flex-1 text-right">{log.message}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {isCompleted && (
            <View className="pt-2 mt-2 border-t border-border">
              <Button className="mt-2" onPress={() => {
                clearActiveTransaction();
                router.replace('/(tabs)/dashboard');
              }}>
                <Text>Return to Dashboard</Text>
              </Button>
            </View>
          )}

      </ScrollView>
    </SafeAreaView>
  );
}


