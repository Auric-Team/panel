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
  createdBy?: string;
  stats: ResellerStats;
  salesGraph: Array<{ date: string; count: number; tokens: number }>;
  keys: any[];
}
