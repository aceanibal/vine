export interface AppConfig {
  defaultChainIdNumeric: number;
  predefinedToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    price: number | null;
    logo?: string;
    chainName: string;
  };
  orchestratorConfig: {
    delegationAddress: string;
    providerUrl: string;
    relayerEndpoint: string;
    maxRetries: number;
    retryDelayMs: number;
    supportedChains: number[];
  };
}

// Default configuration as fallback
export const DEFAULT_APP_CONFIG: AppConfig = {
  defaultChainIdNumeric: 137, // Polygon mainnet
  predefinedToken: {
    address: '0x756715CF771C82aFB371B9C9f9Dd64E690766351',
    symbol: 'PAXG',
    name: 'PAXG',
    decimals: 18,
    price: null,
    logo: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png',
    chainName: 'Polygon',
  },
  orchestratorConfig: {
    delegationAddress: '0x9a686F5eaE58B62B435EAa034d48E57dc94BC36c',
    providerUrl: 'https://polygon-rpc.com',
    relayerEndpoint: 'https://cpprhb1jz6.execute-api.us-east-1.amazonaws.com/relay',
    maxRetries: 30,
    retryDelayMs: 2000,
    supportedChains: [137],
  },
};

export async function fetchConfigFromBackend(backendURL: string): Promise<AppConfig> {
  try {
    const response = await fetch(`${backendURL}/info`);
    if (!response.ok) {
      console.warn('Failed to fetch app config from API, using default config');
      return DEFAULT_APP_CONFIG;
    }
    const config = await response.json();
    return config || DEFAULT_APP_CONFIG;
  } catch (error) {
    console.error('Failed to fetch app config:', error);
    return DEFAULT_APP_CONFIG;
  }
}
