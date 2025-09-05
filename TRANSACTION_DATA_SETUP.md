# Transaction Data Management Setup Guide

## Overview
This guide will help you set up and test the new transaction data management system that integrates with Moralis API using direct HTTP calls to fetch complete wallet transaction history.

## Prerequisites

1. **Moralis API Key**: You need a Moralis API key to use the transaction data features.
   - Sign up at [Moralis.io](https://moralis.io/)
   - Get your API key from the [Moralis Admin Panel](https://admin.moralis.io/)

## Architecture

The system uses **direct HTTP API calls** to Moralis instead of the SDK to avoid dependency issues:
- ✅ No heavy SDK dependencies
- ✅ No ethereumjs-util conflicts
- ✅ Lightweight and fast
- ✅ Full control over API calls

## Setup Steps

### 1. Environment Configuration

Create a `.env` file in your project root with your Moralis API key:

```bash
# .env
EXPO_PUBLIC_MORALIS_API_KEY=your_moralis_api_key_here
```

**Important**: Replace `your_moralis_api_key_here` with your actual Moralis API key.

### 2. Test Wallet Address

The system is configured to test with the wallet address:
```
0x1aeddD4fA751C41CCB5EDF7D8c93E8E2d9EC5851
```

This wallet has transaction history on multiple chains (Ethereum, Polygon, Base) for comprehensive testing.

## Testing the System

### Method 1: Using the App (Recommended)

1. **Start the app** in development mode:
   ```bash
   npm start
   ```

2. **Navigate to Settings**:
   - Open the app
   - Go to the "Settings" tab
   - Look for the "Development Tools" section (only visible in development mode)

3. **Run the Test**:
   - Tap "Test Transaction Data"
   - Tap "Run Test" to start fetching data
   - Monitor the results in real-time

### Method 2: Using the Test Script

1. **Set environment variable**:
   ```bash
   export EXPO_PUBLIC_MORALIS_API_KEY=your_moralis_api_key_here
   ```

2. **Run the test script**:
   ```bash
   node test-transaction-data.js
   ```

## What the Test Does

The transaction data test will:

1. **Initialize Moralis API** with your API key
2. **Fetch Active Chains** - Get all chains where the wallet has transaction history
3. **Fetch Transaction History** - Get complete transaction history for each active chain
4. **Process Transactions** - Parse transactions to discover tokens and calculate balances
5. **Fetch Token Prices** - Get live prices for all discovered tokens
6. **Update Global Store** - Store all data in the app's global state

## Expected Results

For the test wallet `0x1aeddD4fA751C41CCB5EDF7D8c93E8E2d9EC5851`, you should see:

- **Active Chains**: Ethereum, Polygon, Base
- **Transactions**: Multiple transactions across different chains
- **Tokens**: Native tokens (ETH, MATIC, etc.) with calculated balances
- **Prices**: Live USD prices for discovered tokens
- **Portfolio Value**: Total portfolio value in USD

## Troubleshooting

### Common Issues

1. **"Moralis API not initialized"**
   - Make sure your API key is set in the `.env` file
   - Restart the app after adding the environment variable

2. **"Failed to get active chains"**
   - Check your internet connection
   - Verify your Moralis API key is valid
   - Check if you've exceeded your API rate limits

3. **"No transactions found"**
   - The wallet might not have transaction history
   - Try with a different wallet address that has known activity

4. **"Failed to get token prices"**
   - Some tokens might not have price data available
   - This is normal and won't break the system

### Debug Information

The system provides detailed console logs. Check your development console for:
- API call results
- Transaction processing steps
- Token discovery information
- Error details

## Architecture Overview

The transaction data management system consists of:

1. **Transaction Store** (`lib/transactionStore.ts`) - Separate store for Moralis transaction data
2. **Moralis API Service** (`lib/services/moralisApi.ts`) - Direct HTTP API integration (no SDK)
3. **Global Data Function** (`lib/getData.ts`) - Main data management function
4. **Global Store** (`lib/stores/useGlobalStore.ts`) - App state management
5. **Test Component** (`components/TransactionDataTest.tsx`) - Testing interface

### Key Benefits of Direct API Approach:
- **No SDK Dependencies**: Avoids ethereumjs-util and other heavy dependencies
- **Better Performance**: Direct HTTP calls are faster and more efficient
- **Full Control**: Complete control over API requests and error handling
- **Smaller Bundle**: Significantly smaller app bundle size
- **React Native Compatible**: No Node.js compatibility issues

## Next Steps

After successful testing:

1. **Integrate with Dashboard** - Use the fetched data in your dashboard screen
2. **Add Refresh Functionality** - Implement manual refresh in settings
3. **Optimize Performance** - Add caching and background sync
4. **Extend Chain Support** - Add more blockchain networks
5. **Add Error Handling** - Implement retry logic and offline support

## Support

If you encounter issues:

1. Check the console logs for detailed error information
2. Verify your Moralis API key and account status
3. Ensure you have a stable internet connection
4. Check the Moralis documentation for API limits and requirements

---

**Note**: This system is designed to work incrementally and handle errors gracefully. Even if some API calls fail, the system will continue to process available data.
