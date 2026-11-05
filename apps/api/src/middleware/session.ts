import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../platform/prisma.js';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: 'retailer' | 'desk';
  retailerId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const rawToken =
      req.cookies?.session ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!rawToken) {
      return next();
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || !session.user.active) {
      return next();
    }

    // Inactivity check: 12 hours max inactivity
    const now = new Date();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const timeSinceLastSeen = now.getTime() - new Date(session.lastSeenAt).getTime();

    if (now > session.expiresAt || timeSinceLastSeen > twelveHoursMs) {
      // Session expired
      return next();
    }

    // Update lastSeenAt (non-blocking)
    prisma.session
      .update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      })
      .catch(() => {});

    req.user = {
      id: session.user.id,
      phone: session.user.phone,
      role: session.user.role as 'retailer' | 'desk',
      retailerId: session.user.retailerId,
    };
    req.sessionToken = rawToken;

    next();
  } catch (err) {
    next(err);
  }
}
