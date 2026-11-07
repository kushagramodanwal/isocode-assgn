import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { Empty } from "../../components/Empty";
import type { LoadingRoute } from "../../../../shared/api";

export function LoadingPage() {
  const q = useQuery<LoadingRoute[]>("/desk/loading");
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold">Van loading list</h1>
        <p className="text-sm text-[var(--color-muted)]">Accepted orders from the last 24 hours, by route. Free cases are loaded too.</p>
      </div>
      {q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : !q.data ? <Skeleton rows={2} className="h-48" /> : q.data.length === 0 ? (
        <Empty title="Nothing to load" body="Confirmed orders from the last 24 hours show here by route." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.map((r) => {
            const total = r.skus.reduce((s, x) => s + x.paid + x.free, 0);
            return (
              <section key={r.route} className="card p-4">
                <h2 className="font-semibold">{r.route}</h2>
                <p className="mb-3 text-xs text-[var(--color-muted)]">{r.shops} shops · {total} cases</p>
                <table className="num w-full text-sm">
                  <thead className="text-left text-xs text-[var(--color-muted)]"><tr><th className="py-1 font-medium">SKU</th><th className="py-1 text-right font-medium">Billed</th><th className="py-1 text-right font-medium">Free</th><th className="py-1 text-right font-medium">Load</th></tr></thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {r.skus.map((s) => (
                      <tr key={s.code}><td className="py-1.5">{s.name}<span className="block text-xs text-[var(--color-faint)]">{s.code}</span></td><td className="text-right">{s.paid}</td><td className="text-right text-[var(--color-accent-fg)]">{s.free || ""}</td><td className="text-right font-semibold">{s.paid + s.free}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
