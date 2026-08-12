export type KeyStatus = 'active' | 'expired' | 'revoked' | 'banned';

export interface KeyRecord {
  id: string;
  key: string;
  hwid: string | null;
  status: KeyStatus;
  expiresAt: string;
  createdAt: string;
  activatedAt: string | null;
  createdById: string;
  createdByUsername: string;
  note: string | null;
  isMasterKey: number;
  paymentScreenshot: string | null;
  costTokens: number;
}

export interface VerifyKeyPayload {
  key: string;
  hwid?: string;
  deviceFingerprint?: string;
  username?: string;
  timestamp?: number | string;
  signature?: string;
  hash?: string;
}

export interface GenerateKeysPayload {
  durationDays?: number;
  count?: number;
  note?: string;
  isMaster?: boolean | string | number;
  paymentScreenshot?: string | null;
}
