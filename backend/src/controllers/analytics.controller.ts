import { Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { AuthenticatedRequest } from '../types/common';

export const getAnalytics = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = AnalyticsService.getAnalytics(req.user!);
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getResellerAnalytics = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const resellerId = req.params.id;
    const data = AnalyticsService.getResellerAnalytics(resellerId);
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getTelemetry = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = AnalyticsService.getTelemetry();
    return res.json(data);
  } catch (err) {
    next(err);
  }
};
