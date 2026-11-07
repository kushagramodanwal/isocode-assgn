import express, { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireRole, retailerId, scope, user } from "../auth";
import { HttpError, notFound, parse, route } from "../http";
import { confirmCapture, createCapture, createMediaCapture, discardCapture, MAX_MESSAGE_CHARS, MediaNeedsAi } from "../services/capture";
import { ACCEPTED_MEDIA, checkMedia, MAX_MEDIA_BYTES } from "../services/media";
import { MediaUnreadable } from "../services/transcribe";
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

/**
 * Photo of a list or a voice note. The body is the raw file (Content-Type = its type), so phones
 * on 3G upload the bytes once, without base64. Desk users say which shop with ?retailerId=.
 */
captureRouter.post(
  "/media",
  express.raw({ type: Object.keys(ACCEPTED_MEDIA), limit: MAX_MEDIA_BYTES }),
  route(async (req, res) => {
    const u = user(req);
    const bytes = Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : new Uint8Array();
    const check = checkMedia(req.get("content-type"), bytes);
    if (!check.ok) throw new HttpError(400, "invalid_media", check.reason);
    let rid: string;
    if (u.role === "RETAILER") rid = retailerId(req);
    else {
      rid = parse(z.object({ retailerId: z.string().min(1, "Choose the shop that sent this") }), req.query).retailerId;
      if (!(await db.retailer.findUnique({ where: { id: rid }, select: { id: true } }))) throw new HttpError(400, "invalid", "Unknown shop");
    }
    try {
      const id = await createMediaCapture({
        actorId: u.id,
        retailerId: rid,
        channel: u.role === "RETAILER" ? "APP_TEXT" : "WHATSAPP_TEXT",
        media: { kind: check.kind, mimeType: check.mimeType, bytes },
      });
      res.status(201).json({ id });
    } catch (e) {
      if (e instanceof MediaNeedsAi) throw new HttpError(503, "ai_off", e.message);
      if (e instanceof MediaUnreadable) throw new HttpError(422, "unreadable", e.message);
      console.warn("[capture] media transcription failed:", e instanceof Error ? e.message : e);
      throw new HttpError(502, "ai_failed", "The AI reader couldn't read this right now. Try again in a minute, or type the order.");
    }
  }),
);

/** The original photo or voice note, for checking the transcript. Same access rules as the capture. */
captureRouter.get("/:id/media", route(async (req, res) => {
  const scoped = scope(req);
  const media = await db.captureMedia.findFirst({
    where: { captureId: req.params.id, ...(scoped ? { capture: { retailerId: scoped } } : {}) },
  });
  if (!media) throw notFound("No photo or voice note for this message");
  res.setHeader("Content-Type", media.mimeType);
  res.setHeader("Content-Length", String(media.sizeBytes));
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader("Content-Disposition", "inline");
  res.send(Buffer.from(media.bytes));
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
