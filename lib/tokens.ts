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
}

export const PREDEFINED_TOKENS: Token[] = [
  {
    id: 'gold',
    symbol: 'GLD',
    name: 'Gold',
    icon: 'monetization-on',
    color: '#FFD700',
    price: 1950.50,
    priceChange24h: 2.5,
    marketCap: 1200000000000,
    volume24h: 45000000000
  },
  {
    id: 'usd',
    symbol: 'USD',
    name: 'US Dollar',
    icon: 'attach-money',
    color: '#4CAF50',
    price: 1.00,
    priceChange24h: 0.0,
    marketCap: 25000000000000,
    volume24h: 1500000000000
  },
  {
    id: 'digital-gas',
    symbol: 'DGAS',
    name: 'Digital Gas',
    icon: 'local-gas-station',
    color: '#FF5722',
    price: 0.85,
    priceChange24h: -1.2,
    marketCap: 8500000000,
    volume24h: 125000000
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