import { TransactionData } from '../stores/useGlobalStore';

export interface AlchemyProxyParams {
  address: string;
  tokenAddress: string;
}

export interface AlchemyProxyResponse extends TransactionData {}
/**
 * Converts a hex or decimal string to a base-10 string using BigInt
 */
export function hexToDecimalString(value: string): string {
  try {
    const big = BigInt(value);
    return big.toString(10);
  } catch (e) {
    return '0';
  }
}

/**
 * Adds a decimal representation of token balance to the response
 * - Keeps original shape and adds tokenBalances.balance.tokenBalanceDecimal
 */
export function normalizeAlchemyProxyResponse<T extends TransactionData>(data: T): T {
  try {
    const hex = (data as any)?.tokenBalances?.balance?.tokenBalance as string | undefined;
    if (hex) {
      const dec = hexToDecimalString(hex);
      (data as any).tokenBalances.balance.tokenBalanceDecimal = dec;
    }
  } catch (_e) {}
  return data;
}


/**
 * Fetches transaction data from the alchemy-proxy API endpoint
 * @param params - Object containing wallet address and token address
 * @returns Promise<AlchemyProxyResponse>
 */
export const fetchAlchemyProxyData = async (
  params: AlchemyProxyParams
): Promise<AlchemyProxyResponse> => {
  const { address, tokenAddress } = params;
  
  const url = `/alchemy-proxy?address=${encodeURIComponent(address)}&tokenAddress=${encodeURIComponent(tokenAddress)}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: AlchemyProxyResponse = await response.json();
    return normalizeAlchemyProxyResponse(data);
  } catch (error) {
    console.error('Error fetching alchemy-proxy data:', error);
    throw error;
  }
};

/**
 * Service class for managing alchemy-proxy API calls
 */
export class AlchemyProxyService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Fetches transaction data for a specific wallet and token
   * @param address - Wallet address
   * @param tokenAddress - Token contract address
   * @returns Promise<AlchemyProxyResponse>
   */
  async getTransactionData(
    address: string,
    tokenAddress: string
  ): Promise<AlchemyProxyResponse> {
    const url = `${this.baseURL}/alchemy-proxy?address=${encodeURIComponent(address)}&tokenAddress=${encodeURIComponent(tokenAddress)}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: AlchemyProxyResponse = await response.json();
      return normalizeAlchemyProxyResponse(data);
    } catch (error) {
      console.error('AlchemyProxyService: Error fetching transaction data:', error);
      throw error;
    }
  }

  /**
   * Updates the base URL for the service
   * @param newBaseURL - New base URL
   */
  setBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
  }

  /**
   * Gets the current base URL
   * @returns Current base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}
