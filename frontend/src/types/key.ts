export interface KeyItem {
  id: string;
  key: string;
  status: 'active' | 'expired' | 'revoked';
  hwid: string | null;
  duration: string;
  createdAt: string;
  expiresAt: string | null;
  note: string;
  isMasterKey?: number | boolean;
}

export interface StatsOverview {
  totalKeys: number;
  activeKeys: number;
  boundDevices: number;
  expiredKeys: number;
}
