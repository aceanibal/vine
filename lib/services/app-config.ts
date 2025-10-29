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
    treasury: string;
  };
}

// Default configuration as fallback
export const DEFAULT_APP_CONFIG: AppConfig = {
  defaultChainIdNumeric: 137, // Polygon mainnet
  predefinedToken: {
    address: '0xf1d0312Bbb4073421e65984f20C79F9b6b0d0f44',
    symbol: 'SGLD',
    name: 'SGLD',
    decimals: 18,
    price: null,
    logo: 'https://raw.githubusercontent.com/aceanibal/assets/main/icon.png',
    chainName: 'Polygon',
  },
  orchestratorConfig: {
    delegationAddress: '0x9a686F5eaE58B62B435EAa034d48E57dc94BC36c',
    providerUrl: 'https://polygon-rpc.com',
    relayerEndpoint: 'https://metalsbackend.lbf.solutions/relay',
    maxRetries: 30,
    retryDelayMs: 2000,
    supportedChains: [137],
    treasury: '0x529aB80a88A95e495E7772a6cc5c3bAFd009D6b6',
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
    if (!config) {
      return DEFAULT_APP_CONFIG;
    }
    
    // Deep merge with defaults to ensure all fields are present
    const mergedConfig: AppConfig = {
      defaultChainIdNumeric: config.defaultChainIdNumeric ?? DEFAULT_APP_CONFIG.defaultChainIdNumeric,
      predefinedToken: {
        address: config.predefinedToken?.address ?? DEFAULT_APP_CONFIG.predefinedToken.address,
        symbol: config.predefinedToken?.symbol ?? DEFAULT_APP_CONFIG.predefinedToken.symbol,
        name: config.predefinedToken?.name ?? DEFAULT_APP_CONFIG.predefinedToken.name,
        decimals: config.predefinedToken?.decimals ?? DEFAULT_APP_CONFIG.predefinedToken.decimals,
        // Do not accept price from backend; keep default (null)
        price: DEFAULT_APP_CONFIG.predefinedToken.price,
        logo: config.predefinedToken?.logo ?? DEFAULT_APP_CONFIG.predefinedToken.logo,
        chainName: config.predefinedToken?.chainName ?? DEFAULT_APP_CONFIG.predefinedToken.chainName,
      },
      orchestratorConfig: {
        delegationAddress: config.orchestratorConfig?.delegationAddress ?? DEFAULT_APP_CONFIG.orchestratorConfig.delegationAddress,
        providerUrl: config.orchestratorConfig?.providerUrl ?? DEFAULT_APP_CONFIG.orchestratorConfig.providerUrl,
        relayerEndpoint: config.orchestratorConfig?.relayerEndpoint ?? DEFAULT_APP_CONFIG.orchestratorConfig.relayerEndpoint,
        maxRetries: config.orchestratorConfig?.maxRetries ?? DEFAULT_APP_CONFIG.orchestratorConfig.maxRetries,
        retryDelayMs: config.orchestratorConfig?.retryDelayMs ?? DEFAULT_APP_CONFIG.orchestratorConfig.retryDelayMs,
        supportedChains: config.orchestratorConfig?.supportedChains ?? DEFAULT_APP_CONFIG.orchestratorConfig.supportedChains,
        treasury: config.orchestratorConfig?.treasury ?? DEFAULT_APP_CONFIG.orchestratorConfig.treasury,
      },
    };
    
    return mergedConfig;
  } catch (error) {
    console.error('Failed to fetch app config:', error);
    return DEFAULT_APP_CONFIG;
  }
}
