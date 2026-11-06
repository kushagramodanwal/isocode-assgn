import { Link } from "react-router-dom";
import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { StatusPill } from "../../components/StatusPill";
import { useShop } from "./ShopLayout";
import { dict } from "../../../../shared/i18n";
import { rupees } from "../../../../shared/money";
import { when } from "../../../../shared/dates";
import type { OrderSummary } from "../../../../shared/api";

export function OrdersPage() {
  const { lang } = useShop();
  const t = dict[lang];
  const q = useQuery<OrderSummary[]>("/shop/orders");
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-xl font-bold">{t.orders}</h1>
      {q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : !q.data ? <Skeleton rows={5} className="h-16" /> : q.data.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-medium">{t.noOrders}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{t.noOrdersHint}</p>
          <Link to="/shop" className="btn btn-primary mt-4">{t.browse}</Link>
        </div>
      ) : (
        <ul className="card divide-y divide-[var(--color-line)]">
          {q.data.map((o) => (
            <li key={o.id}>
              <Link to={`/shop/orders/${o.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{t.orderNo(o.number)} <span className="text-sm font-normal text-[var(--color-muted)]">· {t.items(o.lineCount)}</span></p>
                  <p className="text-xs text-[var(--color-muted)]">{when(new Date(o.createdAt))}</p>
                </div>
                <div className="text-right">
                  <p className="num font-semibold">{rupees(o.totalPaise)}</p>
                  <StatusPill status={o.status} lang={lang} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
