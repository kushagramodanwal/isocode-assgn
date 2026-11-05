import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { originCheckMiddleware } from './middleware/originCheck.js';
import { sessionMiddleware } from './middleware/session.js';
import { aiRouter } from './modules/ai-capture/ai.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { catalogueRouter } from './modules/catalogue/catalogue.routes.js';
import { deskRouter } from './modules/desk/desk.routes.js';
import { exportsRouter } from './modules/exports/exports.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { config } from './platform/config.js';
import { errorHandler } from './platform/errors.js';
import { logger } from './platform/logger.js';

export function createApp() {
  const app = express();

  // Basic security & parsing
  app.use(helmet());
  app.use(
    cors({
      origin: config.WEB_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Platform middlewares
  app.use(sessionMiddleware);
  app.use(originCheckMiddleware);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: config.NODE_ENV,
    });
  });

  // API v1 routes
  const v1 = express.Router();
  v1.use('/auth', authRouter);
  v1.use('/', catalogueRouter);
  v1.use('/', ordersRouter);
  v1.use('/', notificationsRouter);
  v1.use('/', aiRouter);
  v1.use('/', deskRouter);
  v1.use('/', exportsRouter);

  app.use('/api/v1', v1);

  // Global error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  const port = config.PORT;
  app.listen(port, () => {
    logger.info(`FMCG Retailer API server running on port ${port} (${config.NODE_ENV})`);
    logger.info(`Web Origin: ${config.WEB_ORIGIN}`);
    logger.info(`Dev OTP: ${config.DEV_OTP_ENABLED ? 'ENABLED (demo code: ' + config.DEMO_OTP_CODE + ')' : 'DISABLED'}`);
    logger.info(`Mocks: Messaging=${config.MESSAGING_PROVIDER}, Payment=${config.PAYMENT_PROVIDER}, LLM=${config.LLM_PROVIDER}`);
  });
}
