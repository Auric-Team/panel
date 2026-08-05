export interface ResellerStats {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  totalTokensSpent: number;
}

export interface ResellerDetails {
  id: string;
  username: string;
  role: string;
  tokens: number;
  createdAt: string;
  stats: ResellerStats;
  salesGraph: Array<{ date: string; count: number; tokens: number }>;
  keys: any[];
}

export interface TokenTransaction {
  id: string;
  userId: string;
  username: string;
  amount: number;
  type: 'add' | 'deduct';
  note: string;
  timestamp: string;
}
