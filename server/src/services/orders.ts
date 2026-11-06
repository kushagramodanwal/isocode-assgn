import { Prisma, type OrderSource } from "@prisma/client";
import { db } from "../db";
import { checkCredit, priceCart, schemeLabelEn, type CartQuote } from "../../../shared/pricing";
import { catalogueFor, toPriced } from "./catalogue";
import { creditStatus } from "./credit";
import { rupees } from "../../../shared/money";

export type PlaceOrderInput = {
  actorId: string;
  retailerId: string;
  items: { productId: string; cases: number }[];
  idempotencyKey: string;
  source: OrderSource;
  /** What the person saw when they pressed "Place order". If the server's total differs, we stop. */
  expectedTotalPaise?: number;
  /** Runs inside the same transaction after the order is created (used by capture confirm). */
  afterCreate?: (tx: Prisma.TransactionClient, orderId: string) => Promise<void>;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string; number: number; status: "CONFIRMED" | "CREDIT_HOLD"; replayed: boolean }
  | { ok: false; reason: "blocked" | "changed" | "empty"; quote: CartQuote };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing && existing.retailerId === input.retailerId) {
    // Double tap or a retried request on a flaky connection: return the first order.
    return { ok: true, orderId: existing.id, number: existing.number, status: existing.status === "CREDIT_HOLD" ? "CREDIT_HOLD" : "CONFIRMED", replayed: true };
  }

  return db.$transaction(
    async (tx) => {
      // Serialise orders per retailer (credit) and per product (stock).
      await tx.$queryRaw`SELECT id FROM "Retailer" WHERE id = ${input.retailerId} FOR UPDATE`;
      const ids = [...new Set(input.items.map((i) => i.productId))].sort();
      if (ids.length) await tx.$queryRaw`SELECT id FROM "Product" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;

      const catalogue = await catalogueFor(input.retailerId, tx);
      const byId = new Map(catalogue.map((c) => [c.id, c]));
      const priced = new Map(catalogue.map((c) => [c.id, toPriced(c)]));
      const quote = priceCart(input.items, priced, new Date());

      if (quote.lines.length === 0) return { ok: false as const, reason: "empty" as const, quote };
      if (quote.blocked) return { ok: false as const, reason: "blocked" as const, quote };
      if (input.expectedTotalPaise !== undefined && input.expectedTotalPaise !== quote.totals.totalPaise) {
        return { ok: false as const, reason: "changed" as const, quote };
      }

      const credit = await creditStatus(input.retailerId, tx);
      const cc = checkCredit({
        creditLimitPaise: credit.limitPaise,
        outstandingPaise: credit.outstandingPaise,
        openOrdersPaise: credit.openOrdersPaise,
        orderTotalPaise: quote.totals.totalPaise,
      });
      const status = cc.withinLimit ? "CONFIRMED" : "CREDIT_HOLD";

      for (const l of quote.lines) {
        await tx.product.update({ where: { id: l.productId }, data: { stockCases: { decrement: l.cases + l.freeCases } } });
      }

      const order = await tx.order.create({
        data: {
          retailerId: input.retailerId,
          placedById: input.actorId,
          source: input.source,
          status,
          holdReason: cc.withinLimit ? null : `Over available credit by ${rupees(cc.exceedsByPaise)} (available ${rupees(Math.max(0, cc.availablePaise))})`,
          grossPaise: quote.totals.grossPaise,
          discountPaise: quote.totals.discountPaise,
          taxablePaise: quote.totals.taxablePaise,
          gstPaise: quote.totals.gstPaise,
          totalPaise: quote.totals.totalPaise,
          idempotencyKey: input.idempotencyKey,
          lines: {
            create: quote.lines.map((l) => ({
              productId: l.productId,
              cases: l.cases,
              freeCases: l.freeCases,
              unitPricePaise: byId.get(l.productId)!.unitPricePaise,
              casePricePaise: l.casePricePaise,
              grossPaise: l.grossPaise,
              discountPaise: l.discountPaise,
              taxablePaise: l.taxablePaise,
              gstRateBp: l.gstRateBp,
              gstPaise: l.gstPaise,
              totalPaise: l.totalPaise,
              schemeLabel: l.scheme ? schemeLabelEn(l.scheme) : null,
            })),
          },
        },
      });
      await tx.auditLog.create({
        data: { actorId: input.actorId, action: "order.placed", entityId: order.id, data: { status, source: input.source, totalPaise: order.totalPaise } },
      });
      if (input.afterCreate) await input.afterCreate(tx, order.id);
      return { ok: true as const, orderId: order.id, number: order.number, status, replayed: false };
    },
    { timeout: 15_000 },
  );
}

export class OrderStateError extends Error {}

export async function releaseHold(orderId: string, actorId: string) {
  await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({ where: { id: orderId, status: "CREDIT_HOLD" }, data: { status: "CONFIRMED" } });
    if (res.count === 0) throw new OrderStateError("Only orders on credit hold can be released.");
    await tx.auditLog.create({ data: { actorId, action: "order.hold_released", entityId: orderId } });
  });
}

export async function rejectOrder(orderId: string, actorId: string, reason: string) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { lines: true } });
    if (!order || (order.status !== "CREDIT_HOLD" && order.status !== "CONFIRMED")) {
      throw new OrderStateError("Only confirmed or held orders can be rejected. Exported orders are corrected in Tally.");
    }
    const res = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: "REJECTED", rejectReason: reason } });
    if (res.count === 0) throw new OrderStateError("The order changed. Reload and try again.");
    for (const l of order.lines) {
      await tx.product.update({ where: { id: l.productId }, data: { stockCases: { increment: l.cases + l.freeCases } } });
    }
    await tx.auditLog.create({ data: { actorId, action: "order.rejected", entityId: orderId, data: { reason } } });
  });
}
