import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRetailer } from "@/lib/auth";
import { db } from "@/lib/db";
import { dict } from "@/lib/i18n";
import { OrderDetail } from "@/components/OrderDetail";

export const dynamic = "force-dynamic";

export default async function ShopOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const user = await requireRetailer();
  const { id } = await params;
  const { placed } = await searchParams;
  // Scoped to this retailer: another shop's order id simply isn't found.
  const order = await db.order.findFirst({
    where: { id, retailerId: user.retailerId },
    include: { lines: { include: { product: { include: { brand: true } } } }, capture: true },
  });
  if (!order) notFound();
  const t = dict[user.lang];
  return (
    <div className="px-4 pt-4">
      {placed && (
        <div role="status" className={`mb-4 rounded-xl px-4 py-3 font-medium ${order.status === "CREDIT_HOLD" ? "bg-[var(--color-warn-soft)] text-[var(--color-warn)]" : "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"}`}>
          {order.status === "CREDIT_HOLD" ? t.orderHeld : `✓ ${t.orderPlaced}`}
        </div>
      )}
      <OrderDetail order={order} lang={user.lang} />
      <Link href="/shop/orders" className="btn btn-secondary mt-4 w-full">{t.back}</Link>
    </div>
  );
}
