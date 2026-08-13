import { Request } from 'express';

export interface AuthUserPayload {
  id: string;
  username: string;
  role: 'owner' | 'manager' | 'reseller' | 'user';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}
