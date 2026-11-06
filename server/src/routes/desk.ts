import { Router } from "express";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { db } from "../db";
import { requireRole, user } from "../auth";
import { HttpError, notFound, parse, route } from "../http";
import { creditStatus } from "../services/credit";
import { loadCapture } from "../services/capture-view";
import { inactiveRetailers } from "../services/insights";
import { exportOrdersForBatch } from "../services/export";
import { OrderStateError, rejectOrder, releaseHold } from "../services/orders";
import { orderDetailInclude, orderSummaryInclude, toCredit, toOrderDto, toOrderSummary } from "../mappers";
import { confidenceLevel } from "../../../shared/capture/match";
import { buildCsv, buildTallyXml } from "../../../shared/tally";
import type { DeskCaptureContext, DeskOrderContext, DeskSummary, ExportPage, LoadingRoute, QuietRetailer } from "../../../shared/api";

/** Order desk endpoints. DESK role only. */
export const deskRouter = Router();
deskRouter.use(requireRole("DESK"));

deskRouter.get("/summary", route(async (_req, res) => {
  const [captures, holds, ready, quiet] = await Promise.all([
    db.capture.findMany({
      where: { status: "NEEDS_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: { retailer: true, lines: { select: { confidence: true, unit: true, productId: true, qty: true } } },
    }),
    db.order.findMany({ where: { status: "CREDIT_HOLD" }, orderBy: { createdAt: "asc" }, include: orderSummaryInclude }),
    db.order.aggregate({ where: { status: "CONFIRMED" }, _count: true, _sum: { totalPaise: true } }),
    inactiveRetailers(14),
  ]);
  const body: DeskSummary = {
    captures: captures.map((c) => ({
      id: c.id,
      createdAt: c.createdAt.toISOString(),
      rawText: c.rawText,
      channel: c.channel,
      retailer: { shopName: c.retailer.shopName, area: c.retailer.area },
      lineCount: c.lines.length,
      needsAttention: c.lines.filter((l) => confidenceLevel(l.confidence) !== "high" || l.unit !== "CASE" || !l.productId || l.qty === null).length,
    })),
    holds: holds.map((o) => ({ ...toOrderSummary(o), holdReason: o.holdReason })),
    ready: { count: ready._count, totalPaise: ready._sum.totalPaise ?? 0 },
    quietCount: quiet.length,
  };
  res.json(body);
}));

deskRouter.get("/retailers", route(async (_req, res) => {
  res.json(await db.retailer.findMany({ orderBy: { shopName: "asc" }, select: { id: true, shopName: true, area: true, phone: true, code: true } }));
}));

deskRouter.get("/captures/:id", route(async (req, res) => {
  const capture = await loadCapture(req.params.id!, null);
  if (!capture) throw notFound("Message not found");
  const [credit, recent, aliases] = await Promise.all([
    creditStatus(capture.retailer.id),
    db.order.findMany({ where: { retailerId: capture.retailer.id }, orderBy: { createdAt: "desc" }, take: 4 }),
    db.retailerAlias.findMany({ where: { retailerId: capture.retailer.id }, include: { product: true }, take: 10, orderBy: { createdAt: "desc" } }),
  ]);
  const body: DeskCaptureContext = {
    capture,
    credit: toCredit(credit),
    recent: recent.map((o) => ({ id: o.id, number: o.number, status: o.status, createdAt: o.createdAt.toISOString() })),
    aliases: aliases.map((a) => ({ id: a.id, phrase: a.phrase, product: `${a.product.name} ${a.product.packLabel}` })),
  };
  res.json(body);
}));

const STATUSES = ["CONFIRMED", "CREDIT_HOLD", "EXPORTED", "REJECTED"] as const;

deskRouter.get("/orders", route(async (req, res) => {
  const q = parse(z.object({ status: z.enum(STATUSES).optional(), q: z.string().trim().max(60).optional() }), req.query);
  const num = q.q && /^\d+$/.test(q.q) ? Number(q.q) : null;
  const orders = await db.order.findMany({
    where: {
      ...(q.status ? { status: q.status as OrderStatus } : {}),
      ...(q.q ? { OR: [{ retailer: { shopName: { contains: q.q, mode: "insensitive" as const } } }, ...(num ? [{ number: num }] : [])] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: orderSummaryInclude,
  });
  res.json(orders.map(toOrderSummary));
}));

deskRouter.get("/orders/:id", route(async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.id }, include: orderDetailInclude });
  if (!order) throw notFound("Order not found");
  const [credit, log] = await Promise.all([
    creditStatus(order.retailerId),
    db.auditLog.findMany({ where: { entityId: { in: [order.id, order.capture?.id ?? "-"] } }, include: { actor: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const body: DeskOrderContext = {
    order: toOrderDto(order),
    credit: toCredit(credit),
    history: log.map((l) => ({ id: l.id, action: l.action, actor: l.actor.name, createdAt: l.createdAt.toISOString() })),
  };
  res.json(body);
}));

function stateError(e: unknown): never {
  if (e instanceof OrderStateError) throw new HttpError(409, "state", e.message);
  throw e;
}

deskRouter.post("/orders/:id/release", route(async (req, res) => {
  await releaseHold(req.params.id!, user(req).id).catch(stateError);
  res.json({ ok: true });
}));

deskRouter.post("/orders/:id/reject", route(async (req, res) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(3, "Give a short reason").max(200) }), req.body);
  await rejectOrder(req.params.id!, user(req).id, reason).catch(stateError);
  res.json({ ok: true });
}));

deskRouter.get("/export", route(async (_req, res) => {
  const [ready, batches] = await Promise.all([
    db.order.findMany({ where: { status: "CONFIRMED" }, orderBy: { number: "asc" }, include: orderSummaryInclude }),
    db.exportBatch.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { createdBy: true, orders: { select: { totalPaise: true } } } }),
  ]);
  const body: ExportPage = {
    ready: ready.map(toOrderSummary),
    batches: batches.map((b) => ({ id: b.id, createdAt: b.createdAt.toISOString(), createdBy: b.createdBy.name, orderCount: b.orders.length, totalPaise: b.orders.reduce((s, o) => s + o.totalPaise, 0) })),
  };
  res.json(body);
}));

