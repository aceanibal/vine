// Configurable blockchain settings - easily changeable for different chains/tokens
export const BLOCKCHAIN_CONFIG = {
  // Chain configuration
  chain: {
    chainId: 137, // Polygon mainnet
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://rpc-mainnet.matic.network',
      'https://matic-mainnet.chainstacklabs.com',
      'https://rpc-mainnet.maticvigil.com'
    ],
    blockExplorerUrls: ['https://polygonscan.com'],
    decimals: 18
  },
  
  // Token configurations - change these addresses to use different tokens
  tokens: {
    // Gas token (MATIC on Polygon)
    gas: {
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 18,
      isNative: true
    },
    // USD token (USDC on Polygon)
    usd: {
      address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // USDC on Polygon (Current contract)
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6
    },
    // Gold token (PAXG on Polygon)
    gold: {
      address: '0x553d3D295e0f695B9228246232eDF400ed3560B5', // PAXG on Polygon
      symbol: 'PAXG',
      name: 'PAX Gold',
      decimals: 18
    }
  }
};
