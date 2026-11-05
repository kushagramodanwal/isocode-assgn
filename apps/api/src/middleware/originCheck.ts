import { NextFunction, Request, Response } from 'express';
import { config } from '../platform/config.js';
import { ForbiddenError } from '../platform/errors.js';

export function originCheckMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  // Only check state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    // In dev / test or curl/supertest, allow if origin matches config.WEB_ORIGIN or is empty from API testing
    if (origin && config.NODE_ENV === 'production') {
      if (origin !== config.WEB_ORIGIN) {
        return next(new ForbiddenError('Invalid request origin (CSRF violation)'));
      }
    }
  }
  next();
}
