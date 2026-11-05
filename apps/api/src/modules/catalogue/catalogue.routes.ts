import { Router } from 'express';
import { registerRouteRole, requireRole } from '../../middleware/requireRole.js';
import { serializeBigInts } from '../../platform/bigint.js';
import { CatalogueService } from './catalogue.service.js';

export const catalogueRouter = Router();
const catalogueService = new CatalogueService();

// Register roles for default-deny test (Rule 12)
registerRouteRole('/skus', 'GET', ['retailer', 'desk']);
registerRouteRole('/skus/:id', 'GET', ['retailer', 'desk']);
registerRouteRole('/schemes/active', 'GET', ['retailer', 'desk']);

catalogueRouter.get('/skus', requireRole(['retailer', 'desk']), async (req, res, next) => {
  try {
    const q = req.query.q as string | undefined;
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await catalogueService.getSkus({
      retailerId: req.user?.retailerId,
      searchQuery: q,
      cursor,
      limit,
    });

    res.json(serializeBigInts(result));
  } catch (err) {
    next(err);
  }
});

catalogueRouter.get('/skus/:id', requireRole(['retailer', 'desk']), async (req, res, next) => {
  try {
    const result = await catalogueService.getSkuById(req.params.id as string, req.user?.retailerId);
    res.json(serializeBigInts(result));
  } catch (err) {
    next(err);
  }
});

catalogueRouter.get('/schemes/active', requireRole(['retailer', 'desk']), async (req, res, next) => {
  try {
    const result = await catalogueService.getActiveSchemes(req.user?.retailerId);
    res.json(serializeBigInts(result));
  } catch (err) {
    next(err);
  }
});
