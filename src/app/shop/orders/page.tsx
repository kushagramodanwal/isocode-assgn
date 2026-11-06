import type { Metadata } from "next";
import Link from "next/link";
import { requireRetailer } from "@/lib/auth";
import { db } from "@/lib/db";
import { dict } from "@/lib/i18n";
import { rupees } from "@/lib/money";
import { when } from "@/lib/dates";
import { StatusPill } from "@/components/StatusPill";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireRetailer();
  const t = dict[user.lang];
  const orders = await db.order.findMany({
    where: { retailerId: user.retailerId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { lines: true } } },
  });
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-xl font-bold">{t.orders}</h1>
      {orders.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-medium">{t.noOrders}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{t.noOrdersHint}</p>
          <Link href="/shop" className="btn btn-primary mt-4">{t.browse}</Link>
        </div>
      ) : (
        <ul className="card divide-y divide-[var(--color-line)]">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/shop/orders/${o.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{t.orderNo(o.number)} <span className="text-sm font-normal text-[var(--color-muted)]">· {o._count.lines} items</span></p>
                  <p className="text-xs text-[var(--color-muted)]">{when(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="num font-semibold">{rupees(o.totalPaise)}</p>
                  <StatusPill status={o.status} lang={user.lang} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
