import { db } from "../db";

export type QuietRetailer = {
  id: string; code: string; shopName: string; ownerName: string; phone: string; area: string; route: string;
  lastOrderAt: Date | null; daysQuiet: number | null; ordersLast60: number; avgOrderPaise: number;
};

/** Retailers with no (non-rejected) order in `days` days, quietest first. */
export async function inactiveRetailers(days: number, now = new Date()): Promise<QuietRetailer[]> {
  const since60 = new Date(now.getTime() - 60 * 86_400_000);
  const [retailers, last, recent] = await Promise.all([
    db.retailer.findMany(),
    db.order.groupBy({ by: ["retailerId"], where: { status: { not: "REJECTED" } }, _max: { createdAt: true } }),
    db.order.groupBy({ by: ["retailerId"], where: { status: { not: "REJECTED" }, createdAt: { gte: since60 } }, _count: true, _avg: { totalPaise: true } }),
  ]);
  const lastBy = new Map(last.map((l) => [l.retailerId, l._max.createdAt]));
  const recentBy = new Map(recent.map((r) => [r.retailerId, r]));
  const cutoff = now.getTime() - days * 86_400_000;
  return retailers
    .map((r) => {
      const lastOrderAt = lastBy.get(r.id) ?? null;
      const rec = recentBy.get(r.id);
      return {
        id: r.id, code: r.code, shopName: r.shopName, ownerName: r.ownerName, phone: r.phone, area: r.area, route: r.route,
        lastOrderAt,
        daysQuiet: lastOrderAt ? Math.floor((now.getTime() - lastOrderAt.getTime()) / 86_400_000) : null,
        ordersLast60: rec?._count ?? 0,
        avgOrderPaise: Math.round(rec?._avg.totalPaise ?? 0),
      };
    })
    .filter((r) => !r.lastOrderAt || r.lastOrderAt.getTime() < cutoff)
    .sort((a, b) => (b.daysQuiet ?? Infinity) - (a.daysQuiet ?? Infinity));
}
