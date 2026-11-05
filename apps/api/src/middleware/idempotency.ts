import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../platform/errors.js';

export function requireIdempotencyKey(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const key = req.headers['idempotency-key'];
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return next(
      new ValidationError(
        'Idempotency-Key header is required for this request to ensure safe retry'
      )
    );
  }
  next();
}
