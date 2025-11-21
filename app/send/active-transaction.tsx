import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Button } from 'react-native-paper';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useGlobalStore } from '~/lib/stores/useGlobalStore';
import { ScreenWithImageBackground } from '~/components/ScreenWithImageBackground';

export default function ActiveTransactionScreen() {
  const { colors } = useColorScheme();
  const activeTransaction = useGlobalStore((s) => s.activeTransaction);
  const clearActiveTransaction = useGlobalStore((s) => s.clearActiveTransaction);

  const [isCompleted, setIsCompleted] = useState(false);

  // Check if transaction is completed
  useEffect(() => {
    const currentStatus = activeTransaction?.status;
    if (currentStatus === 'success') {
      setIsCompleted(true);
    }
  }, [activeTransaction?.status]);

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
    if (activeTransaction?.status === 'success') return '#7FAFA1'; // cambridge-blue
    if (activeTransaction?.status === 'failed') return '#FC7E7E'; // boston-red
    return '#D9A848'; // hunyadi-yellow for pending
  };

  const getStatusIcon = () => {
    if (activeTransaction?.status === 'success') return 'check-circle';
    if (activeTransaction?.status === 'failed') return 'error';
    return 'hourglass-empty'; // pending
  };

  return (
    <ScreenWithImageBackground showScrollView={false}>
      <View className="flex-1 rounded-t-3xl bg-white mt-3">
        
        <View className="flex-1 px-6 mt-3">
          <View className="gap-4">
            {/* Status Section - at top */}
            <View className="gap-2">
              <Text className="text-base font-semibold text-lapis-lazuli/80">Status</Text>
              <View className="flex-row items-center rounded-xl bg-lapis-lazuli/10 p-4 gap-3">
                <MaterialIcons 
                  name={getStatusIcon() as any} 
                  size={24} 
                  color={getStatusColor()} 
                />
                <Text className="text-lg font-bold" style={{ color: getStatusColor() }}>
                  {activeTransaction.status?.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Details Section */}
            <View className="gap-1">
              <Text className="text-base font-semibold text-lapis-lazuli/80">Details</Text>
              <View className="gap-1">
                {activeTransaction?.operation && (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-lapis-lazuli/80">Operation:</Text>
                    <Text className="text-sm text-lapis-lazuli flex-1 text-right">{activeTransaction.operation}</Text>
                  </View>
                )}
                {activeTransaction?.step && (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-lapis-lazuli/80">Step:</Text>
                    <Text className="text-sm text-lapis-lazuli flex-1 text-right">{activeTransaction.step}</Text>
                  </View>
                )}
                {activeTransaction?.context?.amount && (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-lapis-lazuli/80">Amount:</Text>
                    <Text className="text-sm text-lapis-lazuli flex-1 text-right">{activeTransaction.context.amount}</Text>
                  </View>
                )}
                {activeTransaction?.context?.toAddress && (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-lapis-lazuli/80">Recipient:</Text>
                    <Text className="text-sm text-lapis-lazuli flex-1 text-right font-mono">{formatAddress(activeTransaction.context.toAddress)}</Text>
                  </View>
                )}
                {!activeTransaction && (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-lapis-lazuli/80">Status:</Text>
                    <Text className="text-sm text-lapis-lazuli flex-1 text-right">No active transaction</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Activity Log */}
            {activeTransaction.logs && activeTransaction.logs.length > 0 && (
              <View className="gap-3 rounded-xl bg-lapis-lazuli/10 p-4">
                <Text className="text-lg font-semibold text-lapis-lazuli/80">Activity Log</Text>
                <View className="gap-2">
                  {activeTransaction.logs.slice(-6).map((log, idx) => (
                    <View key={`${log.at}-${idx}`} className="flex-row items-start gap-2">
                      <View className="w-2 h-2 rounded-full bg-lapis-lazuli mt-2 flex-shrink-0" />
                      <View className="flex-1">
                        <Text className="text-xs text-blue-green">{new Date(log.at).toLocaleTimeString()}</Text>
                        <Text className="text-sm text-lapis-lazuli/80">{log.message}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Transaction Hash */}
            {activeTransaction.hash && (
              <View className="gap-2 rounded-xl bg-lapis-lazuli/10 p-4">
                <Text className="text-base font-semibold text-lapis-lazuli/80">Transaction Hash</Text>
                <Text 
                  className="text-lapis-lazuli font-mono" 
                  style={{ fontSize: 14, lineHeight: 20 }}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {formatAddress(activeTransaction.hash)}
                </Text>
              </View>
            )}

            
          </View>
        </View>

        {/* Return Button - Fixed at bottom */}
        <View className="px-4 pb-4 bg-white">
          <Button 
            mode="contained"
            onPress={() => {
              if (isCompleted) {
                clearActiveTransaction();
                router.replace('/(tabs)/dashboard');
              }
            }}
            disabled={!isCompleted}
            buttonColor="#225D7C"
            style={{ 
              backgroundColor: '#225D7C',
              paddingVertical: 8,
              opacity: isCompleted ? 1 : 0.5
            }}
            labelStyle={{ 
              fontSize: 16,
              color: '#FFFFFF'
            }}
            theme={{
              colors: {
                primary: '#225D7C',
                onPrimary: '#FFFFFF',
                surface: '#225D7C',
                onSurface: '#FFFFFF'
              }
            }}
          >
            Return to Dashboard
          </Button>
        </View>
      </View>
    </ScreenWithImageBackground>
  );
}


