export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'stake' | 'unstake' | 'approve' | 'contract_deployment' | 'contract_interaction' | 'bridge' | 'nft_mint' | 'nft_transfer' | 'liquidity_add' | 'liquidity_remove' | 'multisig' | 'internal' | 'failed';
  tokenId: string;
  amount: number;
  value: number;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed' | 'reverted';
  recipient?: string;
  sender?: string;
  txHash: string;
  blockNumber?: number;
  gasUsed?: number;
  gasPrice?: number;
  gasFee?: number;
  nonce?: number;
  // Enhanced EVM transaction properties
  contractAddress?: string;
  methodName?: string;
  isInternal?: boolean;
  parentTxHash?: string;
  errorReason?: string;
  logs?: EventLog[];
  metadata?: TransactionMetadata;
}

export interface EventLog {
  address: string;
  topics: string[];
  data: string;
  logIndex: number;
}

export interface TransactionMetadata {
  description?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  tokenName?: string;
  nftTokenId?: string;
  nftCollection?: string;
  bridgeDestChain?: string;
  swapFromToken?: string;
  swapToToken?: string;
  approvedSpender?: string;
  liquidityPool?: string;
  stakingValidator?: string;
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  // Gas Token Transaction (MATIC receive)
  {
    id: '1',
    type: 'receive',
    tokenId: 'gas',
    amount: 2.5,
    value: 1250.00,
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    status: 'completed',
    sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: 51234567,
    gasUsed: 21000,
    gasPrice: 50,
    gasFee: 0.00105,
    nonce: 42,
    metadata: {
      description: 'Received MATIC from DeFi rewards',
      tokenSymbol: 'MATIC',
      tokenDecimals: 18,
      tokenName: 'Polygon'
    }
  },
  // ERC-20 Token Transfer (USDC send)
  {
    id: '2',
    type: 'send',
    tokenId: 'usd',
    amount: 500,
    value: 500,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'completed',
    recipient: '0x8ba1f109551bD432803012645Hac136c772c3e7',
    txHash: '0x2b3c4d5e6f7890ab1234567890abcdef1234567890abcdef1234567890abcdef',
    blockNumber: 51234550,
    gasUsed: 65000,
    gasPrice: 45,
    gasFee: 0.002925,
    nonce: 41,
    contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    methodName: 'transfer',
    metadata: {
      description: 'USDC transfer to exchange',
      tokenSymbol: 'USDC',
      tokenDecimals: 6,
      tokenName: 'USD Coin'
    }
  },
  // DeFi Swap Transaction
  {
    id: '3',
    type: 'swap',
    tokenId: 'gas',
    amount: 1.0,
    value: 500,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    status: 'completed',
    txHash: '0x3c4d5e6f7890ab12ef1234567890abcdef1234567890abcdef1234567890abcd',
    blockNumber: 51234520,
    gasUsed: 180000,
    gasPrice: 60,
    gasFee: 0.0108,
    nonce: 40,
    contractAddress: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    methodName: 'swapExactETHForTokens',
    metadata: {
      description: 'Swap MATIC for USDC on SushiSwap',
      swapFromToken: 'MATIC',
      swapToToken: 'USDC',
      liquidityPool: 'MATIC/USDC'
    }
  },
  // Staking Transaction (PAXG)
  {
    id: '4',
    type: 'stake',
    tokenId: 'gold',
    amount: 0.1,
    value: 195.05,
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    status: 'completed',
    txHash: '0x4d5e6f7890ab12ef341234567890abcdef1234567890abcdef1234567890abcd',
    blockNumber: 51234480,
    gasUsed: 120000,
    gasPrice: 55,
    gasFee: 0.0066,
    nonce: 39,
    contractAddress: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
    methodName: 'stake',
    metadata: {
      description: 'Stake PAXG in yield farm',
      tokenSymbol: 'PAXG',
      tokenDecimals: 18,
      tokenName: 'PAX Gold',
      stakingValidator: 'PAXG Yield Farm'
    }
  },
  // Gas Token Send (MATIC)
  {
    id: '5',
    type: 'send',
    tokenId: 'gas',
    amount: 0.5,
    value: 250.00,
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
    status: 'completed',
    recipient: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    txHash: '0x5e6f7890ab12ef3412567890abcdef1234567890abcdef1234567890abcdef12',
    blockNumber: 51234450,
    gasUsed: 21000,
    gasPrice: 50,
    gasFee: 0.00105,
    nonce: 38,
    metadata: {
      description: 'Send MATIC for gas fees',
      tokenSymbol: 'MATIC',
      tokenDecimals: 18,
      tokenName: 'Polygon'
    }
  },
  // Failed Transaction
  {
    id: '6',
    type: 'failed',
    tokenId: 'usd',
    amount: 1000,
    value: 1000,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    status: 'failed',
    recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    txHash: '0x6f7890ab12ef34125678cdef1234567890abcdef1234567890abcdef1234567',
    blockNumber: 51234400,
    gasUsed: 35000,
    gasPrice: 60,
    gasFee: 0.0021,
    nonce: 37,
    contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    methodName: 'transfer',
    errorReason: 'Insufficient balance',
    metadata: {
      description: 'Failed USDC transfer - insufficient balance',
      tokenSymbol: 'USDC',
      tokenDecimals: 6,
      tokenName: 'USD Coin'
    }
  },
  // Approval Transaction
  {
    id: '7',
    type: 'approve',
    tokenId: 'gold',
    amount: 999999999,
    value: 0,
    timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
    status: 'completed',
    txHash: '0x7890ab12ef34125678cd1234567890abcdef1234567890abcdef1234567890ab',
    blockNumber: 51234380,
    gasUsed: 46000,
    gasPrice: 45,
    gasFee: 0.00207,
    nonce: 36,
    contractAddress: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
    methodName: 'approve',
    metadata: {
      description: 'Approve PAXG for DeFi protocol',
      tokenSymbol: 'PAXG',
      tokenDecimals: 18,
      tokenName: 'PAX Gold',
      approvedSpender: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    }
  },
  // Contract Deployment
  {
    id: '8',
    type: 'contract_deployment',
    tokenId: 'gas',
    amount: 0,
    value: 0,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: 'completed',
    txHash: '0x890ab12ef34125678cd1234890abcdef1234567890abcdef1234567890abcdef',
    blockNumber: 51234350,
    gasUsed: 1200000,
    gasPrice: 50,
    gasFee: 0.06,
    nonce: 35,
    contractAddress: '0x1234567890123456789012345678901234567890',
    metadata: {
      description: 'Deploy new ERC-20 token contract',
      tokenSymbol: 'MATIC',
      tokenDecimals: 18,
      tokenName: 'Polygon'
    }
  },
  // Bridge Transaction
  {
    id: '9',
    type: 'bridge',
    tokenId: 'usd',
    amount: 250,
    value: 250,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: 'completed',
    txHash: '0x90ab12ef34125678cd12348abcdef1234567890abcdef1234567890abcdef123',
    blockNumber: 51234300,
    gasUsed: 350000,
    gasPrice: 70,
    gasFee: 0.0245,
    nonce: 34,
    contractAddress: '0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf',
    methodName: 'depositFor',
    metadata: {
      description: 'Bridge USDC to Ethereum mainnet',
      tokenSymbol: 'USDC',
      tokenDecimals: 6,
      tokenName: 'USD Coin',
      bridgeDestChain: 'Ethereum'
    }
  },
  // Unstake Transaction
  {
    id: '10',
    type: 'unstake',
    tokenId: 'gold',
    amount: 0.05,
    value: 97.5,
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    status: 'completed',
    txHash: '0x0ab12ef34125678cd12348abdef1234567890abcdef1234567890abcdef12345',
    blockNumber: 51234250,
    gasUsed: 95000,
    gasPrice: 45,
    gasFee: 0.004275,
    nonce: 33,
    contractAddress: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
    methodName: 'unstake',
    metadata: {
      description: 'Unstake PAXG from yield farm',
      tokenSymbol: 'PAXG',
      tokenDecimals: 18,
      tokenName: 'PAX Gold',
      stakingValidator: 'PAXG Yield Farm'
    }
  },
  // Internal Transaction (from contract interaction)
  {
    id: '11',
    type: 'internal',
    tokenId: 'gas',
    amount: 0.1,
    value: 50,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago (same time as swap)
    status: 'completed',
    sender: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    recipient: '0x8ba1f109551bD432803012645Hac136c772c3e7',
    txHash: '0x3c4d5e6f7890ab12ef1234567890abcdef1234567890abcdef1234567890abcd',
    blockNumber: 51234520,
    isInternal: true,
    parentTxHash: '0x3c4d5e6f7890ab12ef1234567890abcdef1234567890abcdef1234567890abcd',
    metadata: {
      description: 'Internal MATIC transfer during swap',
      tokenSymbol: 'MATIC',
      tokenDecimals: 18,
      tokenName: 'Polygon'
    }
  },
  // Liquidity Addition
  {
    id: '12',
    type: 'liquidity_add',
    tokenId: 'gas',
    amount: 1.5,
    value: 750,
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    status: 'completed',
    txHash: '0xab12ef34125678cd12348abcdef1234567890abcdef1234567890abcdef123456',
    blockNumber: 51234200,
    gasUsed: 280000,
    gasPrice: 55,
    gasFee: 0.0154,
    nonce: 32,
    contractAddress: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    methodName: 'addLiquidity',
    metadata: {
      description: 'Add liquidity to MATIC/USDC pool',
      tokenSymbol: 'MATIC',
      tokenDecimals: 18,
      tokenName: 'Polygon',
      liquidityPool: 'MATIC/USDC'
    }
  }
];

