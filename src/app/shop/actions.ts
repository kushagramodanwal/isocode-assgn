"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actor } from "@/lib/auth";
import { db } from "@/lib/db";
import { placeOrder } from "@/server/orders";
import { MAX_CASES_PER_LINE, type CartQuote } from "@/domain/pricing";

const PlaceSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1).max(40), cases: z.number().int().min(1).max(MAX_CASES_PER_LINE) })).min(1).max(100),
  idempotencyKey: z.string().uuid(),
  expectedTotalPaise: z.number().int().nonnegative(),
});

export type PlaceResult =
  | { ok: true; orderId: string; number: number; status: "CONFIRMED" | "CREDIT_HOLD" }
  | { ok: false; error: "invalid" | "changed" | "blocked" | "empty" | "server"; quote?: CartQuote };

export async function placeOrderAction(input: unknown): Promise<PlaceResult> {
  const user = await actor("RETAILER");
  const parsed = PlaceSchema.safeParse(input);
  if (!parsed.success || !user.retailerId) return { ok: false, error: "invalid" };
  try {
    const r = await placeOrder({ actorId: user.id, retailerId: user.retailerId, source: "APP", ...parsed.data });
    if (!r.ok) return { ok: false, error: r.reason, quote: r.quote };
    revalidatePath("/shop", "layout");
    return { ok: true, orderId: r.orderId, number: r.number, status: r.status };
  } catch (e) {
    console.error("[placeOrder]", e);
    return { ok: false, error: "server" };
  }
}

export async function setLanguage(lang: "en" | "hi") {
  const user = await actor();
  if (lang !== "en" && lang !== "hi") return;
  await db.user.update({ where: { id: user.id }, data: { lang } });
  revalidatePath("/shop", "layout");
}
