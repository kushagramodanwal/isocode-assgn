import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireDesk } from "@/lib/auth";
import { confidenceLevel } from "@/domain/capture/match";
import { ago } from "@/lib/dates";
import { rupees, rupeesShort } from "@/lib/money";
import { HoldActions } from "@/components/HoldActions";
import { Empty } from "@/components/Empty";
import { inactiveRetailers } from "@/server/insights";

export const metadata: Metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

export default async function DeskInbox() {
  await requireDesk();
  const [captures, holds, ready, quiet] = await Promise.all([
    db.capture.findMany({
      where: { status: "NEEDS_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: { retailer: true, lines: { select: { confidence: true, unit: true, productId: true, qty: true } } },
    }),
    db.order.findMany({ where: { status: "CREDIT_HOLD" }, orderBy: { createdAt: "asc" }, include: { retailer: true } }),
    db.order.aggregate({ where: { status: "CONFIRMED" }, _count: true, _sum: { totalPaise: true } }),
    inactiveRetailers(14),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Messages to check" value={captures.length} href="#messages" />
        <Stat label="Credit holds" value={holds.length} href="#holds" tone={holds.length ? "warn" : undefined} />
        <Stat label="Ready for Tally" value={ready._count} sub={rupeesShort(ready._sum.totalPaise ?? 0)} href="/desk/export" />
        <Stat label="No order in 14 days" value={quiet.length} href="/desk/retailers" />
      </div>

      <section id="messages" aria-labelledby="msg-h">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 id="msg-h" className="text-lg font-bold">Messages to check</h1>
          <Link href="/desk/capture/new" className="btn btn-primary btn-sm">+ Paste a message</Link>
        </div>
        {captures.length === 0 ? (
          <Empty title="All messages are handled" body="New WhatsApp orders appear here once pasted or forwarded." />
        ) : (
          <ul className="space-y-2">
            {captures.map((c) => {
              const attention = c.lines.filter((l) => confidenceLevel(l.confidence) !== "high" || l.unit !== "CASE" || !l.productId || l.qty === null).length;
              return (
                <li key={c.id}>
                  <Link href={`/desk/capture/${c.id}`} className="card flex items-center gap-4 p-4 hover:border-[var(--color-accent)]">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <p className="font-semibold">{c.retailer.shopName}</p>
                        <p className="text-xs text-[var(--color-muted)]">{c.retailer.area} · {ago(c.createdAt)} · {c.channel === "APP_TEXT" ? "typed in app" : "WhatsApp"}</p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{c.rawText}</p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p>{c.lines.length} lines</p>
                      {attention > 0 ? <span className="pill pill-warn">{attention} to check</span> : <span className="pill pill-accent">all sure</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="holds" aria-labelledby="hold-h">
        <h2 id="hold-h" className="mb-3 text-lg font-bold">Credit holds</h2>
        {holds.length === 0 ? (
          <Empty title="No orders on hold" body="Orders over a shop's available credit wait here for approval." />
        ) : (
          <ul className="space-y-2">
            {holds.map((o) => (
              <li key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/desk/orders/${o.id}`} className="font-semibold underline-offset-2 hover:underline">#{o.number} · {o.retailer.shopName}</Link>
                  <p className="num text-sm">{rupees(o.totalPaise)} <span className="text-[var(--color-muted)]">· {ago(o.createdAt)}</span></p>
                  <p className="text-xs text-[var(--color-warn)]">{o.holdReason}</p>
                </div>
                <HoldActions orderId={o.id} canRelease canReject />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, href, tone }: { label: string; value: number; sub?: string; href: string; tone?: "warn" }) {
  return (
    <Link href={href} className="card block p-4 hover:border-[var(--color-accent)]">
      <p className="text-xs font-medium text-[var(--color-muted)]">{label}</p>
      <p className={`num mt-1 text-2xl font-bold ${tone === "warn" ? "text-[var(--color-warn)]" : ""}`}>{value}</p>
      {sub && <p className="num text-xs text-[var(--color-muted)]">{sub}</p>}
    </Link>
  );
}