/**
 * Moves the chosen CONFIRMED orders into a new batch. The status guard in the update means two
 * people exporting at once can't put the same order in two batches.
 */
deskRouter.post("/export", route(async (req, res) => {
  const { orderIds } = parse(z.object({ orderIds: z.array(z.string().min(1)).min(1, "Select at least one order").max(500) }), req.body);
  const u = user(req);
  const result = await db.$transaction(async (tx) => {
    const batch = await tx.exportBatch.create({ data: { createdById: u.id } });
    const moved = await tx.order.updateMany({ where: { id: { in: orderIds }, status: "CONFIRMED" }, data: { status: "EXPORTED", exportBatchId: batch.id } });
    if (moved.count === 0) throw new HttpError(409, "stale", "Those orders were already exported by someone else.");
    await tx.auditLog.create({ data: { actorId: u.id, action: "export.created", entityId: batch.id, data: { orders: moved.count } } });
    return { batchId: batch.id, count: moved.count };
  });
  res.status(201).json(result);
}));

deskRouter.get("/export/:batchId", route(async (req, res) => {
  const batch = await db.exportBatch.findUnique({ where: { id: req.params.batchId } });
  if (!batch) throw notFound("Export not found");
  const format = req.query.format === "csv" ? "csv" : "xml";
  const orders = await exportOrdersForBatch(batch.id);
  const stamp = new Date(batch.createdAt.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 16).replace(/[-:T]/g, ""); // IST
  res.setHeader("Content-Type", format === "csv" ? "text/csv; charset=utf-8" : "application/xml; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="tally-sales-orders-${stamp}.${format}"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(format === "csv" ? buildCsv(orders) : buildTallyXml(orders));
}));

/** Cases to load per route: accepted orders from the last 24 hours (assumption A-16). */
deskRouter.get("/loading", route(async (_req, res) => {
  const lines = await db.orderLine.findMany({
    where: { order: { status: { in: ["CONFIRMED", "EXPORTED"] }, createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) } } },
    include: { product: true, order: { include: { retailer: true } } },
  });
  const routes = new Map<string, { shops: Set<string>; skus: Map<string, { code: string; name: string; paid: number; free: number }> }>();
  for (const l of lines) {
    const r = routes.get(l.order.retailer.route) ?? { shops: new Set(), skus: new Map() };
    r.shops.add(l.order.retailerId);
    const s = r.skus.get(l.productId) ?? { code: l.product.code, name: `${l.product.name} ${l.product.packLabel}`, paid: 0, free: 0 };
    s.paid += l.cases;
    s.free += l.freeCases;
    r.skus.set(l.productId, s);
    routes.set(l.order.retailer.route, r);
  }
  const body: LoadingRoute[] = [...routes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([routeName, r]) => ({ route: routeName, shops: r.shops.size, skus: [...r.skus.values()].sort((a, b) => a.code.localeCompare(b.code)) }));
  res.json(body);
}));

deskRouter.get("/quiet", route(async (_req, res) => {
  const quiet = await inactiveRetailers(14);
  const body: QuietRetailer[] = quiet.map((r) => ({ ...r, lastOrderAt: r.lastOrderAt?.toISOString() ?? null }));
  res.json(body);
}));
