import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireRole, retailerId, scope, user } from "../auth";
import { HttpError, notFound, parse, route } from "../http";
import { confirmCapture, createCapture, discardCapture, MAX_MESSAGE_CHARS } from "../services/capture";
import { loadCapture } from "../services/capture-view";
import { MAX_CASES_PER_LINE } from "../../../shared/pricing";
import type { ConfirmResult } from "../../../shared/api";

/** Message capture, used by both roles. Retailers only ever see their own shop's captures. */
export const captureRouter = Router();
captureRouter.use(requireRole());

const Text = z.string().trim().min(3, "Write at least one item").max(MAX_MESSAGE_CHARS, `Keep it under ${MAX_MESSAGE_CHARS} characters`);

captureRouter.post("/", route(async (req, res) => {
  const u = user(req);
  if (u.role === "RETAILER") {
    const { text } = parse(z.object({ text: Text }), req.body);
    const id = await createCapture({ actorId: u.id, retailerId: retailerId(req), text, channel: "APP_TEXT" });
    res.status(201).json({ id });
    return;
  }
  const body = parse(z.object({ text: Text, retailerId: z.string().min(1, "Choose the shop that sent this message") }), req.body);
  const exists = await db.retailer.findUnique({ where: { id: body.retailerId }, select: { id: true } });
  if (!exists) throw new HttpError(400, "invalid", "Unknown shop");
  const id = await createCapture({ actorId: u.id, retailerId: body.retailerId, text: body.text, channel: "WHATSAPP_TEXT" });
  res.status(201).json({ id });
}));

captureRouter.get("/:id", route(async (req, res) => {
  const view = await loadCapture(req.params.id!, scope(req));
  if (!view) throw notFound("Message not found");
  res.json(view);
}));

const Reviewed = z.object({
  lines: z.array(z.object({
    lineId: z.string().min(1),
    removed: z.boolean(),
    productId: z.string().min(1).nullable(),
    cases: z.number().int().min(1).max(MAX_CASES_PER_LINE).nullable(),
    unitConfirmed: z.boolean(),
    checked: z.boolean(),
    substituted: z.boolean(),
  })).max(40),
});

captureRouter.post("/:id/confirm", route(async (req, res) => {
  const { lines } = parse(Reviewed, req.body);
  const r = await confirmCapture({ actorId: user(req).id, captureId: req.params.id!, retailerScope: scope(req), lines });
  let out: ConfirmResult;
  if (r.ok) out = { ok: true, orderId: r.order.orderId, learned: r.learned };
  else if (r.reason === "not_found") throw notFound("Message not found");
  else if (r.reason === "already_done") out = { ok: false, message: "Someone already confirmed or discarded this message. Reload to see it." };
  else if (r.reason === "nothing_to_order") out = { ok: false, message: "Every line is removed. Discard the message instead." };
  else if (r.reason === "problems") out = { ok: false, message: "Some lines still need an answer.", problems: r.problems };
  else if (r.reason === "order") out = { ok: false, message: r.result.reason === "blocked" ? "A line is out of stock or above stock. Substitute or remove it." : "Stock or prices changed. Reload and check again." };
  else throw new HttpError(500, "server", "Unexpected result");
  res.status(out.ok ? 201 : 409).json(out);
}));

captureRouter.post("/:id/discard", route(async (req, res) => {
  const done = await discardCapture(req.params.id!, user(req).id, scope(req));
  if (!done) throw notFound("Message not found or already handled");
  res.json({ ok: true });
}));
