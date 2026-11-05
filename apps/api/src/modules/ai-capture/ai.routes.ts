import { AiDraftConfirmSchema, AiDraftCreateSchema } from '@retailer/domain';
import { Router } from 'express';
import { registerRouteRole, requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { serializeBigInts } from '../../platform/bigint.js';
import { prisma } from '../../platform/prisma.js';
import { OrdersService } from '../orders/orders.service.js';
import { AiService } from './ai.service.js';

export const aiRouter = Router();
const aiService = new AiService();
const ordersService = new OrdersService();

registerRouteRole('/ai/drafts', 'POST', ['retailer']);
registerRouteRole('/ai/drafts/:id', 'GET', ['retailer']);
registerRouteRole('/ai/drafts/:id/confirm', 'POST', ['retailer']);

aiRouter.post(
  '/ai/drafts',
  requireRole(['retailer']),
  validateBody(AiDraftCreateSchema),
  async (req, res, next) => {
    try {
      const retailerId = req.user?.retailerId;
      if (!retailerId) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'No retailer associated with session' });
      }

      const draft = await aiService.createDraft(retailerId, req.body.message);
      res.status(201).json(serializeBigInts(draft));
    } catch (err) {
      next(err);
    }
  }
);

aiRouter.get('/ai/drafts/:id', requireRole(['retailer']), async (req, res, next) => {
  try {
    const retailerId = req.user?.retailerId;
    if (!retailerId) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'No retailer associated with session' });
    }

    const draft = await aiService.getDraft(req.params.id as string, retailerId);
    res.json(serializeBigInts(draft));
  } catch (err) {
    next(err);
  }
});

aiRouter.post(
  '/ai/drafts/:id/confirm',
  requireRole(['retailer']),
  validateBody(AiDraftConfirmSchema),
  async (req, res, next) => {
    try {
      const retailerId = req.user?.retailerId;
      if (!retailerId) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'No retailer associated with session' });
      }

      const draft = await aiService.getDraft(req.params.id as string, retailerId);

      const idempotencyKey =
        (req.headers['idempotency-key'] as string) ||
        `AI_CONFIRM_${draft.id}_${Date.now()}`;

      // Place order through standard orders service
      const { order, isReplay } = await ordersService.placeOrder({
        userId: req.user!.id,
        retailerId,
        idempotencyKey,
        lines: req.body.lines,
        paymentMode: req.body.paymentMode,
        demoPaymentOutcome: req.body.demoPaymentOutcome,
        aiDraftId: draft.id,
      });

      // Update draft status
      await prisma.aiDraft.update({
        where: { id: draft.id },
        data: { status: 'confirmed' },
      });

      res.status(isReplay ? 200 : 201).json(serializeBigInts(order));
    } catch (err) {
      next(err);
    }
  }
);
