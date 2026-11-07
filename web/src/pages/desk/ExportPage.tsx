import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiFailure } from "../../lib/api";
import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { Empty } from "../../components/Empty";
import { rupees } from "../../../../shared/money";
import { when } from "../../../../shared/dates";
import { voucherNumber } from "../../../../shared/tally";
import type { ExportPage as ExportData } from "../../../../shared/api";

export function ExportPage() {
  const q = useQuery<ExportData>("/desk/export");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [made, setMade] = useState<{ batchId: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Everything ready is pre-selected each time the list loads.
  useEffect(() => { if (q.data) setSelected(new Set(q.data.ready.map((o) => o.id))); }, [q.data]);

  async function exportSelected() {
    setError(null);
    setBusy(true);
    try {
      setMade(await api.post<{ batchId: string; count: number }>("/desk/export", { orderIds: [...selected] }));
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : "Export failed");
    } finally {
      setBusy(false);
      q.reload();
    }
  }

  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Skeleton rows={4} className="h-14" />;
  const { ready, batches } = q.data;
  const total = ready.filter((o) => selected.has(o.id)).reduce((s, o) => s + o.totalPaise, 0);

  return (
    <div className="space-y-8">
      {made && (
        <div role="status" className="card flex flex-wrap items-center justify-between gap-3 border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4">
          <p className="font-medium text-[var(--color-accent)]">{made.count} orders moved to a Tally batch. Download and import it in Tally (Import → Vouchers).</p>
          <div className="flex gap-2">
            <a className="btn btn-primary btn-sm" href={`/api/desk/export/${made.batchId}?format=xml`}>Download Tally XML</a>
            <a className="btn btn-secondary btn-sm" href={`/api/desk/export/${made.batchId}?format=csv`}>CSV</a>
          </div>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-[var(--color-warn-soft)] px-4 py-3 text-sm text-[var(--color-warn)]">{error}</p>}

      <section aria-labelledby="ready-h">
        <div className="mb-3">
          <h1 id="ready-h" className="text-lg font-bold">Ready for Tally</h1>
          <p className="text-sm text-[var(--color-muted)]">Confirmed orders become Sales Order vouchers. Free goods go in as actual vs billed quantity. Orders on credit hold are not included.</p>
        </div>
        {ready.length === 0 ? (
          <Empty title="Nothing waiting" body="Confirmed orders appear here until they are exported." />
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-[var(--color-line)]">
              {ready.map((o) => (
                <li key={o.id}>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2">
                    <input type="checkbox" checked={selected.has(o.id)} className="h-5 w-5 accent-[var(--color-accent)]"
                      onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(o.id); else n.delete(o.id); return n; })} />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{voucherNumber(o.number)}</span> · {o.retailer.shopName}
                      <span className="block text-xs text-[var(--color-muted)]">{when(new Date(o.createdAt))} · {o.lineCount} lines · {o.source === "CAPTURE" ? "from message" : "app"}</span>
                    </span>
                    <span className="num font-semibold">{rupees(o.totalPaise)}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3">
              <p className="num text-sm">{selected.size} of {ready.length} orders · {rupees(total)}</p>
              <button className="btn btn-primary" disabled={busy || selected.size === 0} onClick={exportSelected}>{busy ? "Exporting…" : "Export selected to Tally"}</button>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="batch-h">
        <h2 id="batch-h" className="mb-3 text-lg font-bold">Earlier exports</h2>
        {batches.length === 0 ? <Empty title="No exports yet" body="Each export is kept so it can be downloaded again." /> : (
          <ul className="card divide-y divide-[var(--color-line)]">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{when(new Date(b.createdAt))}</p>
                  <p className="num text-xs text-[var(--color-muted)]">{b.orderCount} orders · {rupees(b.totalPaise)} · {b.createdBy}</p>
                </div>
                <div className="flex gap-2">
                  <a className="btn btn-secondary btn-sm" href={`/api/desk/export/${b.id}?format=xml`}>XML</a>
                  <a className="btn btn-secondary btn-sm" href={`/api/desk/export/${b.id}?format=csv`}>CSV</a>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-[var(--color-faint)]"><Link to="/desk/orders?status=EXPORTED" className="underline">See all exported orders</Link></p>
      </section>
    </div>
  );
}
