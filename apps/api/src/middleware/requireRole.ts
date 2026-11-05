import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../platform/errors.js';

export type Role = 'retailer' | 'desk';

// Route role declaration registry for default-deny startup verification (Rule 12)
export const declaredRouteRoles = new Map<string, Role[]>();

export function registerRouteRole(path: string, method: string, roles: Role[]) {
  declaredRouteRoles.set(`${method.toUpperCase()} ${path}`, roles);
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Sign in required to access this resource'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: required role ${allowedRoles.join(' or ')}, but user has ${req.user.role}`
        )
      );
    }

    next();
  };
}
