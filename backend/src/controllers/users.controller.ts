import { Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { AuthenticatedRequest } from '../types/common';

export const getUsers = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = UsersService.getUsers(req.user!);
    return res.json(users);
  } catch (err) {
    next(err);
  }
};

export const createUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = UsersService.createUser(req.user!, req.body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const toggleBlockUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, isBlocked } = req.body;
    const result = UsersService.toggleBlockUser(req.user!, userId, isBlocked);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    const result = UsersService.deleteUser(req.user!, userId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const updateTokens = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, amount, tokens, action } = req.body;
    const actualAmount = amount !== undefined ? amount : tokens;
    const actualAction = action || (actualAmount >= 0 ? 'add' : 'deduct');
    const result = UsersService.updateTokens(req.user!, userId, Math.abs(Number(actualAmount)), actualAction);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
