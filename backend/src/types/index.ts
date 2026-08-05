export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'owner' | 'manager' | 'reseller';
  createdBy: string;
  pin2fa: string | null;
  isBlocked: number;
  credits: number;
  createdAt: string;
}

export interface Key {
  id: string;
  key: string;
  hwid: string | null;
  status: 'active' | 'expired' | 'revoked' | 'banned';
  expiresAt: string;
  createdAt: string;
  activatedAt: string | null;
  createdById: string;
  createdByUsername: string;
  note?: string;
}

export interface Log {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}