export const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'send':
      return 'send';
    case 'receive':
      return 'call-received';
    case 'swap':
      return 'swap-horiz';
    case 'stake':
      return 'lock';
    case 'unstake':
      return 'lock-open';
    case 'approve':
      return 'check-circle';
    case 'contract_deployment':
      return 'code';
    case 'contract_interaction':
      return 'settings-applications';
    case 'bridge':
      return 'compare-arrows';
    case 'nft_mint':
      return 'photo';
    case 'nft_transfer':
      return 'collections';
    case 'liquidity_add':
      return 'add-circle';
    case 'liquidity_remove':
      return 'remove-circle';
    case 'multisig':
      return 'people';
    case 'internal':
      return 'call-split';
    case 'failed':
      return 'error';
    default:
      return 'receipt';
  }
};

export const getTransactionColor = (type: Transaction['type']) => {
  switch (type) {
    case 'send':
      return '#F44336'; // Red
    case 'receive':
      return '#4CAF50'; // Green
    case 'swap':
      return '#FF9800'; // Orange
    case 'stake':
      return '#9C27B0'; // Purple
    case 'unstake':
      return '#E91E63'; // Pink
    case 'approve':
      return '#2196F3'; // Blue
    case 'contract_deployment':
      return '#607D8B'; // Blue Grey
    case 'contract_interaction':
      return '#795548'; // Brown
    case 'bridge':
      return '#00BCD4'; // Cyan
    case 'nft_mint':
      return '#8BC34A'; // Light Green
    case 'nft_transfer':
      return '#CDDC39'; // Lime
    case 'liquidity_add':
      return '#03DAC6'; // Teal
    case 'liquidity_remove':
      return '#FF6F00'; // Deep Orange
    case 'multisig':
      return '#673AB7'; // Deep Purple
    case 'internal':
      return '#9E9E9E'; // Grey
    case 'failed':
      return '#F44336'; // Red
    default:
      return '#757575'; // Dark Grey
  }
};

export const getTransactionTitle = (type: Transaction['type']) => {
  switch (type) {
    case 'send':
      return 'Sent';
    case 'receive':
      return 'Received';
    case 'swap':
      return 'Swapped';
    case 'stake':
      return 'Staked';
    case 'unstake':
      return 'Unstaked';
    case 'approve':
      return 'Approved';
    case 'contract_deployment':
      return 'Contract Deployed';
    case 'contract_interaction':
      return 'Contract Call';
    case 'bridge':
      return 'Bridged';
    case 'nft_mint':
      return 'NFT Minted';
    case 'nft_transfer':
      return 'NFT Transferred';
    case 'liquidity_add':
      return 'Liquidity Added';
    case 'liquidity_remove':
      return 'Liquidity Removed';
    case 'multisig':
      return 'Multisig';
    case 'internal':
      return 'Internal Call';
    case 'failed':
      return 'Failed';
    default:
      return 'Transaction';
  }
};

export const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}; 