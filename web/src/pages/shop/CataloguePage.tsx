import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { Catalogue } from "./Catalogue";
import { useShop } from "./ShopLayout";
import type { CatalogueResponse } from "../../../../shared/api";

export function CataloguePage() {
  const { lang } = useShop();
  const q = useQuery<CatalogueResponse>("/shop/catalogue");
  if (q.error) return <div className="p-4"><ErrorState error={q.error} onRetry={q.reload} /></div>;
  if (!q.data) return <div className="p-4"><div className="skeleton mb-3 h-12" /><Skeleton rows={4} className="h-36" /></div>;
  return <Catalogue lang={lang} items={q.data.items} frequent={q.data.frequent} lastOrder={q.data.lastOrder} />;
}
