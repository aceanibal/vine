# Blockchain Integration Guide

This guide shows how to integrate the new **ethers.js-based blockchain services** into your existing React Native app components. All blockchain operations now use **ethers.js v6.15.0** as the primary library with comprehensive error handling and user-friendly feedback.

## 🚀 Quick Start

### 1. Initialize the Blockchain Service

Add this to your app's main layout or index file:

```typescript
// app/_layout.tsx or app/index.tsx
import { blockchainService } from '~/lib/blockchainService';
import { BlockchainErrorHandler } from '~/lib/blockchainErrorHandler';

export default function RootLayout() {
  useEffect(() => {
    // Initialize blockchain service
    const initBlockchain = async () => {
      try {
        // Start with Sepolia testnet for development
        await blockchainService.initialize('sepolia'); 
        console.log('Blockchain service initialized');
      } catch (error) {
        console.error('Failed to initialize blockchain:', error);
      }
    };

    initBlockchain();
  }, []);

  // Set up error handling callbacks
  useEffect(() => {
    // Set up custom modal callback (replace with your modal component)
    BlockchainErrorHandler.setErrorModalCallback((config) => {
      // Show your custom modal component
      console.log('Show error modal:', config);
      // Example: setErrorModal(config);
    });

    // Set up toast callback (replace with your toast component) 
    BlockchainErrorHandler.setToastCallback((message, type) => {
      // Show your toast notification
      console.log(`Toast (${type}):`, message);
      // Example: showToast(message, type);
    });
  }, []);

  return (
    // Your app content
  );
}
```

## 💸 Sending Transactions

### Native Currency (ETH, MATIC, etc.)

```typescript
// app/(tabs)/send.tsx
import React, { useState } from 'react';
import { transactionService, type Transaction } from '~/lib/transactionService';
import { BlockchainUtils } from '~/lib/blockchainUtils';

export default function SendScreen() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [currentTx, setCurrentTx] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    
    try {
      const transaction = await transactionService.sendTransaction(
        recipient,
        amount,
        undefined, // Auto gas estimation
        (tx) => {
          // Progress callback
          setCurrentTx(tx);
          console.log('Transaction progress:', tx.status, tx.confirmations);
        }
      );

      if (transaction) {
        console.log('Transaction sent:', transaction.hash);
      }
    } catch (error) {
      console.error('Send failed:', error);
      // Error is automatically handled by the error handler
    } finally {
      setIsLoading(false);
    }
  };

  const validateAddress = (address: string) => {
    return BlockchainUtils.Address.isValidAddress(address);
  };

  const formatAddress = (address: string) => {
    return BlockchainUtils.Address.formatAddressForDisplay(address);
  };

  return (
    <View>
      <TextInput
        value={recipient}
        onChangeText={setRecipient}
        placeholder="Recipient address"
      />
      {recipient && !validateAddress(recipient) && (
        <Text style={{ color: 'red' }}>Invalid address format</Text>
      )}
      
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount to send"
        keyboardType="numeric"
      />
      
      <Button
        title={isLoading ? 'Sending...' : 'Send'}
        onPress={handleSend}
        disabled={isLoading || !validateAddress(recipient) || !amount}
      />

      {currentTx && (
        <View>
          <Text>Status: {currentTx.status}</Text>
          <Text>Confirmations: {currentTx.confirmations}</Text>
          {currentTx.hash && (
            <Text>Hash: {formatAddress(currentTx.hash)}</Text>
          )}
        </View>
      )}
    </View>
  );
}
```

### ERC-20 Token Transfers

```typescript
// Token transfer example
const sendTokens = async () => {
  const tokenOptions = {
    tokenAddress: '0x...', // USDC contract address
    tokenSymbol: 'USDC',
    tokenDecimals: 6,
    amount: '100', // 100 USDC
    to: recipientAddress
  };

  const transaction = await transactionService.sendToken(
    tokenOptions,
    (tx) => console.log('Token transfer progress:', tx)
  );
};
```

