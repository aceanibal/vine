// Import blockchain config for contract addresses
import { BLOCKCHAIN_CONFIG } from './blockchainConfig';

export interface Token {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  color: string;
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  // Blockchain properties
  contractAddress?: string;
  decimals: number;
  isNative?: boolean;
}

export const PREDEFINED_TOKENS: Token[] = [
  {
    id: 'gas',
    symbol: 'MATIC',
    name: 'Polygon',
    icon: 'local-gas-station',
    color: '#8247E5',
    price: 500.00, // MATIC price estimate
    priceChange24h: 2.1,
    marketCap: 9000000000,
    volume24h: 400000000,
    decimals: 18,
    isNative: true
  },
  {
    id: 'usd',
    symbol: 'USDC',
    name: 'USD Coin',
    icon: 'attach-money',
    color: '#4CAF50',
    price: 1.00,
    priceChange24h: 0.1,
    marketCap: 25000000000000,
    volume24h: 1500000000000,
    contractAddress: BLOCKCHAIN_CONFIG.tokens.usd.address,
    decimals: 6
  },
  {
    id: 'gold',
    symbol: 'PAXG',
    name: 'PAX Gold',
    icon: 'monetization-on',
    color: '#FFD700',
    price: 1950.00,
    priceChange24h: 1.8,
    marketCap: 1200000000000,
    volume24h: 45000000000,
    contractAddress: BLOCKCHAIN_CONFIG.tokens.gold.address,
    decimals: 18
  }
];

export const getTokenById = (id: string): Token | undefined => {
  return PREDEFINED_TOKENS.find(token => token.id === id);
};

export const getTokenBySymbol = (symbol: string): Token | undefined => {
  return PREDEFINED_TOKENS.find(token => token.symbol === symbol);
};

export const calculateTotalNetAssetValue = (holdings: { [key: string]: number }): number => {
  return Object.entries(holdings).reduce((total, [tokenId, amount]) => {
    const token = getTokenById(tokenId);
    if (token) {
      return total + (amount * token.price);
    }
    return total;
  }, 0);
};

// Helper function to create live token data for display
export const createLiveTokenData = (balances: any) => {
  if (!balances) return [];
  
  return PREDEFINED_TOKENS.map(token => {
    let balance = '0';
    let formattedBalance = '0';
    
    // Map token IDs to balance service data
    switch (token.id) {
      case 'gas':
        balance = balances.gasToken?.balance || '0';
        formattedBalance = balances.gasToken?.formattedBalance || '0 MATIC';
        break;
      case 'usd':
        balance = balances.usdToken?.balance || '0';
        formattedBalance = balances.usdToken?.formattedBalance || '0 USDC';
        break;
      case 'gold':
        balance = balances.goldToken?.balance || '0';
        formattedBalance = balances.goldToken?.formattedBalance || '0 PAXG';
        break;
    }
    
    const numericBalance = parseFloat(balance);
    const value = numericBalance * token.price;
    
    return {
      ...token,
      balance: numericBalance,
      formattedBalance,
      value
    };
  });
}; 