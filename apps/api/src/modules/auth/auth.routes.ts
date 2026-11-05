import { OtpRequestSchema, OtpVerifySchema } from '@retailer/domain';
import { Router } from 'express';
import { registerRouteRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { serializeBigInts } from '../../platform/bigint.js';
import { config } from '../../platform/config.js';
import { AuthService } from './auth.service.js';

export const authRouter = Router();
const authService = new AuthService();

// Register public auth routes
registerRouteRole('/auth/otp/request', 'POST', ['retailer', 'desk']);
registerRouteRole('/auth/otp/verify', 'POST', ['retailer', 'desk']);
registerRouteRole('/auth/logout', 'POST', ['retailer', 'desk']);
registerRouteRole('/auth/me', 'GET', ['retailer', 'desk']);

authRouter.post(
  '/otp/request',
  validateBody(OtpRequestSchema),
  async (req, res, next) => {
    try {
      const result = await authService.requestOtp(req.body.phone);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/otp/verify',
  validateBody(OtpVerifySchema),
  async (req, res, next) => {
    try {
      const result = await authService.verifyOtp(req.body.phone, req.body.code);

      // Set session cookie
      res.cookie('session', result.token, {
        httpOnly: true,
        secure: config.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: 12 * 60 * 60 * 1000,
      });

      res.json(serializeBigInts(result));
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post('/logout', async (req, res, next) => {
  try {
    if (req.sessionToken) {
      await authService.logout(req.sessionToken);
    }
    res.clearCookie('session');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not logged in' });
    }
    const me = await authService.getMe(req.user.id);
    res.json(serializeBigInts(me));
  } catch (err) {
    next(err);
  }
});