## 📊 Reading Blockchain Data

### Get Balances

```typescript
// app/(tabs)/dashboard.tsx
import { blockchainService } from '~/lib/blockchainService';
import { BlockchainUtils } from '~/lib/blockchainUtils';

export default function DashboardScreen() {
  const [balance, setBalance] = useState('0');
  const [usdcBalance, setUsdcBalance] = useState('0');

  useEffect(() => {
    const loadBalances = async () => {
      try {
        // Get native currency balance
        const ethBalance = await blockchainService.getBalance();
        setBalance(BlockchainUtils.Amount.formatEther(ethBalance, 4));

        // Get USDC token balance  
        const tokenBalance = await blockchainService.getTokenBalance(
          '0xA0b86a33E6417c5E1bFc26c2FfbD6DD5Ed9B16C' // USDC address
        );
        setUsdcBalance(tokenBalance);
      } catch (error) {
        console.error('Failed to load balances:', error);
      }
    };

    loadBalances();
  }, []);

  return (
    <View>
      <Text>ETH Balance: {balance}</Text>
      <Text>USDC Balance: {usdcBalance}</Text>
    </View>
  );
}
```

## 🔗 Smart Contract Interactions

### Read Contract Data

```typescript
import { blockchainService } from '~/lib/blockchainService';
import { BlockchainUtils } from '~/lib/blockchainUtils';

// Read token information
const getTokenInfo = async (tokenAddress: string) => {
  try {
    const name = await blockchainService.callContract({
      contractAddress: tokenAddress,
      abi: BlockchainUtils.ABIS.ERC20,
      methodName: 'name'
    });

    const symbol = await blockchainService.callContract({
      contractAddress: tokenAddress,
      abi: BlockchainUtils.ABIS.ERC20,
      methodName: 'symbol'
    });

    const decimals = await blockchainService.callContract({
      contractAddress: tokenAddress,
      abi: BlockchainUtils.ABIS.ERC20,
      methodName: 'decimals'
    });

    return { name, symbol, decimals };
  } catch (error) {
    console.error('Failed to get token info:', error);
    return null;
  }
};
```

### Execute Contract Functions

```typescript
// Approve token spending
const approveToken = async (tokenAddress: string, spenderAddress: string, amount: string) => {
  try {
    const transaction = await transactionService.executeContract(
      tokenAddress,
      BlockchainUtils.ABIS.ERC20,
      'approve',
      [spenderAddress, BlockchainUtils.Amount.parseUnits(amount, 18)],
      undefined, // No ETH value
      undefined, // Auto gas estimation
      (tx) => console.log('Approval progress:', tx)
    );

    return transaction;
  } catch (error) {
    console.error('Approval failed:', error);
    return null;
  }
};
```

## ⛽ Gas Management

### Get Gas Price Recommendations

```typescript
import { transactionService } from '~/lib/transactionService';

const GasPriceSelector = () => {
  const [gasPrices, setGasPrices] = useState(null);

  useEffect(() => {
    const loadGasPrices = async () => {
      const prices = await transactionService.getGasPriceRecommendations();
      setGasPrices(prices);
    };

    loadGasPrices();
  }, []);

  if (!gasPrices) return <Text>Loading gas prices...</Text>;

  return (
    <View>
      <Text>Slow: {BlockchainUtils.Gas.formatGasPrice(gasPrices.slow.gasPrice || '0')} Gwei</Text>
      <Text>Standard: {BlockchainUtils.Gas.formatGasPrice(gasPrices.standard.gasPrice || '0')} Gwei</Text>
      <Text>Fast: {BlockchainUtils.Gas.formatGasPrice(gasPrices.fast.gasPrice || '0')} Gwei</Text>
    </View>
  );
};
```

## 🔄 Network Management

### Switch Networks

