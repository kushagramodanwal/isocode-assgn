import { notFound } from "next/navigation";
import Link from "next/link";
import { requireDesk } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadCapture } from "@/server/capture-view";
import { creditStatus } from "@/server/credit";
import { CaptureReview } from "@/components/CaptureReview";
import { StatusPill } from "@/components/StatusPill";
import { rupees, rupeesShort } from "@/lib/money";
import { ago, day } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function DeskCaptureReview({ params }: { params: Promise<{ id: string }> }) {
  await requireDesk();
  const { id } = await params;
  const view = await loadCapture(id, null);
  if (!view) notFound();
  const [credit, recent, aliases] = await Promise.all([
    creditStatus(view.retailer.id),
    db.order.findMany({ where: { retailerId: view.retailer.id }, orderBy: { createdAt: "desc" }, take: 4 }),
    db.retailerAlias.findMany({ where: { retailerId: view.retailer.id }, include: { product: true }, take: 10, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-4">
          <Link href="/desk" className="text-sm text-[var(--color-accent)]">← Inbox</Link>
          <h1 className="mt-1 text-lg font-bold">{view.retailer.shopName}</h1>
          <p className="text-sm text-[var(--color-muted)]">{view.retailer.area} · {view.retailer.code} · received {ago(new Date(view.createdAt))} · by {view.createdBy}</p>
        </div>
        {view.status !== "NEEDS_REVIEW" && view.orderId && (
          <p className="mb-4 text-sm">Already confirmed: <Link className="text-[var(--color-accent)] underline" href={`/desk/orders/${view.orderId}`}>open the order</Link></p>
        )}
        <CaptureReview lang="en" role="DESK" capture={view} catalogue={view.catalogue} />
      </div>
      <aside className="space-y-4">
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-[var(--color-muted)]">Credit</h2>
          <p className={`num mt-1 text-xl font-bold ${credit.availablePaise < 0 ? "text-[var(--color-danger)]" : ""}`}>{rupees(credit.availablePaise)}</p>
          <p className="num text-xs text-[var(--color-muted)]">available of {rupeesShort(credit.limitPaise)} · outstanding {rupeesShort(credit.outstandingPaise)} (Tally, {day(credit.outstandingAsOf)})</p>
          <p className="mt-2 text-xs text-[var(--color-faint)]">If this order goes over, it is saved on credit hold.</p>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">Recent orders</h2>
          {recent.length === 0 ? <p className="text-sm text-[var(--color-muted)]">None yet</p> : (
            <ul className="space-y-2 text-sm">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2">
                  <Link href={`/desk/orders/${o.id}`} className="underline-offset-2 hover:underline">#{o.number} · {ago(o.createdAt)}</Link>
                  <StatusPill status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">This shop&apos;s words</h2>
          {aliases.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Nothing learned yet. When you change a product on a line, the shop&apos;s words are remembered.</p> : (
            <ul className="space-y-1 text-sm">
              {aliases.map((a) => <li key={a.id}><q>{a.phrase}</q> → {a.product.name} {a.product.packLabel}</li>)}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
