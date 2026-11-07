import { Link } from "react-router-dom";
import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { Empty } from "../../components/Empty";
import { HoldActions } from "../../components/HoldActions";
import { ago } from "../../../../shared/dates";
import { rupees, rupeesShort } from "../../../../shared/money";
import type { DeskSummary } from "../../../../shared/api";

export function InboxPage() {
  const q = useQuery<DeskSummary>("/desk/summary");
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  if (!q.data) return <div className="space-y-4"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}</div><Skeleton rows={3} className="h-20" /></div>;
  const { captures, holds, ready, quietCount } = q.data;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Messages to check" value={captures.length} href="#messages" />
        <Stat label="Credit holds" value={holds.length} href="#holds" warn={holds.length > 0} />
        <Stat label="Ready for Tally" value={ready.count} sub={rupeesShort(ready.totalPaise)} href="/desk/export" />
        <Stat label="No order in 14 days" value={quietCount} href="/desk/retailers" />
      </div>

      <section id="messages" aria-labelledby="msg-h">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 id="msg-h" className="text-lg font-bold">Messages to check</h1>
          <Link to="/desk/capture/new" className="btn btn-primary btn-sm">+ Paste a message</Link>
        </div>
        {captures.length === 0 ? (
          <Empty title="All messages are handled" body="New WhatsApp orders appear here once pasted or forwarded." />
        ) : (
          <ul className="space-y-2">
            {captures.map((c) => (
              <li key={c.id}>
                <Link to={`/desk/capture/${c.id}`} className="card flex items-center gap-4 p-4 hover:border-[var(--color-accent)]">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="font-semibold">{c.retailer.shopName}</p>
                      <p className="text-xs text-[var(--color-muted)]">{c.retailer.area} · {ago(new Date(c.createdAt))} · {c.channel === "APP_TEXT" ? "from the app" : "WhatsApp"}{c.source === "PHOTO" ? " · photo" : c.source === "VOICE" ? " · voice note" : ""}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{c.rawText}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p>{c.lineCount} {c.lineCount === 1 ? "line" : "lines"}</p>
                    {c.needsAttention > 0 ? <span className="pill pill-warn">{c.needsAttention} to check</span> : <span className="pill pill-accent">all sure</span>}
                  </div>
                </Link>
              </li>
            ))}
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
                  <Link to={`/desk/orders/${o.id}`} className="font-semibold underline-offset-2 hover:underline">#{o.number} · {o.retailer.shopName}</Link>
                  <p className="num text-sm">{rupees(o.totalPaise)} <span className="text-[var(--color-muted)]">· {ago(new Date(o.createdAt))}</span></p>
                  <p className="text-xs text-[var(--color-warn)]">{o.holdReason}</p>
                </div>
                <HoldActions orderId={o.id} canRelease canReject onDone={q.reload} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, href, warn }: { label: string; value: number; sub?: string; href: string; warn?: boolean }) {
  const inner = (
    <>
      <p className="text-xs font-medium text-[var(--color-muted)]">{label}</p>
      <p className={`num mt-1 text-2xl font-bold ${warn ? "text-[var(--color-warn)]" : ""}`}>{value}</p>
      {sub && <p className="num text-xs text-[var(--color-muted)]">{sub}</p>}
    </>
  );
  return href.startsWith("#")
    ? <a href={href} className="card block p-4 hover:border-[var(--color-accent)]">{inner}</a>
    : <Link to={href} className="card block p-4 hover:border-[var(--color-accent)]">{inner}</Link>;
}
