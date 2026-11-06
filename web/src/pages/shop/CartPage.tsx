import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { CartView } from "./CartView";
import { useShop } from "./ShopLayout";
import type { CatalogueResponse } from "../../../../shared/api";

export function CartPage() {
  const { lang, credit, reloadCredit } = useShop();
  const q = useQuery<CatalogueResponse>("/shop/catalogue");
  if (q.error) return <div className="p-4"><ErrorState error={q.error} onRetry={q.reload} /></div>;
  if (!q.data || !credit) return <div className="p-4"><Skeleton rows={3} /></div>;
  return <CartView lang={lang} items={q.data.items} availableCreditPaise={credit.availablePaise} onChanged={() => { q.reload(); reloadCredit(); }} />;
}
