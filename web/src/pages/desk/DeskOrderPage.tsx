import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { OrderDetail } from "../../components/OrderDetail";
import { HoldActions } from "../../components/HoldActions";
import { rupees, rupeesShort } from "../../../../shared/money";
import { when } from "../../../../shared/dates";
import type { DeskOrderContext } from "../../../../shared/api";

const ACTIONS: Record<string, string> = {
  "order.placed": "Placed",
  "order.hold_released": "Credit hold released",
  "order.rejected": "Rejected",
  "capture.confirmed": "Confirmed from message",
};

export function DeskOrderPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const q = useQuery<DeskOrderContext>(`/desk/orders/${id}`);
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Skeleton rows={3} />;
  const { order, credit, history } = q.data;
  const learned = Number(params.get("learned") ?? 0);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <Link to="/desk/orders" className="text-sm text-[var(--color-muted)]">Orders</Link>
        {params.get("from") === "capture" && (
          <p role="status" className="my-3 rounded-xl bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-accent-fg)]">
            Order created from the message.{learned > 0 && ` ${learned} correction${learned > 1 ? "s" : ""} saved for this shop's next messages.`}
          </p>
        )}
        <p className="mt-2 font-semibold">{order.retailer.shopName} <span className="font-normal text-[var(--color-muted)]">· {order.retailer.area}</span></p>
        <div className="mt-3"><OrderDetail order={order} lang="en" /></div>
        {(order.status === "CREDIT_HOLD" || order.status === "CONFIRMED") && (
          <div className="card mt-4 p-4">
            <h2 className="mb-2 text-sm font-semibold">Desk actions</h2>
            <HoldActions orderId={order.id} canRelease={order.status === "CREDIT_HOLD"} canReject onDone={q.reload} />
            <p className="mt-2 text-xs text-[var(--color-faint)]">Rejecting returns the reserved stock. Exported orders are corrected in Tally.</p>
          </div>
        )}
      </div>
      <aside className="space-y-4">
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-[var(--color-muted)]">Credit now</h2>
          <p className={`num mt-1 text-xl font-bold ${credit.availablePaise < 0 ? "text-[var(--color-danger)]" : ""}`}>{rupees(credit.availablePaise)}</p>
          <p className="num text-xs text-[var(--color-muted)]">available of {rupeesShort(credit.limitPaise)}</p>
        </section>
        {order.captureText && (
          <section className="card p-4">
            <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">Original message</h2>
            <blockquote className="text-sm whitespace-pre-wrap">{order.captureText}</blockquote>
          </section>
        )}
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">History</h2>
          <ol className="space-y-2 text-sm">
            {history.length === 0 && <li className="text-[var(--color-muted)]">Placed {when(new Date(order.createdAt))} by {order.placedBy}</li>}
            {history.map((l) => (
              <li key={l.id}><span className="font-medium">{ACTIONS[l.action] ?? l.action}</span><span className="block text-xs text-[var(--color-muted)]">{l.actor} · {when(new Date(l.createdAt))}</span></li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
