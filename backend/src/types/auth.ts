export type UserRole = 'owner' | 'manager' | 'reseller';

export interface UserRecord {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  createdBy: string | null;
  pin2fa: string | null;
  isBlocked: number;
  credits: number;
  tokens: number;
  createdAt: string;
}

export interface LoginResponse {
  require2FA: boolean;
  userId?: string;
  role?: string;
  username?: string;
  token?: string;
  message?: string;
  user?: {
    id: string;
    username: string;
    role: UserRole;
    tokens: number;
    credits: number;
  };
}
