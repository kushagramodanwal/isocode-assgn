import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { requireDesk } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusPill } from "@/components/StatusPill";
import { Empty } from "@/components/Empty";
import { rupees } from "@/lib/money";
import { when } from "@/lib/dates";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const TABS: { key: OrderStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CONFIRMED", label: "Ready for Tally" },
  { key: "CREDIT_HOLD", label: "Credit hold" },
  { key: "EXPORTED", label: "Exported" },
  { key: "REJECTED", label: "Rejected" },
];

export default async function DeskOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireDesk();
  const sp = await searchParams;
  const status = TABS.find((t) => t.key === sp.status)?.key ?? "ALL";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const num = /^\d+$/.test(q) ? Number(q) : null;
  const orders = await db.order.findMany({
    where: {
      ...(status === "ALL" ? {} : { status }),
      ...(q ? { OR: [{ retailer: { shopName: { contains: q, mode: "insensitive" } } }, ...(num ? [{ number: num }] : [])] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { retailer: true, _count: { select: { lines: true } } },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold">Orders</h1>
        <form className="flex gap-2" role="search">
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <label htmlFor="q" className="sr-only">Search orders</label>
          <input id="q" name="q" defaultValue={q} placeholder="Shop or order no." className="field h-11 min-h-0 w-56" />
          <button className="btn btn-secondary btn-sm">Search</button>
        </form>
      </div>
      <nav className="no-scrollbar mb-4 flex gap-1 overflow-x-auto" aria-label="Status">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === "ALL" ? "/desk/orders" : `/desk/orders?status=${t.key}`} aria-current={status === t.key ? "page" : undefined}
            className={`btn btn-sm shrink-0 ${status === t.key ? "btn-primary" : "btn-secondary"}`}>{t.label}</Link>
        ))}
      </nav>
      {orders.length === 0 ? (
        <Empty title="No orders here" body={q ? "Try another shop name or order number." : "Orders appear here once placed in the app or confirmed from a message."} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="hidden bg-[var(--color-bg)] text-left text-xs text-[var(--color-muted)] md:table-header-group">
              <tr><th className="px-4 py-2 font-medium">Order</th><th className="px-4 py-2 font-medium">Shop</th><th className="px-4 py-2 font-medium">Placed</th><th className="px-4 py-2 font-medium">Source</th><th className="px-4 py-2 text-right font-medium">Total</th><th className="px-4 py-2 font-medium">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {orders.map((o) => (
                <tr key={o.id} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-3 md:table-row md:px-0 md:py-0">
                  <td className="md:px-4 md:py-3"><Link href={`/desk/orders/${o.id}`} className="font-semibold text-[var(--color-accent)] underline-offset-2 hover:underline">#{o.number}</Link><span className="md:hidden"> · {o.retailer.shopName}</span></td>
                  <td className="hidden md:table-cell md:px-4 md:py-3">{o.retailer.shopName}<span className="block text-xs text-[var(--color-faint)]">{o.retailer.area}</span></td>
                  <td className="text-[var(--color-muted)] md:px-4 md:py-3">{when(o.createdAt)}</td>
                  <td className="text-[var(--color-muted)] md:px-4 md:py-3">{o.source === "CAPTURE" ? "Message" : "App"} · {o._count.lines} lines</td>
                  <td className="num font-semibold md:px-4 md:py-3 md:text-right">{rupees(o.totalPaise)}</td>
                  <td className="md:px-4 md:py-3"><StatusPill status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
