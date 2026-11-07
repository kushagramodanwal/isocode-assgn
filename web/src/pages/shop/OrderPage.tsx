import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { OrderDetail } from "../../components/OrderDetail";
import { useShop } from "./ShopLayout";
import { dict } from "../../../../shared/i18n";
import type { OrderDto } from "../../../../shared/api";

export function OrderPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { lang } = useShop();
  const t = dict[lang];
  const q = useQuery<OrderDto>(`/shop/orders/${id}`);
  if (q.error) return <div className="p-4"><ErrorState error={q.error} onRetry={q.reload} /></div>;
  if (!q.data) return <div className="p-4"><Skeleton rows={3} /></div>;
  const order = q.data;
  return (
    <div className="px-4 pt-4">
      {params.get("placed") && (
        <div role="status" className={`mb-4 rounded-xl px-4 py-3 font-medium ${order.status === "CREDIT_HOLD" ? "bg-[var(--color-warn-soft)] text-[var(--color-warn)]" : "bg-[var(--color-accent-soft)] text-[var(--color-accent-fg)]"}`}>
          {order.status === "CREDIT_HOLD" ? t.orderHeld : t.orderPlaced}
        </div>
      )}
      <OrderDetail order={order} lang={lang} />
      <Link to="/shop/orders" className="btn btn-secondary mt-4 w-full">{t.back}</Link>
    </div>
  );
}
