export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'stake';
  tokenId: string;
  amount: number;
  value: number;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
  recipient?: string;
  sender?: string;
  txHash?: string;
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'receive',
    tokenId: 'gold',
    amount: 0.25,
    value: 487.63,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'completed',
    sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  },
  {
    id: '2',
    type: 'send',
    tokenId: 'usd',
    amount: 500,
    value: 500,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    status: 'completed',
    recipient: '0x8ba1f109551bD432803012645Hac136c772c3e7',
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
  },
  {
    id: '3',
    type: 'swap',
    tokenId: 'digital-gas',
    amount: 100,
    value: 85,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    status: 'completed',
    txHash: '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456'
  },
  {
    id: '4',
    type: 'stake',
    tokenId: 'gold',
    amount: 0.1,
    value: 195.05,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: 'completed',
    txHash: '0x4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123'
  },
  {
    id: '5',
    type: 'receive',
    tokenId: 'usd',
    amount: 1000,
    value: 1000,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: 'completed',
    sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    txHash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
  }
];

export const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'send':
      return 'send';
    case 'receive':
      return 'receipt';
    case 'swap':
      return 'swap-horiz';
    case 'stake':
      return 'lock';
    default:
      return 'receipt';
  }
};

export const getTransactionColor = (type: Transaction['type']) => {
  switch (type) {
    case 'send':
      return '#F44336';
    case 'receive':
      return '#4CAF50';
    case 'swap':
      return '#FF9800';
    case 'stake':
      return '#9C27B0';
    default:
      return '#757575';
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