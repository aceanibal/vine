# Transaction Data Management System Specification

## Overview
This document outlines the new approach for managing transaction data using the Moralis API. The system will fetch and store complete wallet transaction history, maintain it as a single source of truth, and support multiple active chains.

## Core Components

### 1. Global Function: `getData`
A centralized function that manages transaction data fetching and storage.

**Logic Flow:**
1. Check if transactions exist in storage
2. If no transactions exist:
   - Fetch entire wallet history for all active chains
   - Store complete history
3. If transactions exist:
   - Get date of most recent transaction
   - Fetch new transactions from that date forward
   - Merge with existing data (avoiding duplicates)
   - Store updated transaction data

### 2. Moralis API Integration

#### Wallet History Endpoint
```javascript
import Moralis from 'moralis';

const response = await Moralis.EvmApi.wallets.getWalletHistory({
  "chain": "0x89", // Chain ID (e.g., "0x89" for Polygon)
  "order": "DESC",
  "address": "0x1aeddD4fA751C41CCB5EDF7D8c93E8E2d9EC5851"
});
```

**Query Parameters:**
- `chain`: The chain to query (string)
- `from_block`: Minimum block number (number)
- `to_block`: Maximum block number (number)
- `from_date`: Start date (string/seconds)
- `to_date`: End date (string/seconds)
- `include_internal_transactions`: Include internal transactions (boolean)
- `nft_metadata`: Include NFT metadata (boolean)
- `cursor`: Pagination cursor (string)
- `order`: Result order - "ASC" or "DESC" (string)
- `limit`: Page size (number)

**Response Structure:**
```json
{
  "cursor": null,
  "page_size": 11,
  "limit": "100",
  "result": [
    {
      "hash": "0xc03cfdac1f66f59e124dc772fd5f3ecd2fbe109d7a1569a2e856b130312836c7",
      "nonce": "7",
      "transaction_index": "93",
      "from_address": "0x1aeddd4fa751c41ccb5edf7d8c93e8e2d9ec5851",
      "to_address": "0xda9b27c97a5079e769d48966da7c3a99b8538bec",
      "value": "500000000000000",
      "gas": "21000",
      "gas_price": "29530029019",
      "receipt_cumulative_gas_used": "15901762",
      "receipt_gas_used": "21000",
      "receipt_contract_address": null,
      "receipt_status": "1",
      "block_timestamp": "2025-08-08T16:21:17.000Z",
      "block_number": "74957549",
      "block_hash": "0x1858ade75c7a4323d13640cdc7c1e7e7c2fd79e4d62e4684358ecbf3343c2be4",
      "transaction_fee": "0.000620130609399",
      "method_label": null,
      "nft_transfers": [],
      "erc20_transfers": [],
      "native_transfers": [
        {
          "from_address": "0x1aeddd4fa751c41ccb5edf7d8c93e8e2d9ec5851",
          "to_address": "0xda9b27c97a5079e769d48966da7c3a99b8538bec",
          "value": "500000000000000",
          "value_formatted": "0.0005",
          "direction": "send",
          "internal_transaction": false,
          "token_symbol": "POL",
          "token_logo": "https://cdn.moralis.io/polygon/0x.png"
        }
      ],
      "summary": "Sent 0.0005 POL to 0xda...8bec",
      "possible_spam": false,
      "category": "send"
    }
  ],
  "page": 0
}
```

#### Active Chains Endpoint
```javascript
const response = await Moralis.EvmApi.wallets.getWalletActiveChains({
  "chains": [
    "0x1",    // Ethereum
    "0x89",   // Polygon
    "0x2105"  // Base
  ],
  "address": "0x2584Ce54DCa457dE0bc0BF89659f3360344862A3"
});
```

**Response Structure:**
```json
{
  "address": "0x2584ce54dca457de0bc0bf89659f3360344862a3",
  "active_chains": [
    {
      "chain": "eth",
      "chain_id": "0x1",
      "first_transaction": {
        "block_number": "14473307",
        "block_timestamp": "2022-03-28T07:16:38.000Z",
        "transaction_hash": "0x21270c40212646df516bffd9166a8cf365d04ce393e6763f67370fe5270f0f55"
      },
      "last_transaction": {
        "block_number": "22590621",
        "block_timestamp": "2025-05-29T19:55:35.000Z",
        "transaction_hash": "0x7d38ceaa4d1e195a57a77b8adf8707bdb6c05f7901efe268fc7485e53e35265a"
      }
    },
    {
      "chain": "polygon",
      "chain_id": "0x89",
      "first_transaction": {
        "block_number": "40650281",
        "block_timestamp": "2023-03-22T21:12:58.000Z",
        "transaction_hash": "0x8b7dede367fb58d5a0426b9b43ae050e0334b0fc05dcca327faf2db47feb7b19"
      },
      "last_transaction": {
        "block_number": "72895617",
        "block_timestamp": "2025-06-17T22:12:02.000Z",
        "transaction_hash": "0x1eb7e87ec9d7010299597f29cfba82dc494d628ff0912f3760e59a9ab6b80565"
      }
    },
    {
      "chain": "base",
      "chain_id": "0x2105",
      "first_transaction": null,
      "last_transaction": null
    }
  ]
}
```

### 3. Data Storage Architecture