```typescript
import { blockchainService } from '~/lib/blockchainService';

const NetworkSwitcher = () => {
  const [currentNetwork, setCurrentNetwork] = useState('');

  useEffect(() => {
    const network = blockchainService.getCurrentNetwork();
    setCurrentNetwork(network.name);
  }, []);

  const switchToMainnet = async () => {
    try {
      await blockchainService.switchNetwork('ethereum');
      setCurrentNetwork('Ethereum');
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const switchToTestnet = async () => {
    try {
      await blockchainService.switchNetwork('sepolia');
      setCurrentNetwork('Sepolia');
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  return (
    <View>
      <Text>Current Network: {currentNetwork}</Text>
      <Button title="Switch to Mainnet" onPress={switchToMainnet} />
      <Button title="Switch to Testnet" onPress={switchToTestnet} />
    </View>
  );
};
```

## 📱 Transaction Monitoring

### Real-time Transaction Updates

```typescript
import { transactionService, TransactionStatus } from '~/lib/transactionService';

const TransactionMonitor = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Load all transactions
    const allTxs = transactionService.getAllTransactions();
    setTransactions(allTxs);

    // Set up polling for updates (optional)
    const interval = setInterval(() => {
      const updatedTxs = transactionService.getAllTransactions();
      setTransactions(updatedTxs);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.PENDING: return 'orange';
      case TransactionStatus.CONFIRMED: return 'green';
      case TransactionStatus.FAILED: return 'red';
      case TransactionStatus.CANCELLED: return 'gray';
      default: return 'black';
    }
  };

  return (
    <ScrollView>
      {transactions.map((tx) => (
        <View key={tx.id} style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>{tx.type}: {tx.amount} {tx.currency}</Text>
          <Text style={{ color: getStatusColor(tx.status) }}>
            Status: {tx.status}
          </Text>
          <Text>To: {BlockchainUtils.Address.formatAddressForDisplay(tx.to)}</Text>
          <Text>Confirmations: {tx.confirmations}</Text>
          {tx.fee && <Text>Fee: {tx.fee} ETH</Text>}
          {tx.hash && (
            <TouchableOpacity onPress={() => {
              // Open block explorer
              const url = blockchainService.getTransactionUrl(tx.hash!);
              console.log('Open:', url);
            }}>
              <Text style={{ color: 'blue' }}>View on Explorer</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
};
```

## 🔒 Wallet Integration

### Enhanced Wallet Creation (Update existing)

```typescript
// app/(auth)/create-wallet.tsx - Enhanced version
import { blockchainService } from '~/lib/blockchainService';
import { BlockchainUtils } from '~/lib/blockchainUtils';
import { BlockchainErrorHandler } from '~/lib/blockchainErrorHandler';

export default function CreateWalletScreen() {
  const [mnemonic, setMnemonic] = useState<string>('');
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Generate mnemonic using our utility
    const newMnemonic = BlockchainUtils.Wallet.generateMnemonic();
    setMnemonic(newMnemonic);
  }, []);

  const handleCreateWallet = async () => {
    if (!hasConfirmed) {
      // Use custom modal instead of Alert
      BlockchainErrorHandler.handleError({
        type: 'VALIDATION_ERROR',
        message: 'Please confirm you have written down your recovery phrase.'
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Validate mnemonic before creation
      if (!BlockchainUtils.Wallet.isValidMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic generated');
      }

      // Create wallet using ethers
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      
      // Save wallet to secure storage
      await WalletStorage.saveWallet(wallet as any, mnemonic);
      
      // Initialize blockchain service with the new wallet
      await blockchainService.initialize();
      
      // Show success with custom modal
      BlockchainErrorHandler.showSuccess(
        `Wallet created successfully! Address: ${BlockchainUtils.Address.formatAddressForDisplay(wallet.address)}`
      );
      
      router.replace('/(tabs)/dashboard' as any);
    } catch (error) {
      // Error automatically handled by error handler
      console.error('Failed to create wallet:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    // Your existing UI with mnemonic display
    // ... existing code ...
  );
}
```

