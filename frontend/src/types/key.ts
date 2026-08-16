export interface KeyItem {
  id: string;
  key: string;
  status: 'active' | 'expired' | 'revoked' | 'banned';
  hwid: string | null;
  duration: string;
  costTokens: number;
  createdAt: string;
  expiresAt: string | null;
  note: string;
  createdByUsername: string;
  paymentScreenshot?: string | null;
  isMasterKey?: number | boolean;
  deviceCount?: number;
}

export interface UserItem {
  id: string;
  username: string;
  role: 'owner' | 'manager' | 'reseller' | 'user';
  tokens: number;
  credits?: number;
  isBlocked: number;
  createdAt: string;
  createdBy?: string;
  createdByUsername?: string;
  status?: string;
  email?: string;
}

export interface SalesDataPoint {
  date: string;
  salesCount: number;
  revenueTokens: number;
}

export interface DashboardStats {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  boundDevices: number;
  totalResellers: number;
  totalTokensSpent: number;
}

export interface StatsOverviewData {
  totalKeys: number;
  activeKeys: number;
  boundDevices: number;
  expiredKeys: number;
  totalResellers: number;
  totalRevenueTokens: number;
  salesHistory: SalesDataPoint[];
}

export interface TokenTransactionItem {
  id: string;
  userId: string;
  username: string;
  amount: number;
  type: 'add' | 'deduct' | 'key_generation' | 'key_extension' | 'system_adjustment';
  balanceAfter: number;
  note?: string;
  createdById?: string;
  createdByUsername?: string;
  createdAt: string;
}

export interface TelemetryData {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  database: {
    fileSizeBytes: number;
    fileSizeMb: number;
    totalKeys: number;
    activeKeys: number;
    totalUsers: number;
    totalDevices: number;
  };
}
