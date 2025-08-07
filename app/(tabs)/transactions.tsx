import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';


import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { getTransactionIcon, getTransactionColor, getTransactionTitle, formatTimeAgo, Transaction } from '~/lib/transactions';
import { getTokenById } from '~/lib/tokens';
import { transactionManager } from '~/lib/transactionManager';

export default function TransactionsScreen() {
  const { colors } = useColorScheme();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'send' | 'receive' | 'swap' | 'stake' | 'defi' | 'nft' | 'failed' | 'gas'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use transaction manager as single source of truth
  const filteredTransactions = transactionManager.getTransactionsByType(selectedFilter);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await transactionManager.refreshTransactions();
      console.log('Transactions refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const renderTransaction = (transaction: Transaction) => {
    const token = getTokenById(transaction.tokenId);
    const icon = getTransactionIcon(transaction.type);
    const color = getTransactionColor(transaction.type);
    const title = getTransactionTitle(transaction.type);

    // Use metadata for enhanced display information
    const displaySymbol = transaction.metadata?.tokenSymbol || token?.symbol || '';
    const description = transaction.metadata?.description || '';

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
              {title} {displaySymbol}
            </Text>
            {description && (
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {description}
              </Text>
            )}
            <Text className="text-xs text-muted-foreground">
              {formatTimeAgo(transaction.timestamp)}
            </Text>
            {transaction.sender && !transaction.isInternal && (
              <Text className="text-xs text-muted-foreground">
                From: {formatAddress(transaction.sender)}
              </Text>
            )}
            {transaction.recipient && !transaction.isInternal && (
              <Text className="text-xs text-muted-foreground">
                To: {formatAddress(transaction.recipient)}
              </Text>
            )}
            {transaction.errorReason && (
              <Text className="text-xs text-red-500">
                {transaction.errorReason}
              </Text>
            )}
          </View>
        </View>
        <View className="items-end">
          {transaction.type !== 'approve' && transaction.type !== 'contract_deployment' && (
            <Text className="font-semibold">
              {transaction.amount > 0 ? transaction.amount.toFixed(transaction.metadata?.tokenDecimals === 6 ? 2 : 4) : '0'} {displaySymbol}
            </Text>
          )}
          {transaction.value > 0 && (
            <Text className="text-xs text-muted-foreground">
              {formatCurrency(transaction.value)}
            </Text>
          )}
          {transaction.gasFee && (
            <Text className="text-xs text-muted-foreground">
              Gas: {transaction.gasFee.toFixed(6)} MATIC
            </Text>
          )}
          <View className="flex-row items-center gap-1 mt-1">
            <View 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: transaction.status === 'completed' ? '#4CAF50' 
                  : transaction.status === 'pending' ? '#FF9800' 
                  : transaction.status === 'failed' || transaction.status === 'reverted' ? '#F44336'
                  : '#757575'
              }}
            />
            <Text className="text-xs text-muted-foreground capitalize">
              {transaction.status}
            </Text>
          </View>
          {transaction.isInternal && (
            <Text className="text-xs text-blue-500">
              Internal
            </Text>
          )}
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
        <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing}>
          <MaterialIcons 
            name="refresh" 
            size={24} 
            color={isRefreshing ? colors.grey : colors.foreground} 
          />
        </TouchableOpacity>
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
            <FilterButton filter="gas" label="Gas Token" />
            <FilterButton filter="receive" label="Received" />
            <FilterButton filter="send" label="Sent" />
            <FilterButton filter="defi" label="DeFi" />
            <FilterButton filter="nft" label="NFTs" />
            <FilterButton filter="failed" label="Failed" />
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