import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { getData } from '../lib/getData';
import { useAllTokens } from '../lib/stores/useGlobalStore';
import { transactionStore } from '../lib/transactionStore';

export default function TransactionDataTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const tokens = useAllTokens();

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testWalletAddress = '0x1aeddD4fA751C41CCB5EDF7D8c93E8E2d9EC5851';

  const runTest = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      addResult('🚀 Starting transaction data test...');
      addResult(`📝 Testing with wallet: ${testWalletAddress}`);
      
      // Test the getData function
      addResult('⏳ Fetching wallet data...');
      await getData(testWalletAddress);
      
      // Get results from stores
      const allTransactions = transactionStore.getAllTransactions();
      const tokensData = tokens;
      
      addResult(`✅ Test completed successfully!`);
      addResult(`📊 Found ${allTransactions.length} total transactions`);
      addResult(`🪙 Discovered ${tokensData.length} tokens`);
      
      // Show token details
      tokensData.forEach((token, index) => {
        addResult(`Token ${index + 1}: ${token.symbol} (${token.chainName}) - Balance: ${token.formattedBalance} - Price: $${token.price?.toFixed(2) || 'N/A'}`);
      });
      
      // Show transaction summary by chain
      const transactionsByChain = allTransactions.reduce((acc, tx) => {
        acc[tx.chainId] = (acc[tx.chainId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(transactionsByChain).forEach(([chainId, count]) => {
        addResult(`Chain ${chainId}: ${count} transactions`);
      });
      
    } catch (error) {
      addResult(`❌ Test failed: ${error}`);
      addResult('💡 Make sure to set your Moralis API key in environment variables');
      addResult('💡 You can set it in a .env file: EXPO_PUBLIC_MORALIS_API_KEY=your_key_here');
      console.error('Transaction data test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const clearStores = () => {
    transactionStore.clearAllData();
    addResult('🗑️ Cleared all transaction data');
  };

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Transaction Data Test</Text>
      
      <View className="mb-4">
        <Text className="text-lg font-semibold mb-2">Test Wallet:</Text>
        <Text className="text-sm text-gray-600 font-mono">{testWalletAddress}</Text>
      </View>

      <View className="flex-row gap-2 mb-4">
        <TouchableOpacity
          onPress={runTest}
          disabled={isLoading}
          className={`flex-1 py-3 px-4 rounded-lg ${
            isLoading ? 'bg-gray-300' : 'bg-blue-500'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            {isLoading ? 'Testing...' : 'Run Test'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={clearResults}
          className="flex-1 py-3 px-4 rounded-lg bg-gray-500"
        >
          <Text className="text-white text-center font-semibold">Clear Results</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={clearStores}
          className="flex-1 py-3 px-4 rounded-lg bg-red-500"
        >
          <Text className="text-white text-center font-semibold">Clear Data</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 bg-gray-100 rounded-lg p-3">
        {testResults.length === 0 ? (
          <Text className="text-gray-500 text-center">No test results yet. Tap "Run Test" to start.</Text>
        ) : (
          testResults.map((result, index) => (
            <Text key={index} className="text-sm mb-1 font-mono">
              {result}
            </Text>
          ))
        )}
      </ScrollView>

      <View className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <Text className="text-sm text-yellow-800">
          <Text className="font-semibold">Note:</Text> Make sure to set your Moralis API key in the environment variables (EXPO_PUBLIC_MORALIS_API_KEY) before running the test.
        </Text>
      </View>
    </View>
  );
}
