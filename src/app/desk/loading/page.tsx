import type { Metadata } from "next";
import { requireDesk } from "@/lib/auth";
import { db } from "@/lib/db";
import { Empty } from "@/components/Empty";

export const metadata: Metadata = { title: "Van loading" };
export const dynamic = "force-dynamic";

/** Cases to load per route: every accepted order not yet loaded (assumption: confirmed or exported in the last 24 hours). */
export default async function LoadingList() {
  await requireDesk();
  const since = new Date(Date.now() - 24 * 3_600_000);
  const lines = await db.orderLine.findMany({
    where: { order: { status: { in: ["CONFIRMED", "EXPORTED"] }, createdAt: { gte: since } } },
    include: { product: true, order: { include: { retailer: true } } },
  });
  const routes = new Map<string, { shops: Set<string>; skus: Map<string, { name: string; code: string; paid: number; free: number }> }>();
  for (const l of lines) {
    const r = routes.get(l.order.retailer.route) ?? { shops: new Set(), skus: new Map() };
    r.shops.add(l.order.retailer.shopName);
    const s = r.skus.get(l.productId) ?? { name: `${l.product.name} ${l.product.packLabel}`, code: l.product.code, paid: 0, free: 0 };
    s.paid += l.cases;
    s.free += l.freeCases;
    r.skus.set(l.productId, s);
    routes.set(l.order.retailer.route, r);
  }
  const sorted = [...routes.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Van loading list</h1>
          <p className="text-sm text-[var(--color-muted)]">Accepted orders from the last 24 hours, by route. Free cases are loaded too.</p>
        </div>
      </div>
      {sorted.length === 0 ? <Empty title="Nothing to load" body="Confirmed orders from the last 24 hours show here by route." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map(([route, r]) => {
            const skus = [...r.skus.values()].sort((a, b) => a.code.localeCompare(b.code));
            const total = skus.reduce((s, x) => s + x.paid + x.free, 0);
            return (
              <section key={route} className="card p-4">
                <h2 className="font-semibold">{route}</h2>
                <p className="mb-3 text-xs text-[var(--color-muted)]">{r.shops.size} shops · {total} cases</p>
                <table className="num w-full text-sm">
                  <thead className="text-left text-xs text-[var(--color-muted)]"><tr><th className="py-1 font-medium">SKU</th><th className="py-1 text-right font-medium">Billed</th><th className="py-1 text-right font-medium">Free</th><th className="py-1 text-right font-medium">Load</th></tr></thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {skus.map((s) => (
                      <tr key={s.code}><td className="py-1.5">{s.name}<span className="block text-xs text-[var(--color-faint)]">{s.code}</span></td><td className="text-right">{s.paid}</td><td className="text-right text-[var(--color-accent)]">{s.free || ""}</td><td className="text-right font-semibold">{s.paid + s.free}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
