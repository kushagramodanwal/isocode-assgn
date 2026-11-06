import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireRole, retailerId, user } from "../auth";
import { notFound, parse, route } from "../http";
import { catalogueFor, orderHistory } from "../services/catalogue";
import { creditStatus } from "../services/credit";
import { placeOrder } from "../services/orders";
import { orderDetailInclude, orderSummaryInclude, toCredit, toOrderDto, toOrderSummary } from "../mappers";
import { MAX_CASES_PER_LINE } from "../../../shared/pricing";
import type { CatalogueResponse, PlaceOrderResult } from "../../../shared/api";

/** Retailer-only endpoints. Every query is scoped to the signed-in user's shop. */
export const shopRouter = Router();
shopRouter.use(requireRole("RETAILER"));

shopRouter.get("/catalogue", route(async (req, res) => {
  const rid = retailerId(req);
  const [items, history, last] = await Promise.all([
    catalogueFor(rid),
    orderHistory(rid),
    db.order.findFirst({ where: { retailerId: rid, status: { not: "REJECTED" } }, orderBy: { createdAt: "desc" }, include: { lines: { select: { productId: true, cases: true } } } }),
  ]);
  const body: CatalogueResponse = {
    items,
    frequent: [...history.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id),
    lastOrder: last ? { number: last.number, lines: last.lines } : null,
  };
  res.json(body);
}));

shopRouter.get("/credit", route(async (req, res) => {
  res.json(toCredit(await creditStatus(retailerId(req))));
}));

const PlaceSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1).max(40), cases: z.number().int().min(1).max(MAX_CASES_PER_LINE) })).min(1).max(100),
  idempotencyKey: z.string().uuid(),
  expectedTotalPaise: z.number().int().nonnegative(),
});

shopRouter.post("/orders", route(async (req, res) => {
  const body = parse(PlaceSchema, req.body);
  const r = await placeOrder({ actorId: user(req).id, retailerId: retailerId(req), source: "APP", ...body });
  const out: PlaceOrderResult = r.ok
    ? { ok: true, orderId: r.orderId, number: r.number, status: r.status }
    : { ok: false, error: r.reason, quote: r.quote };
  res.status(r.ok ? (r.replayed ? 200 : 201) : 409).json(out);
}));

shopRouter.get("/orders", route(async (req, res) => {
  const orders = await db.order.findMany({ where: { retailerId: retailerId(req) }, orderBy: { createdAt: "desc" }, take: 50, include: orderSummaryInclude });
  res.json(orders.map(toOrderSummary));
}));

shopRouter.get("/orders/:id", route(async (req, res) => {
  // Scoped: another shop's order id is simply not found.
  const order = await db.order.findFirst({ where: { id: req.params.id, retailerId: retailerId(req) }, include: orderDetailInclude });
  if (!order) throw notFound("Order not found");
  res.json(toOrderDto(order));
}));

shopRouter.get("/captures", route(async (req, res) => {
  const u = user(req);
  const drafts = await db.capture.findMany({ where: { retailerId: retailerId(req), createdById: u.id, status: "NEEDS_REVIEW" }, orderBy: { createdAt: "desc" }, take: 5 });
  res.json(drafts.map((d) => ({ id: d.id, rawText: d.rawText, createdAt: d.createdAt.toISOString() })));
}));
