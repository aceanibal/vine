import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { useState, useMemo } from 'react';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { useAllTransfers, useCurrentWallet, usePredefinedToken } from '~/lib/stores/useGlobalStore';
import { ScreenWithImageBackground } from '~/components/ScreenWithImageBackground';

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

  const formatTokenBalance = (balance: string, decimals: number) => {
    try {
      const balanceBigInt = BigInt(balance);
      const divisor = BigInt(10 ** decimals);
      const wholePart = balanceBigInt / divisor;
      const fractionalPart = balanceBigInt % divisor;
      
      if (fractionalPart === BigInt(0)) {
        return wholePart.toString();
      }
      
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      const trimmedFractional = fractionalStr.replace(/0+$/, '').substring(0, 4);
      
      return trimmedFractional ? `${wholePart}.${trimmedFractional}` : wholePart.toString();
    } catch (error) {
      return '0';
    }
  };


  const TransactionItem = ({ transfer }: { transfer: any }) => {
    const isReceive = transfer.to.toLowerCase() === currentWallet?.address?.toLowerCase();
    const direction = isReceive ? 'receive' : 'send';
    
    // Use actual timestamp if available, otherwise show block number
    const displayDate = transfer.timestamp ? 
      formatDateTime(new Date(transfer.timestamp).getTime()) : 
      { date: `Block #${transfer.blockNumber}`, time: '' };
    
    const formattedAmount = predefinedToken ? 
      formatTokenBalance(transfer.rawValue, predefinedToken.decimals) : 
      transfer.value.toString();

    return (
      <TouchableOpacity 
      className={`rounded-lg p-4 gap-3 ${
        direction === 'receive' ? 'bg-cambridge-blue/5' : 'bg-lapis-lazuli/5'
      }`}
              onPress={() => {
          console.log('Transaction pressed:', transfer.hash);
          // TODO: Navigate to transaction details screen
        }}
      >
        <View className="flex-row items-start justify-between">
          {/* Left side - transaction info */}
          <View className="flex-1 min-w-0 gap-1">
            <Text 
              className={'text-base font-semibold text-lapis-lazuli'}>
              {direction === 'receive' ? 'Received' : 'Sent'}
            </Text>
            
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-blue-green">
                {predefinedToken?.chainName}
              </Text>
              <Text className="text-sm text-blue-green">•</Text>
              <Text className="text-sm text-blue-green">
                {displayDate.date}{displayDate.time ? ` at ${displayDate.time}` : ''}
              </Text>
            </View>
            
            <Text className="text-sm text-blue-green">
              Block #{transfer.blockNumber}
            </Text>
          </View>
          
          {/* Right side - Amount */}
          <View className="items-end ml-3">
            <Text className="text-base font-semibold text-lapis-lazuli">
              {direction === 'receive' ? '+' : '-'}{formattedAmount} {predefinedToken?.symbol || ''}
            </Text>
          </View>
        </View>
        
        {/* Transaction hash (truncated) */}
        <View className="pt-3 border-t border-blue-green/20">
          <Text className=" text-lapis-lazuli/80">
            Hash: {transfer.hash}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ filter, label }: { filter: 'all' | 'send' | 'receive', label: string }) => (
    <TouchableOpacity
      onPress={() => setSelectedFilter(filter)}
      className={`px-4 py-2 rounded-full ${
        selectedFilter === filter
          ? 'bg-lapis-lazuli'
          : ''
      }`}
    >
      <Text className={`text-sm font-medium ${
        selectedFilter === filter ? 'text-white' : 'text-lapis-lazuli'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScreenWithImageBackground>
      <View className="flex-1 rounded-t-3xl bg-white">
        {/* Header with back button */}
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#225D7C" />
          </TouchableOpacity>
          <View className="w-6" />
          <View className="w-6" />
        </View>

        {/* Filters */}
        <View className="px-4 pb-4">
        {/* Filter Buttons */}
        <View className="flex-row gap-2">
          <FilterButton filter="all" label="All" />
          <FilterButton filter="receive" label="Received" />
          <FilterButton filter="send" label="Sent" />
        </View>
      </View>

      {/* Transaction List */}
      <View className="flex-1 p-4">
        <View className="gap-3">
          <Text className="text-base text-lapis-lazuli/80">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
          </Text>

          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transfer, index) => (
              <TransactionItem key={`${transfer.hash}-${index}`} transfer={transfer} />
            ))
          ) : (
            <View className="items-center justify-center py-12 gap-2">
              <MaterialIcons name="history" size={48} color="#7FAFA1" />
              <Text className="text-lg font-semibold text-lapis-lazuli/80">
                No transactions found
              </Text>
              <Text className="text-base text-blue-green text-center">
                Your transaction history will appear here
              </Text>
            </View>
          )}
        </View>
      </View>
      </View>
    </ScreenWithImageBackground>
  );
}
