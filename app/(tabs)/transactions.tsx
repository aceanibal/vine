import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity, Alert, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Button } from '~/components/nativewindui/Button';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { MOCK_TRANSACTIONS, getTransactionIcon, getTransactionColor, getTransactionTitle, formatTimeAgo } from '~/lib/transactions';
import { getTokenById } from '~/lib/tokens';

export default function TransactionsScreen() {
  const { colors } = useColorScheme();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'send' | 'receive' | 'swap' | 'stake'>('all');

  const filteredTransactions = selectedFilter === 'all' 
    ? MOCK_TRANSACTIONS 
    : MOCK_TRANSACTIONS.filter(tx => tx.type === selectedFilter);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderTransaction = (transaction: typeof MOCK_TRANSACTIONS[0]) => {
    const token = getTokenById(transaction.tokenId);
    const icon = getTransactionIcon(transaction.type);
    const color = getTransactionColor(transaction.type);
    const title = getTransactionTitle(transaction.type);

    return (
      <TouchableOpacity 
        key={transaction.id}
        className="flex-row items-center justify-between rounded-lg border border-border bg-background p-4 mb-3"
        onPress={() => {
          // TODO: Navigate to transaction details
          console.log('Transaction details:', transaction);
        }}
      >
        <View className="flex-row items-center gap-3 flex-1">
          <View 
            className="rounded-full p-2" 
            style={{ backgroundColor: color + '20' }}
          >
            <MaterialIcons 
              name={icon as any} 
              size={20} 
              color={color} 
            />
          </View>
          <View className="flex-1">
            <Text className="font-semibold">
              {title} {token?.symbol}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {formatTimeAgo(transaction.timestamp)}
            </Text>
            {transaction.sender && (
              <Text className="text-xs text-muted-foreground">
                From: {formatAddress(transaction.sender)}
              </Text>
            )}
            {transaction.recipient && (
              <Text className="text-xs text-muted-foreground">
                To: {formatAddress(transaction.recipient)}
              </Text>
            )}
          </View>
        </View>
        <View className="items-end">
          <Text className="font-semibold">
            {transaction.amount.toFixed(2)} {token?.symbol}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {formatCurrency(transaction.value)}
          </Text>
          <View className="flex-row items-center gap-1 mt-1">
            <View 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: transaction.status === 'completed' ? '#4CAF50' : transaction.status === 'pending' ? '#FF9800' : '#F44336' }}
            />
            <Text className="text-xs text-muted-foreground capitalize">
              {transaction.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ filter, label }: { filter: typeof selectedFilter, label: string }) => (
    <TouchableOpacity
      onPress={() => setSelectedFilter(filter)}
      className={`px-4 py-2 rounded-full border ${
        selectedFilter === filter 
          ? 'bg-primary border-primary' 
          : 'bg-background border-border'
      }`}
    >
      <Text 
        className={`text-xs font-medium ${
          selectedFilter === filter ? 'text-white' : 'text-foreground'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="font-bold">
          Transactions
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
        <View className="gap-6">
          {/* Filter Buttons */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            <FilterButton filter="all" label="All" />
            <FilterButton filter="receive" label="Received" />
            <FilterButton filter="send" label="Sent" />
            <FilterButton filter="swap" label="Swapped" />
            <FilterButton filter="stake" label="Staked" />
          </ScrollView>

          {/* Transactions List */}
          <View>
            <Text className="font-semibold mb-4">
              {filteredTransactions.length} Transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </Text>
            
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map(renderTransaction)
            ) : (
              <View className="flex-row items-center justify-center py-12">
                <MaterialIcons name="receipt" size={32} color={colors.grey} />
                <Text className="ml-3 text-muted-foreground">
                  No transactions found
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 