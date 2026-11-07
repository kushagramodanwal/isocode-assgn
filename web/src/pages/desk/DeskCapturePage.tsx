import { Link, useParams } from "react-router-dom";
import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { CaptureReview } from "../../components/CaptureReview";
import { StatusPill } from "../../components/StatusPill";
import { rupees, rupeesShort } from "../../../../shared/money";
import { ago, day } from "../../../../shared/dates";
import type { DeskCaptureContext } from "../../../../shared/api";

export function DeskCapturePage() {
  const { id } = useParams();
  const q = useQuery<DeskCaptureContext>(`/desk/captures/${id}`);
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Skeleton rows={3} className="h-48" />;
  const { capture: view, credit, recent, aliases } = q.data;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-4">
          <Link to="/desk" className="text-sm text-[var(--color-muted)]">Inbox</Link>
          <h1 className="mt-1 text-lg font-bold">{view.retailer.shopName}</h1>
          <p className="text-sm text-[var(--color-muted)]">{view.retailer.area} · {view.retailer.code} · received {ago(new Date(view.createdAt))} · by {view.createdBy}</p>
        </div>
        {view.status !== "NEEDS_REVIEW" && view.orderId && (
          <p className="mb-4 text-sm">Already confirmed: <Link className="text-[var(--color-accent)] underline" to={`/desk/orders/${view.orderId}`}>open the order</Link></p>
        )}
        <CaptureReview lang="en" role="DESK" capture={view} catalogue={view.catalogue} />
      </div>
      <aside className="space-y-4">
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-[var(--color-muted)]">Credit</h2>
          <p className={`num mt-1 text-xl font-bold ${credit.availablePaise < 0 ? "text-[var(--color-danger)]" : ""}`}>{rupees(credit.availablePaise)}</p>
          <p className="num text-xs text-[var(--color-muted)]">available of {rupeesShort(credit.limitPaise)} · outstanding {rupeesShort(credit.outstandingPaise)} (Tally, {day(new Date(credit.outstandingAsOf))})</p>
          <p className="mt-2 text-xs text-[var(--color-faint)]">If this order goes over, it is saved on credit hold.</p>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">Recent orders</h2>
          {recent.length === 0 ? <p className="text-sm text-[var(--color-muted)]">None yet</p> : (
            <ul className="space-y-2 text-sm">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2">
                  <Link to={`/desk/orders/${o.id}`} className="underline-offset-2 hover:underline">#{o.number} · {ago(new Date(o.createdAt))}</Link>
                  <StatusPill status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">This shop&apos;s words</h2>
          {aliases.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Nothing learned yet. When you change a product on a line, the shop&apos;s words are remembered.</p> : (
            <ul className="space-y-1 text-sm">{aliases.map((a) => <li key={a.id}><q>{a.phrase}</q> → {a.product}</li>)}</ul>
          )}
        </section>
      </aside>
    </div>
  );
}
