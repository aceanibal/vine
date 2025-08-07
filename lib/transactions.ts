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

export const MOCK_TRANSACTIONS: Transaction[] = [];

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