#### Transaction Store (Separate from Global Store)
- **Purpose**: Single source of truth for all transaction data
- **Structure**: 
  - Organized by chain ID
  - Chronologically ordered transactions
  - Includes metadata (last fetch date, pagination cursors)
- **Operations**:
  - Store complete transaction history
  - Append new transactions (with duplicate prevention)
  - Retrieve transactions by date range
  - Retrieve transactions by chain

#### Global Store Integration
- **Purpose**: Continue managing other app state (gas fees, tokens, etc.)
- **Transaction Data**: Will reference the separate transaction store
- **No Direct Storage**: Transaction data should not be stored directly in global store

### 4. Implementation Flow

#### Initial Wallet Import
1. Call `getWalletActiveChains` to identify chains with transaction history
2. For each active chain:
   - Call `getWalletHistory` without date filters to get complete history
   - Store all transactions in transaction store
3. Parse transaction data to extract available tokens
4. Calculate balances for all discovered tokens
5. Fetch live prices for all tokens
6. Update global store with token information, balances, and prices

#### Regular Data Updates
1. Check transaction store for most recent transaction date
2. For each active chain:
   - Call `getWalletHistory` with `from_date` set to most recent transaction date
   - Merge new transactions with existing data (prevent duplicates)
   - Update transaction store
3. Parse new transactions for token discovery
4. Recalculate balances based on updated transaction data
5. Update global store with new token information and balances

#### Settings Integration
- **Active Chains Display**: Show all chains with transaction history
- **Refresh Functionality**: 
  - Re-scan for active chains
  - Update transaction data for all active chains
  - Refresh token information
  - Fetch live prices for all tokens
- **Price Refresh**: Manual trigger to update token prices

### 5. Data Processing

#### Transaction Parsing
- Extract token information from:
  - `native_transfers` (native blockchain tokens)
  - `erc20_transfers` (ERC-20 tokens)
  - `nft_transfers` (NFT transactions)
- Identify unique tokens across all transactions
- Store token metadata (symbol, logo, decimals, etc.)

#### Balance Calculation
- Parse transaction data to calculate current balances for each token
- Track balance changes through transaction history:
  - **Send transactions**: Subtract from balance
  - **Receive transactions**: Add to balance
  - **Contract interactions**: Handle complex token movements
- Maintain running balance for each token per chain
- Store balance snapshots with timestamps

#### Live Price Fetching
- **Trigger Conditions**:
  - When app is opened/initialized
  - When user manually refreshes prices in settings
  - Not on every transaction fetch (to reduce API calls)
- **API Integration**: Use Moralis token price endpoints
- **Price Storage**: Store prices with timestamps for caching
- **Price Updates**: Update all discovered tokens simultaneously

#### Duplicate Prevention
- Use transaction hash as unique identifier
- Check existing transactions before storing new ones
- Maintain chronological order when merging data

### 6. Error Handling
- Use global error mechanism for all API failures
- Implement retry logic for failed requests
- Graceful degradation when partial data is available
- Log errors for debugging and monitoring

### 7. Performance Considerations
- Implement pagination for large transaction histories
- Cache active chains data to avoid repeated API calls
- Use efficient data structures for transaction storage
- Implement background sync for regular updates

### 8. Chain Support
- **Primary Chains**: Ethereum (0x1), Polygon (0x89), Base (0x2105)
- **Extensible**: Easy to add new chains by updating chain list
- **Dynamic**: Active chains determined by actual transaction history

### 9. Price Management

#### Moralis Price API Integration
- **Endpoint**: Use Moralis token price endpoints for live price data
- **Batch Requests**: Fetch prices for multiple tokens in single API call
- **Price Caching**: Store prices with timestamps to avoid excessive API calls
- **Price Updates**: Only fetch when app opens or user manually refreshes

#### Price Data Structure
- **Token Prices**: Store current price, 24h change, market cap, etc.
- **Price History**: Optional - store price snapshots for charts
- **Currency Support**: Support multiple fiat currencies (USD, EUR, etc.)
- **Price Timestamps**: Track when prices were last updated

#### Price Update Triggers
1. **App Initialization**: Fetch prices when app first opens
2. **Manual Refresh**: User-triggered price updates in settings
3. **Background Updates**: Optional - periodic updates when app is active
4. **New Token Discovery**: Fetch prices for newly discovered tokens

#### Balance and Price Integration
- **Portfolio Value**: Calculate total portfolio value using current prices
- **Token Values**: Display individual token values in fiat currency
- **Price Alerts**: Optional - notify users of significant price changes
- **Historical Performance**: Track portfolio performance over time

## Implementation Notes

1. **Incremental Approach**: Implement in small steps to catch errors early
2. **Global Error Handling**: Use existing global error mechanism
3. **Store Separation**: Keep transaction data separate from global store
4. **Data Integrity**: Always prevent duplicate transactions
5. **Token Discovery**: Automatically discover tokens from transaction data
6. **Multi-Chain Support**: Handle multiple chains simultaneously

## Next Steps

1. Create transaction store structure
2. Implement `getData` function
3. Integrate with Moralis API
4. Update settings screen for active chains
5. Implement token parsing logic
6. Implement balance calculation system
7. Integrate Moralis price API
8. Add price refresh functionality
9. Implement portfolio value calculations
10. Test with multiple chains and transaction types
