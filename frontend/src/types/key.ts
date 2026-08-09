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
}

export interface UserItem {
  id: string;
  username: string;
  role: 'owner' | 'manager' | 'reseller';
  tokens: number;
  credits?: number;
  isBlocked: number;
  createdAt: string;
  createdBy?: string;
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
