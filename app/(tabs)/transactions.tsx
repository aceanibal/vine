import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';

import { Text } from '~/components/nativewindui/Text';
import { TokenIcon, getTokenIconProps } from '~/components/TokenIcon';
import { useColorScheme } from '~/lib/useColorScheme';
import { useAllTransfers, useCurrentWallet, usePredefinedToken } from '~/lib/stores/useGlobalStore';

export default function TransactionsScreen() {
  const { colors } = useColorScheme();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'send' | 'receive'>('all');

  // Get all transfers from global store
  const allTransfers = useAllTransfers();
  const currentWallet = useCurrentWallet();
  const predefinedToken = usePredefinedToken();

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = allTransfers;

    // Apply direction filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(transfer => {
        const isReceive = transfer.to.toLowerCase() === currentWallet?.address?.toLowerCase();
        const isSend = transfer.from.toLowerCase() === currentWallet?.address?.toLowerCase();
        const direction = isReceive ? 'receive' : 'send';
        return direction === selectedFilter;
      });
    }

    // Sort by block number (newest first)
    return filtered.sort((a, b) => b.blockNumber - a.blockNumber);
  }, [allTransfers, selectedFilter, currentWallet]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatTokenAmount = (value: string, decimals: number = 18) => {
    try {
      const balance = parseFloat(value) / Math.pow(10, decimals);
      return balance.toFixed(6).replace(/\.?0+$/, '');
    } catch {
      return '0';
    }
  };

  const getTransactionIcon = (direction: string, status: string) => {
    if (status === 'failed') {
      return { name: 'error', color: '#EF4444' };
    }
    if (status === 'pending') {
      return { name: 'hourglass-empty', color: '#F59E0B' };
    }
    if (direction === 'receive') {
      return { name: 'arrow-downward', color: '#10B981' };
    }
    return { name: 'arrow-upward', color: '#EF4444' };
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const TransactionItem = ({ transfer }: { transfer: any }) => {
    const isReceive = transfer.to.toLowerCase() === currentWallet?.address?.toLowerCase();
    const isSend = transfer.from.toLowerCase() === currentWallet?.address?.toLowerCase();
    const direction = isReceive ? 'receive' : 'send';
    
    // Use actual timestamp if available, otherwise show block number
    const displayDate = transfer.timestamp ? 
      formatDateTime(new Date(transfer.timestamp).getTime()) : 
      { date: `Block #${transfer.blockNumber}`, time: '' };
    const icon = getTransactionIcon(direction, 'confirmed');
    const formattedAmount = predefinedToken ? 
      formatTokenAmount(transfer.rawValue, predefinedToken.decimals) : 
      transfer.value.toString();

    return (
      <TouchableOpacity 
        className="rounded-lg border border-border bg-background p-4 mb-3"
        onPress={() => {
          console.log('Transaction pressed:', transfer.hash);
          // TODO: Navigate to transaction details screen
        }}
      >
        <View className="flex-row items-start justify-between">
          {/* Left side - Icon and transaction info */}
          <View className="flex-row items-start flex-1">
            <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
              direction === 'receive' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <MaterialIcons 
                name={icon.name as any} 
                size={24} 
                color={icon.color} 
              />
            </View>
            
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="font-semibold text-foreground">
                  {direction === 'receive' ? 'Received' : 'Sent'} {predefinedToken?.symbol || 'Token'}
                </Text>
                <View className={`px-2 py-1 rounded-full ${getStatusBadgeStyle('confirmed')}`}>
                  <Text className="text-xs font-medium capitalize">
                    confirmed
                  </Text>
                </View>
              </View>
              
              <Text className="text-sm text-muted-foreground mb-1">
                {direction === 'receive' ? 'Received' : 'Sent'} {predefinedToken?.symbol || 'tokens'}
              </Text>
              
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-xs text-muted-foreground">
                  POLYGON
                </Text>
                <Text className="text-xs text-muted-foreground">•</Text>
                <Text className="text-xs text-muted-foreground">
                  {displayDate.date}{displayDate.time ? ` at ${displayDate.time}` : ''}
                </Text>
              </View>
              
              <Text className="text-xs text-muted-foreground">
                Block #{transfer.blockNumber}
              </Text>
            </View>
          </View>
          
          {/* Right side - Amount and value */}
          <View className="items-end ml-3">
            <Text className={`font-semibold ${
              direction === 'receive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {direction === 'receive' ? '+' : '-'}{formattedAmount} {predefinedToken?.symbol || ''}
            </Text>
          </View>
        </View>
        
        {/* Transaction hash (truncated) */}
        <View className="mt-3 pt-3 border-t border-border/50">
          <Text className="text-xs text-muted-foreground">
            Hash: {transfer.hash.slice(0, 10)}...{transfer.hash.slice(-8)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ filter, label }: { filter: 'all' | 'send' | 'receive', label: string }) => (
    <TouchableOpacity
      onPress={() => setSelectedFilter(filter)}
      className={`px-4 py-2 rounded-full border ${
        selectedFilter === filter
          ? 'bg-primary border-primary'
          : 'bg-background border-border'
      }`}
    >
      <Text className={`text-sm font-medium ${
        selectedFilter === filter ? 'text-primary-foreground' : 'text-foreground'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-lg font-bold">
          All Transactions
        </Text>
        <View className="w-10" />
      </View>

      {/* Filters */}
      <View className="p-4 bg-white border-b border-border">
        {/* Filter Buttons */}
        <View className="flex-row gap-2">
          <FilterButton filter="all" label="All" />
          <FilterButton filter="receive" label="Received" />
          <FilterButton filter="send" label="Sent" />
        </View>
      </View>

      {/* Transaction List */}
      <ScrollView className="flex-1 p-4">
        <View className="mb-4">
          <Text className="text-sm text-muted-foreground mb-2">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transfer, index) => (
            <TransactionItem key={`${transfer.hash}-${index}`} transfer={transfer} />
          ))
        ) : (
          <View className="items-center justify-center py-12">
            <MaterialIcons name="history" size={48} color={colors.grey} />
            <Text className="mt-4 text-lg font-semibold text-muted-foreground">
              No transactions found
            </Text>
            <Text className="text-sm text-muted-foreground text-center mt-2">
              Your transaction history will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
