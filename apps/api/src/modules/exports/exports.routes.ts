import { DeskExportRequestSchema } from '@retailer/domain';
import { Router } from 'express';
import { registerRouteRole, requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { serializeBigInts } from '../../platform/bigint.js';
import { ExportsService } from './exports.service.js';

export const exportsRouter = Router();
const exportsService = new ExportsService();

registerRouteRole('/desk/exports/csv', 'POST', ['desk']);
registerRouteRole('/desk/exports', 'GET', ['desk']);
registerRouteRole('/desk/exports/:batchId', 'GET', ['desk']);
registerRouteRole('/desk/exports/:batchId/file', 'GET', ['desk']);

exportsRouter.post(
  '/desk/exports/csv',
  requireRole(['desk']),
  validateBody(DeskExportRequestSchema),
  async (req, res, next) => {
    try {
      const result = await exportsService.exportOrdersToCsv(
        req.body.orderIds,
        req.user!.id
      );
      res.json(serializeBigInts(result));
    } catch (err) {
      next(err);
    }
  }
);

exportsRouter.get('/desk/exports', requireRole(['desk']), async (req, res, next) => {
  try {
    const batches = await exportsService.listBatches();
    res.json(serializeBigInts(batches));
  } catch (err) {
    next(err);
  }
});

exportsRouter.get(
  '/desk/exports/:batchId',
  requireRole(['desk']),
  async (req, res, next) => {
    try {
      const batch = await exportsService.getBatch(req.params.batchId as string);
      res.json(serializeBigInts(batch));
    } catch (err) {
      next(err);
    }
  }
);

exportsRouter.get(
  '/desk/exports/:batchId/file',
  requireRole(['desk']),
  async (req, res, next) => {
    try {
      const csv = await exportsService.getBatchFile(req.params.batchId as string);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="tally_orders_${req.params.batchId}.csv"`
      );
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
);
