import { Response, NextFunction } from 'express';
import { LogsService } from '../services/logs.service';
import { AuthenticatedRequest } from '../types/common';

export const getLogs = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(String(req.query.limit || 500), 10);
    const action = req.query.action as string;
    const username = req.query.username as string;

    const logs = LogsService.getLogs(limit, action, username);
    return res.json(logs);
  } catch (err) {
    next(err);
  }
};

export const clearLogs = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = LogsService.clearLogs();
    LogsService.logAction(req.user!.id, req.user!.username, 'SYSTEM_LOGS_CLEARED', 'Cleared all JSON audit logs history');
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
