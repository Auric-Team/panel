import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { getClientIp } from '../middlewares/rateLimiter';

export const login = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const ip = getClientIp(req);
    const result = AuthService.login(username, password, ip);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const verify2FA = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, pin } = req.body;
    const ip = getClientIp(req);
    const result = AuthService.verify2FA(userId, pin, ip);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const register = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, deviceFingerprint } = req.body;
    const ip = getClientIp(req);
    const result = AuthService.register(username, password, deviceFingerprint, ip);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
