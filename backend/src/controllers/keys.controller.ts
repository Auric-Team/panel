import { Request, Response, NextFunction } from 'express';
import { KeysService } from '../services/keys.service';
import { AuthenticatedRequest } from '../types/common';

export const verifyKey = (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = KeysService.verifyKey(req.body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getKeys = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const keys = KeysService.getKeys(req.user!);
    return res.json(keys);
  } catch (err) {
    next(err);
  }
};

export const generateKeys = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = KeysService.generateKeys(req.user!, req.body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const resetHwid = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = KeysService.resetHwid(req.user!, req.body.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteKey = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = KeysService.deleteKey(req.user!, req.body.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteExpiredKeys = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = KeysService.deleteExpiredKeys(req.user!);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
