import { requireRetailer } from "@/lib/auth";
import { catalogueFor, orderHistory } from "@/server/catalogue";
import { db } from "@/lib/db";
import { Catalogue } from "./Catalogue";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await requireRetailer();
  const [items, history, last] = await Promise.all([
    catalogueFor(user.retailerId),
    orderHistory(user.retailerId),
    db.order.findFirst({
      where: { retailerId: user.retailerId, status: { not: "REJECTED" } },
      orderBy: { createdAt: "desc" },
      include: { lines: { select: { productId: true, cases: true } } },
    }),
  ]);
  const frequent = [...history.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);
  return (
    <Catalogue
      lang={user.lang}
      items={items}
      frequent={frequent}
      lastOrder={last ? { number: last.number, lines: last.lines } : null}
    />
  );
}
