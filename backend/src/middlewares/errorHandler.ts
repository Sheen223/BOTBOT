import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ success: false, message: 'Internal Server Error' });
};
