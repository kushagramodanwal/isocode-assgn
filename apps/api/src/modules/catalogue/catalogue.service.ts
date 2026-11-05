import { NotFoundError } from '../../platform/errors.js';
import { prisma } from '../../platform/prisma.js';

export interface SkuWithPricing {
  id: string;
  code: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  onHandCases: number;
  stockBand: 'in_stock' | 'low' | 'out';
  unitPricePaise: bigint;
  gstInclusive: boolean;
  activeSchemes: Array<{
    id: string;
    type: string;
    n?: number | null;
    m?: number | null;
    minCases?: number | null;
    discountBps?: number | null;
    description: string;
  }>;
}

export class CatalogueService {
  async getSkus(params: {
    retailerId?: string | null;
    searchQuery?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: SkuWithPricing[]; nextCursor?: string }> {
    const { retailerId, searchQuery, cursor, limit = 20 } = params;
    const now = new Date();

    const where: any = { active: true };
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skus = await prisma.sku.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { code: 'asc' },
      include: {
        stock: true,
        prices: {
          where: {
            validFrom: { lte: now },
            validTo: { gte: now },
            OR: [
              { retailerId: null },
              ...(retailerId ? [{ retailerId }] : []),
            ],
          },
          orderBy: { validFrom: 'desc' },
        },
        schemes: {
          where: {
            active: true,
            validFrom: { lte: now },
            validTo: { gte: now },
            OR: [
              { retailerId: null },
              ...(retailerId ? [{ retailerId }] : []),
            ],
          },
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (skus.length > limit) {
      const nextItem = skus.pop();
      nextCursor = nextItem?.id;
    }

    const items: SkuWithPricing[] = skus.map((sku) => {
      // Retailer specific price wins when valid, else list price (Spec 4.1)
      let price = sku.prices.find((p) => p.retailerId === retailerId);
      if (!price) {
        price = sku.prices.find((p) => p.retailerId === null);
      }

      const onHand = sku.stock?.onHandCases ?? 0;
      let stockBand: 'in_stock' | 'low' | 'out' = 'in_stock';
      if (onHand <= 0) {
        stockBand = 'out';
      } else if (onHand < 20) {
        stockBand = 'low';
      }

      const activeSchemes = sku.schemes.map((s) => {
        let description = '';
        if (s.type === 'buy_n_get_m') {
          description = `Buy ${s.n} Get ${s.m} Free`;
        } else if (s.type === 'slab') {
          description = `${(s.discountBps ?? 0) / 100}% off on ${s.minCases}+ cases`;
        }
        return {
          id: s.id,
          type: s.type,
          n: s.n,
          m: s.m,
          minCases: s.minCases,
          discountBps: s.discountBps,
          description,
        };
      });

      return {
        id: sku.id,
        code: sku.code,
        name: sku.name,
        brand: sku.brand,
        imageUrl: sku.imageUrl,
        onHandCases: onHand,
        stockBand,
        unitPricePaise: price?.pricePaise ?? 0n,
        gstInclusive: price?.gstInclusive ?? true,
        activeSchemes,
      };
    });

    return { items, nextCursor };
  }

  async getSkuById(id: string, retailerId?: string | null): Promise<SkuWithPricing> {
    const now = new Date();
    const sku = await prisma.sku.findUnique({
      where: { id },
      include: {
        stock: true,
        prices: {
          where: {
            validFrom: { lte: now },
            validTo: { gte: now },
            OR: [
              { retailerId: null },
              ...(retailerId ? [{ retailerId }] : []),
            ],
          },
        },
        schemes: {
          where: {
            active: true,
            validFrom: { lte: now },
            validTo: { gte: now },
            OR: [
              { retailerId: null },
              ...(retailerId ? [{ retailerId }] : []),
            ],
          },
        },
      },
    });

    if (!sku || !sku.active) {
      throw new NotFoundError('Product not found');
    }

    let price = sku.prices.find((p) => p.retailerId === retailerId);
    if (!price) {
      price = sku.prices.find((p) => p.retailerId === null);
    }

    const onHand = sku.stock?.onHandCases ?? 0;
    let stockBand: 'in_stock' | 'low' | 'out' = 'in_stock';
    if (onHand <= 0) {
      stockBand = 'out';
    } else if (onHand < 20) {
      stockBand = 'low';
    }

    const activeSchemes = sku.schemes.map((s) => ({
      id: s.id,
      type: s.type,
      n: s.n,
      m: s.m,
      minCases: s.minCases,
      discountBps: s.discountBps,
      description:
        s.type === 'buy_n_get_m'
          ? `Buy ${s.n} Get ${s.m} Free`
          : `${(s.discountBps ?? 0) / 100}% off on ${s.minCases}+ cases`,
    }));

    return {
      id: sku.id,
      code: sku.code,
      name: sku.name,
      brand: sku.brand,
      imageUrl: sku.imageUrl,
      onHandCases: onHand,
      stockBand,
      unitPricePaise: price?.pricePaise ?? 0n,
      gstInclusive: price?.gstInclusive ?? true,
      activeSchemes,
    };
  }

  async getActiveSchemes(retailerId?: string | null) {
    const now = new Date();
    return prisma.scheme.findMany({
      where: {
        active: true,
        validFrom: { lte: now },
        validTo: { gte: now },
        OR: [{ retailerId: null }, ...(retailerId ? [{ retailerId }] : [])],
      },
      include: { sku: true },
    });
  }
}
