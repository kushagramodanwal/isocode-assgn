import type { Metadata } from "next";
import Link from "next/link";
import { requireDesk } from "@/lib/auth";
import { db } from "@/lib/db";
import { Empty } from "@/components/Empty";
import { exportAction } from "../actions";
import { rupees } from "@/lib/money";
import { when } from "@/lib/dates";
import { voucherNumber } from "@/domain/tally";

export const metadata: Metadata = { title: "Tally export" };
export const dynamic = "force-dynamic";

export default async function ExportPage({ searchParams }: { searchParams: Promise<{ batch?: string; error?: string }> }) {
  await requireDesk();
  const sp = await searchParams;
  const [ready, batches] = await Promise.all([
    db.order.findMany({ where: { status: "CONFIRMED" }, orderBy: { number: "asc" }, include: { retailer: true, _count: { select: { lines: true } } } }),
    db.exportBatch.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { createdBy: true, orders: { select: { totalPaise: true } } } }),
  ]);
  const total = ready.reduce((s, o) => s + o.totalPaise, 0);
  const justMade = sp.batch ? batches.find((b) => b.id === sp.batch) : undefined;

  return (
    <div className="space-y-8">
      {justMade && (
        <div role="status" className="card flex flex-wrap items-center justify-between gap-3 border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4">
          <p className="font-medium text-[var(--color-accent)]">✓ {justMade.orders.length} orders moved to a Tally batch. Download and import it in Tally (Import → Vouchers).</p>
          <div className="flex gap-2">
            <a className="btn btn-primary btn-sm" href={`/api/export/${justMade.id}?format=xml`}>Download Tally XML</a>
            <a className="btn btn-secondary btn-sm" href={`/api/export/${justMade.id}?format=csv`}>CSV</a>
          </div>
        </div>
      )}
      {sp.error && <p role="alert" className="rounded-xl bg-[var(--color-warn-soft)] px-4 py-3 text-sm text-[var(--color-warn)]">{sp.error === "none" ? "Select at least one order." : "Those orders were already exported by someone else. The list is refreshed."}</p>}

      <section aria-labelledby="ready-h">
        <div className="mb-3">
          <h1 id="ready-h" className="text-lg font-bold">Ready for Tally</h1>
          <p className="text-sm text-[var(--color-muted)]">Confirmed orders become Sales Order vouchers. Free goods go in as actual vs billed quantity. Orders on credit hold are not included.</p>
        </div>
        {ready.length === 0 ? (
          <Empty title="Nothing waiting" body="Confirmed orders appear here until they are exported." />
        ) : (
          <form action={exportAction} className="card overflow-hidden">
            <ul className="divide-y divide-[var(--color-line)]">
              {ready.map((o) => (
                <li key={o.id}>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2">
                    <input type="checkbox" name="orderId" value={o.id} defaultChecked className="h-5 w-5 accent-[var(--color-accent)]" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{voucherNumber(o.number)}</span> · {o.retailer.shopName}
                      <span className="block text-xs text-[var(--color-muted)]">{when(o.createdAt)} · {o._count.lines} lines · {o.source === "CAPTURE" ? "from message" : "app"}</span>
                    </span>
                    <span className="num font-semibold">{rupees(o.totalPaise)}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3">
              <p className="num text-sm">{ready.length} orders · {rupees(total)}</p>
              <button className="btn btn-primary">Export selected to Tally</button>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="batch-h">
        <h2 id="batch-h" className="mb-3 text-lg font-bold">Earlier exports</h2>
        {batches.length === 0 ? <Empty title="No exports yet" body="Each export is kept so it can be downloaded again." /> : (
          <ul className="card divide-y divide-[var(--color-line)]">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{when(b.createdAt)}</p>
                  <p className="num text-xs text-[var(--color-muted)]">{b.orders.length} orders · {rupees(b.orders.reduce((s, o) => s + o.totalPaise, 0))} · {b.createdBy.name}</p>
                </div>
                <div className="flex gap-2">
                  <a className="btn btn-secondary btn-sm" href={`/api/export/${b.id}?format=xml`}>XML</a>
                  <a className="btn btn-secondary btn-sm" href={`/api/export/${b.id}?format=csv`}>CSV</a>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-[var(--color-faint)]"><Link href="/desk/orders?status=EXPORTED" className="underline">See all exported orders</Link></p>
      </section>
    </div>
  );
}
