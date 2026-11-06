import type { Metadata } from "next";
import { requireRetailer } from "@/lib/auth";
import { catalogueFor } from "@/server/catalogue";
import { creditStatus } from "@/server/credit";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "Cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await requireRetailer();
  const [items, credit] = await Promise.all([catalogueFor(user.retailerId), creditStatus(user.retailerId)]);
  return <CartView lang={user.lang} items={items} availableCreditPaise={credit.availablePaise} />;
}
