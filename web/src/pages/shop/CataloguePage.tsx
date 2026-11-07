import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { Catalogue } from "./Catalogue";
import { useShop } from "./ShopLayout";
import type { CatalogueResponse } from "../../../../shared/api";

export function CataloguePage() {
  const { lang, me, credit } = useShop();
  const q = useQuery<CatalogueResponse>("/shop/catalogue");
  if (q.error) return <div className="px-5 pt-4"><ErrorState error={q.error} onRetry={q.reload} /></div>;
  if (!q.data) return <div className="space-y-4 px-5 pt-4"><div className="skeleton h-7 w-48" /><div className="skeleton h-14" /><Skeleton rows={6} className="h-16" /></div>;
  return <Catalogue lang={lang} name={me.name} availableCreditPaise={credit?.availablePaise ?? null} items={q.data.items} frequent={q.data.frequent} lastOrder={q.data.lastOrder} />;
}
