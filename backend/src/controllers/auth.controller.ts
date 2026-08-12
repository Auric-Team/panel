import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export const login = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const result = AuthService.login(username, password);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const verify2FA = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, pin } = req.body;
    const result = AuthService.verify2FA(userId, pin);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const register = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, deviceFingerprint } = req.body;
    const result = AuthService.register(username, password, deviceFingerprint);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
