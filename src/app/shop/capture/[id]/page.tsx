import { notFound } from "next/navigation";
import { requireRetailer } from "@/lib/auth";
import { loadCapture } from "@/server/capture-view";
import { CaptureReview } from "@/components/CaptureReview";

export const dynamic = "force-dynamic";

export default async function ShopCaptureReview({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRetailer();
  const { id } = await params;
  const view = await loadCapture(id, user.retailerId);
  if (!view) notFound();
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-1 text-xl font-bold">{user.lang === "hi" ? "ऑर्डर जाँचें" : "Check your order"}</h1>
      <p className="mb-4 text-sm text-[var(--color-muted)]">{user.lang === "hi" ? "कुछ भी ऑर्डर नहीं होगा जब तक आप पक्का न करें।" : "Nothing is ordered until you confirm."}</p>
      <CaptureReview lang={user.lang} role="RETAILER" capture={view} catalogue={view.catalogue} />
    </div>
  );
}
