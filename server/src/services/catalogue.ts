import type { Prisma } from "@prisma/client";
import { db } from "../db";
import type { Slab } from "../../../shared/pricing";

export { toPriced, toSchemeRule, type CatalogueItem } from "../../../shared/catalogue";
import type { CatalogueItem } from "../../../shared/catalogue";

function parseSlabs(json: Prisma.JsonValue | null): Slab[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((x) => {
    if (x && typeof x === "object" && !Array.isArray(x) && typeof x.minCases === "number" && typeof x.percentBp === "number") {
      return [{ minCases: x.minCases, percentBp: x.percentBp }];
    }
    return [];
  });
}

/**
 * The catalogue as one retailer sees it: their own price where one is set.
 * Only live schemes are sent; the engine re-checks the dates anyway.
 */
export async function catalogueFor(retailerId: string, tx: Prisma.TransactionClient = db): Promise<CatalogueItem[]> {
  const now = new Date();
  const products = await tx.product.findMany({
    where: { active: true },
    include: {
      brand: true,
      prices: { where: { retailerId } },
      schemes: { where: { active: true, validFrom: { lte: now }, validTo: { gte: now } } },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }, { unitPricePaise: "asc" }],
  });
  return products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    nameHi: p.nameHi,
    brand: p.brand.name,
    category: p.category,
    packLabel: p.packLabel,
    unitsPerCase: p.unitsPerCase,
    unitPricePaise: p.prices[0]?.unitPricePaise ?? p.unitPricePaise,
    basePricePaise: p.unitPricePaise,
    gstRateBp: p.gstRateBp,
    stockCases: p.stockCases,
    image: p.image,
    keywords: p.keywords,
    schemes: p.schemes.map((s) => ({
      id: s.id,
      type: s.type,
      buyCases: s.buyCases,
      freeCases: s.freeCases,
      slabs: parseSlabs(s.slabs),
      validFrom: s.validFrom.toISOString(),
      validTo: s.validTo.toISOString(),
    })),
  }));
}

/** SKUs this retailer orders most, for "frequently bought" and capture matching. */
export async function orderHistory(retailerId: string, tx: Prisma.TransactionClient = db): Promise<Map<string, number>> {
  const rows = await tx.orderLine.groupBy({
    by: ["productId"],
    where: { order: { retailerId, status: { not: "REJECTED" } } },
    _count: { productId: true },
  });
  return new Map(rows.map((r) => [r.productId, r._count.productId]));
}
