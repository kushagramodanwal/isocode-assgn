import { DeskLineUpdateSchema, normaliseAliasKey } from '@retailer/domain';
import { Router } from 'express';
import { z } from 'zod';
import { registerRouteRole, requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { serializeBigInts } from '../../platform/bigint.js';
import { BadRequestError } from '../../platform/errors.js';
import { prisma } from '../../platform/prisma.js';
import { DeskService } from './desk.service.js';

export const deskRouter = Router();
const deskService = new DeskService();

registerRouteRole('/desk/orders', 'GET', ['desk']);
registerRouteRole('/desk/orders/:id', 'GET', ['desk']);
registerRouteRole('/desk/orders/:id/lines/:lineId', 'PATCH', ['desk']);
registerRouteRole('/desk/orders/:id/approve', 'POST', ['desk']);
registerRouteRole('/desk/orders/:id/reject', 'POST', ['desk']);
registerRouteRole('/desk/orders/:id/release-hold', 'POST', ['desk']);
registerRouteRole('/desk/aliases', 'GET', ['desk']);
registerRouteRole('/desk/aliases', 'POST', ['desk']);
registerRouteRole('/desk/aliases/:id/deactivate', 'POST', ['desk']);

deskRouter.get('/desk/orders', requireRole(['desk']), async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const retailerId = req.query.retailerId as string | undefined;
    const q = req.query.q as string | undefined;

    const result = await deskService.listQueue({
      status,
      retailerId,
      searchQuery: q,
    });

    res.json(serializeBigInts(result));
  } catch (err) {
    next(err);
  }
});

deskRouter.get('/desk/orders/:id', requireRole(['desk']), async (req, res, next) => {
  try {
    const order = await deskService.getOrderDetail(req.params.id as string);
    res.json(serializeBigInts(order));
  } catch (err) {
    next(err);
  }
});

deskRouter.patch(
  '/desk/orders/:id/lines/:lineId',
  requireRole(['desk']),
  validateBody(DeskLineUpdateSchema),
  async (req, res, next) => {
    try {
      const ifMatch = req.headers['if-match'];
      if (!ifMatch) {
        return res.status(400).json({
          code: 'BAD_REQUEST',
          message: 'If-Match header with order version is required for line modifications',
        });
      }

      const version = parseInt(ifMatch as string, 10);
      if (isNaN(version)) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'Invalid If-Match version header' });
      }

      const updated = await deskService.updateOrderLine({
        orderId: req.params.id as string,
        lineId: req.params.lineId as string,
        ifMatchVersion: version,
        newBilledCases: req.body.billedCases,
        newSkuId: req.body.skuId,
        createAlias: req.body.createAlias,
        aliasPhrase: req.body.aliasPhrase,
        actorUserId: req.user!.id,
      });

      res.json(serializeBigInts(updated));
    } catch (err) {
      next(err);
    }
  }
);

deskRouter.post('/desk/orders/:id/approve', requireRole(['desk']), async (req, res, next) => {
  try {
    const approved = await deskService.approveOrder(req.params.id as string, req.user!.id);
    res.json(serializeBigInts(approved));
  } catch (err) {
    next(err);
  }
});

const RejectBodySchema = z.object({
  reason: z.string().optional(),
});

deskRouter.post(
  '/desk/orders/:id/reject',
  requireRole(['desk']),
  validateBody(RejectBodySchema),
  async (req, res, next) => {
    try {
      const rejected = await deskService.rejectOrder(
        req.params.id as string,
        req.user!.id,
        req.body.reason
      );
      res.json(serializeBigInts(rejected));
    } catch (err) {
      next(err);
    }
  }
);

deskRouter.post('/desk/orders/:id/release-hold', requireRole(['desk']), async (req, res, next) => {
  try {
    const released = await deskService.releaseCreditHold(req.params.id as string, req.user!.id);
    res.json(serializeBigInts(released));
  } catch (err) {
    next(err);
  }
});

// Aliases management
deskRouter.get('/desk/aliases', requireRole(['desk']), async (req, res, next) => {
  try {
    const retailerId = req.query.retailerId as string | undefined;
    const aliases = await prisma.alias.findMany({
      where: {
        ...(retailerId ? { retailerId } : {}),
      },
      include: {
        retailer: true,
        sku: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(serializeBigInts(aliases));
  } catch (err) {
    next(err);
  }
});

const CreateAliasSchema = z.object({
  retailerId: z.string().uuid(),
  phrase: z.string().min(1),
  skuId: z.string().uuid(),
});

deskRouter.post(
  '/desk/aliases',
  requireRole(['desk']),
  validateBody(CreateAliasSchema),
  async (req, res, next) => {
    try {
      const normalised = normaliseAliasKey(req.body.phrase);
      const alias = await prisma.alias.create({
        data: {
          retailerId: req.body.retailerId,
          phraseNormalised: normalised,
          skuId: req.body.skuId,
          active: true,
        },
      });
      res.status(201).json(serializeBigInts(alias));
    } catch (err) {
      next(err);
    }
  }
);

deskRouter.post(
  '/desk/aliases/:id/deactivate',
  requireRole(['desk']),
  async (req, res, next) => {
    try {
      const alias = await prisma.alias.update({
        where: { id: req.params.id as string },
        data: { active: false },
      });
      res.json(serializeBigInts(alias));
    } catch (err) {
      next(err);
    }
  }
);
