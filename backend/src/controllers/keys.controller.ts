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
    const keyId = req.body.id || req.body.keyId;
    const result = KeysService.resetHwid(req.user!, keyId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteKey = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const keyId = req.body.id || req.body.keyId;
    const result = KeysService.deleteKey(req.user!, keyId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const extendKey = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const keyId = req.body.id || req.body.keyId;
    const days = req.body.days !== undefined ? req.body.days : req.body.additionalDays;
    const note = req.body.note;
    const result = KeysService.extendKey(req.user!, keyId, days, note);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const updateKeyNote = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const keyId = req.body.id || req.body.keyId;
    const { note } = req.body;
    const result = KeysService.updateKeyNote(req.user!, keyId, note);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const updateReceipt = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const keyId = req.body.id || req.body.keyId;
    const paymentScreenshot = req.body.paymentScreenshot || req.body.screenshot || req.body.receipt;
    const result = KeysService.updateKeyReceipt(req.user!, keyId, paymentScreenshot);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const bulkResetHwid = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const ids = req.body.ids || req.body.keyIds;
    const result = KeysService.bulkResetHwid(req.user!, ids);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const bulkDeleteKeys = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const ids = req.body.ids || req.body.keyIds;
    const result = KeysService.bulkDeleteKeys(req.user!, ids);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const bulkExtendKeys = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const ids = req.body.ids || req.body.keyIds;
    const days = req.body.days !== undefined ? req.body.days : req.body.additionalDays;
    const result = KeysService.bulkExtendKeys(req.user!, ids, days);
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
