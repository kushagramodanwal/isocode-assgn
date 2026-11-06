import { useParams } from "react-router-dom";
import { useQuery } from "../../lib/useQuery";
import { ErrorState, Skeleton } from "../../components/States";
import { CaptureReview } from "../../components/CaptureReview";
import { useShop } from "./ShopLayout";
import type { CaptureView } from "../../../../shared/api";

export function ShopCapturePage() {
  const { id } = useParams();
  const { lang } = useShop();
  const q = useQuery<CaptureView>(`/captures/${id}`);
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-1 text-xl font-bold">{lang === "hi" ? "ऑर्डर जाँचें" : "Check your order"}</h1>
      <p className="mb-4 text-sm text-[var(--color-muted)]">{lang === "hi" ? "कुछ भी ऑर्डर नहीं होगा जब तक आप पक्का न करें।" : "Nothing is ordered until you confirm."}</p>
      {q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : !q.data ? <Skeleton rows={3} className="h-48" /> : (
        <CaptureReview lang={lang} role="RETAILER" capture={q.data} catalogue={q.data.catalogue} />
      )}
    </div>
  );
}