## 🛠️ Utility Functions

### Format and Validate Data

```typescript
import { BlockchainUtils } from '~/lib/blockchainUtils';

// Address utilities
const isValidAddress = BlockchainUtils.Address.isValidAddress('0x...');
const shortAddress = BlockchainUtils.Address.formatAddressForDisplay('0x...');
const checksumAddress = BlockchainUtils.Address.toChecksumAddress('0x...');

// Amount utilities  
const etherAmount = BlockchainUtils.Amount.formatEther('1000000000000000000', 4); // "1.0000"
const weiAmount = BlockchainUtils.Amount.parseEther('1.5'); // "1500000000000000000"
const tokenAmount = BlockchainUtils.Amount.formatUnits('1000000', 6, 2); // "1.00" (USDC)

// Gas utilities
const gasCost = BlockchainUtils.Gas.calculateGasCost('21000', '20000000000'); // ETH cost
const gweiPrice = BlockchainUtils.Gas.formatGasPrice('20000000000'); // "20"
const gasWithBuffer = BlockchainUtils.Gas.addGasBuffer('21000', 20); // "25200"

// Transaction utilities
const isValidTxHash = BlockchainUtils.Transaction.isValidTxHash('0x...');
const txAge = BlockchainUtils.Transaction.calculateTransactionAge(18000000, 18000010);

// Network utilities
const networkName = BlockchainUtils.Network.getNetworkName(1); // "Ethereum Mainnet"
const isTestnet = BlockchainUtils.Network.isTestnet(11155111); // true (Sepolia)
const nativeCurrency = BlockchainUtils.Network.getNativeCurrency(137); // "MATIC"
```

## 🎯 Best Practices

### 1. Always Use Error Handling
```typescript
// Good ✅
const result = await withErrorHandling(async () => {
  return await blockchainService.sendTransaction(to, amount);
}, 'Send Transaction');

// Better ✅
try {
  const result = await transactionService.sendTransaction(to, amount);
} catch (error) {
  // Error is automatically handled with user-friendly messages
}
```

### 2. Validate Before Operations
```typescript
// Always validate inputs
const validationError = BlockchainErrorHandler.validateTransaction(to, amount);
if (validationError) {
  await BlockchainErrorHandler.handleError(validationError);
  return;
}
```

### 3. Use Progress Callbacks
```typescript
// Provide user feedback during transactions
await transactionService.sendTransaction(to, amount, undefined, (tx) => {
  // Update UI with transaction progress
  setTransactionStatus(tx.status);
  setConfirmations(tx.confirmations);
});
```

### 4. Handle Network Switching
```typescript
// Check if network supports the operation
const network = blockchainService.getCurrentNetwork();
if (network.isTestnet && requiresMainnet) {
  await blockchainService.switchNetwork('ethereum');
}
```

### 5. Cleanup Resources
```typescript
// In component cleanup
useEffect(() => {
  return () => {
    transactionService.cleanup();
  };
}, []);
```

## 🔧 Environment Configuration

### Production Setup

1. **Replace RPC URLs with your keys:**
```typescript
// lib/blockchainService.ts
const SUPPORTED_NETWORKS = {
  ethereum: {
    rpcUrls: [
      'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      'https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY',
      // Keep public fallbacks
      'https://cloudflare-eth.com'
    ],
    // ...
  }
};
```

2. **Set up proper error reporting:**
```typescript
// Add to your error handler setup
BlockchainErrorHandler.setErrorModalCallback((config) => {
  // Send critical errors to your monitoring service
  if (config.severity === 'critical') {
    crashlytics().recordError(new Error(config.message));
  }
  showCustomModal(config);
});
```

This comprehensive blockchain integration provides production-ready code using **ethers.js** as the primary library with robust error handling, user-friendly feedback, and complete transaction management. All existing functionality is preserved while adding powerful new capabilities! 🚀