import { Router } from 'express';
import { registerRouteRole, requireRole } from '../../middleware/requireRole.js';
import { serializeBigInts } from '../../platform/bigint.js';
import { prisma } from '../../platform/prisma.js';

export const notificationsRouter = Router();

registerRouteRole('/notifications', 'GET', ['retailer', 'desk']);

notificationsRouter.get(
  '/notifications',
  requireRole(['retailer', 'desk']),
  async (req, res, next) => {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      // Caller's own notifications only (Spec 4.9 & 4.11)
      const notifications = await prisma.notification.findMany({
        where: {
          OR: [{ userId: req.user!.id }, { userId: null }],
        },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: string | undefined = undefined;
      if (notifications.length > limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem?.id;
      }

      res.json(serializeBigInts({ notifications, nextCursor }));
    } catch (err) {
      next(err);
    }
  }
);
