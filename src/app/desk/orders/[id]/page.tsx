import { notFound } from "next/navigation";
import Link from "next/link";
import { requireDesk } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderDetail } from "@/components/OrderDetail";
import { HoldActions } from "@/components/HoldActions";
import { creditStatus } from "@/server/credit";
import { rupees, rupeesShort } from "@/lib/money";
import { when } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ACTIONS: Record<string, string> = {
  "order.placed": "Placed",
  "order.hold_released": "Credit hold released",
  "order.rejected": "Rejected",
  "capture.confirmed": "Confirmed from message",
};

export default async function DeskOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; learned?: string }> }) {
  await requireDesk();
  const { id } = await params;
  const sp = await searchParams;
  const order = await db.order.findUnique({
    where: { id },
    include: { lines: { include: { product: { include: { brand: true } } } }, capture: true, retailer: true, placedBy: true },
  });
  if (!order) notFound();
  const [credit, log] = await Promise.all([
    creditStatus(order.retailerId),
    db.auditLog.findMany({ where: { entityId: { in: [order.id, order.capture?.id ?? "-"] } }, include: { actor: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const learned = Number(sp.learned ?? 0);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <Link href="/desk/orders" className="text-sm text-[var(--color-accent)]">← Orders</Link>
        {sp.from === "capture" && (
          <p role="status" className="my-3 rounded-xl bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-accent)]">
            ✓ Order created from the message.{learned > 0 && ` ${learned} correction${learned > 1 ? "s" : ""} saved for this shop's next messages.`}
          </p>
        )}
        <p className="mt-2 font-semibold">{order.retailer.shopName} <span className="font-normal text-[var(--color-muted)]">· {order.retailer.code}</span></p>
        <div className="mt-3"><OrderDetail order={order} lang="en" /></div>
        {(order.status === "CREDIT_HOLD" || order.status === "CONFIRMED") && (
          <div className="card mt-4 p-4">
            <h2 className="mb-2 text-sm font-semibold">Desk actions</h2>
            <HoldActions orderId={order.id} canRelease={order.status === "CREDIT_HOLD"} canReject />
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
        {order.capture && (
          <section className="card p-4">
            <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">Original message</h2>
            <blockquote className="text-sm whitespace-pre-wrap">{order.capture.rawText}</blockquote>
          </section>
        )}
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">History</h2>
          <ol className="space-y-2 text-sm">
            {log.length === 0 && <li className="text-[var(--color-muted)]">Placed {when(order.createdAt)} by {order.placedBy.name}</li>}
            {log.map((l) => (
              <li key={l.id}><span className="font-medium">{ACTIONS[l.action] ?? l.action}</span><span className="block text-xs text-[var(--color-muted)]">{l.actor.name} · {when(l.createdAt)}</span></li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
