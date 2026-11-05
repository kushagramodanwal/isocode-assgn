import {
  CartPreviewRequestSchema,
  OrderPlacementSchema,
  PaymentModeSchema,
} from '@retailer/domain';
import { Router } from 'express';
import { z } from 'zod';
import { requireIdempotencyKey } from '../../middleware/idempotency.js';
import { registerRouteRole, requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { serializeBigInts } from '../../platform/bigint.js';
import { BadRequestError } from '../../platform/errors.js';
import { OrdersService } from './orders.service.js';

export const ordersRouter = Router();
const ordersService = new OrdersService();

registerRouteRole('/cart/preview', 'POST', ['retailer', 'desk']);
registerRouteRole('/orders', 'POST', ['retailer']);
registerRouteRole('/orders', 'GET', ['retailer']);
registerRouteRole('/orders/:id', 'GET', ['retailer']);
registerRouteRole('/orders/:id/cancel', 'POST', ['retailer']);
registerRouteRole('/orders/:id/retry-payment', 'POST', ['retailer']);

ordersRouter.post(
  '/cart/preview',
  requireRole(['retailer', 'desk']),
  validateBody(CartPreviewRequestSchema),
  async (req, res, next) => {
    try {
      const retailerId = req.user?.retailerId;
      if (!retailerId) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'No retailer associated with session' });
      }

      const preview = await ordersService.previewCart(retailerId, req.body.lines);
      res.json(serializeBigInts(preview));
    } catch (err) {
      next(err);
    }
  }
);

ordersRouter.post(
  '/orders',
  requireRole(['retailer']),
  requireIdempotencyKey,
  validateBody(OrderPlacementSchema),
  async (req, res, next) => {
    try {
      const retailerId = req.user?.retailerId;
      if (!retailerId) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'No retailer associated with session' });
      }

      const idempotencyKey = req.headers['idempotency-key'] as string;

      const result = await ordersService.placeOrder({
        userId: req.user!.id,
        retailerId,
        idempotencyKey,
        lines: req.body.lines,
        paymentMode: req.body.paymentMode,
        demoPaymentOutcome: req.body.demoPaymentOutcome,
        aiDraftId: req.body.aiDraftId,
      });

      res.status(result.isReplay ? 200 : 201).json(serializeBigInts(result.order));
    } catch (err) {
      next(err);
    }
  }
);

ordersRouter.get('/orders', requireRole(['retailer']), async (req, res, next) => {
  try {
    const retailerId = req.user?.retailerId;
    if (!retailerId) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'No retailer associated with session' });
    }

    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await ordersService.listOrdersForRetailer(retailerId, cursor, limit);
    res.json(serializeBigInts(result));
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/orders/:id', requireRole(['retailer']), async (req, res, next) => {
  try {
    const retailerId = req.user?.retailerId;
    if (!retailerId) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'No retailer associated with session' });
    }

    const order = await ordersService.findOrderForRetailer(req.params.id as string, retailerId);
    res.json(serializeBigInts(order));
  } catch (err) {
    next(err);
  }
});

ordersRouter.post('/orders/:id/cancel', requireRole(['retailer']), async (req, res, next) => {
  try {
    const retailerId = req.user?.retailerId;
    if (!retailerId) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'No retailer associated with session' });
    }

    const updated = await ordersService.cancelOrder(req.params.id as string, retailerId, req.user!.id);
    res.json(serializeBigInts(updated));
  } catch (err) {
    next(err);
  }
});

const RetryPaymentBodySchema = z.object({
  paymentMode: PaymentModeSchema,
  demoPaymentOutcome: z.enum(['succeeds', 'fails']).optional(),
});

ordersRouter.post(
  '/orders/:id/retry-payment',
  requireRole(['retailer']),
  validateBody(RetryPaymentBodySchema),
  async (req, res, next) => {
    try {
      const retailerId = req.user?.retailerId;
      if (!retailerId) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'No retailer associated with session' });
      }

      const updated = await ordersService.retryPayment(
        req.params.id as string,
        retailerId,
        req.user!.id,
        req.body.paymentMode,
        req.body.demoPaymentOutcome
      );

      res.json(serializeBigInts(updated));
    } catch (err) {
      next(err);
    }
  }
);
