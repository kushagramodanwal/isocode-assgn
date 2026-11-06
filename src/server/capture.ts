import "server-only";
import type { CaptureChannel, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { parseMessage, type ExtractedLine } from "@/domain/capture/parse";
import { matchLine, confidenceLevel, type CatalogueEntry } from "@/domain/capture/match";
import { catalogueFor, orderHistory } from "./catalogue";
import { extractWithLlm } from "./llm";
import { placeOrder, type PlaceOrderResult } from "./orders";

export const MAX_MESSAGE_CHARS = 2000;

async function extract(text: string, catalogue: CatalogueEntry[]): Promise<{ lines: ExtractedLine[]; parser: string; note: string | null }> {
  if (!env.llmEnabled) return { lines: parseMessage(text), parser: "rules", note: null };
  try {
    const terms = [...new Set(catalogue.map((c) => `${c.name} ${c.packLabel}`))];
    const lines = await extractWithLlm(text, terms);
    if (lines.length === 0 && parseMessage(text).length > 0) throw new Error("model found no lines");
    return { lines, parser: `llm:${env.llmModel}`, note: null };
  } catch (e) {
    // The desk still gets a draft; the screen says the fallback was used.
    const reason = e instanceof Error ? e.message : "unknown error";
    console.warn(`[capture] LLM extraction failed, using rules: ${reason}`);
    return { lines: parseMessage(text), parser: "rules", note: `AI reader unavailable (${reason.slice(0, 80)}). Read by the rule-based parser instead.` };
  }
}

export async function createCapture(input: { actorId: string; retailerId: string; text: string; channel: CaptureChannel }) {
  const [items, history, aliases] = await Promise.all([
    catalogueFor(input.retailerId),
    orderHistory(input.retailerId),
    db.retailerAlias.findMany({ where: { retailerId: input.retailerId } }),
  ]);
  const catalogue: CatalogueEntry[] = items.map((i) => ({ id: i.id, name: i.name, nameHi: i.nameHi, brand: i.brand, packLabel: i.packLabel, keywords: i.keywords, category: i.category }));
  const ctx = { catalogue, history, aliases: new Map(aliases.map((a) => [a.phrase, a.productId])) };
  const { lines, parser, note } = await extract(input.text, catalogue);

  const capture = await db.capture.create({
    data: {
      retailerId: input.retailerId,
      createdById: input.actorId,
      channel: input.channel,
      rawText: input.text,
      parser,
      parserNote: note,
      lines: {
        create: lines.slice(0, 40).map((l, position) => {
          const m = matchLine(l.words, l.sizes, ctx);
          return {
            position,
            rawText: l.raw.slice(0, 300),
            phrase: m.phrase.slice(0, 200),
            qty: l.qty,
            unit: l.unit,
            productId: m.productId,
            confidence: m.confidence,
            matchedBy: m.matchedBy,
            alternatives: m.alternatives as unknown as Prisma.InputJsonValue,
          };
        }),
      },
    },
  });
  return capture.id;
}

export type ReviewedLine = {
  lineId: string;
  removed: boolean;
  productId: string | null;
  cases: number | null;
  /** The person answered "case or piece?" for a line whose unit was not a case. */
  unitConfirmed: boolean;
  /** The person looked at a line that was not high confidence. */
  checked: boolean;
  /** A different SKU was chosen because the matched one is out of stock: not a correction, not learned. */
  substituted: boolean;
};

export type ConfirmProblem = { lineId: string; problem: "no_product" | "no_qty" | "unit" | "unchecked" | "unknown_product" };

export type ConfirmResult =
  | { ok: true; order: Extract<PlaceOrderResult, { ok: true }>; learned: number }
  | { ok: false; reason: "not_found" | "already_done" | "nothing_to_order" }
  | { ok: false; reason: "problems"; problems: ConfirmProblem[] }
  | { ok: false; reason: "order"; result: Extract<PlaceOrderResult, { ok: false }> };

/**
 * A person confirms the draft. Server-side rules, so the UI can't skip them:
 * every kept line has a SKU and a whole number of cases, every unclear unit was answered,
 * and every line that was not high confidence was ticked as checked.
 * Corrections (a different SKU from the suggestion) are saved as aliases for this retailer.
 */
export async function confirmCapture(input: { actorId: string; captureId: string; retailerScope: string | null; lines: ReviewedLine[] }): Promise<ConfirmResult> {
  const capture = await db.capture.findUnique({ where: { id: input.captureId }, include: { lines: true } });
  if (!capture || (input.retailerScope && capture.retailerId !== input.retailerScope)) return { ok: false, reason: "not_found" };
  if (capture.status !== "NEEDS_REVIEW") return { ok: false, reason: "already_done" };

  const reviewed = new Map(input.lines.map((l) => [l.lineId, l]));
  const validIds = new Set((await db.product.findMany({ where: { active: true }, select: { id: true } })).map((p) => p.id));
  const problems: ConfirmProblem[] = [];
  const items: { productId: string; cases: number }[] = [];
  const corrections: { phrase: string; productId: string }[] = [];

  for (const line of capture.lines) {
    const r = reviewed.get(line.id);
    if (!r) {
      problems.push({ lineId: line.id, problem: "unchecked" });
      continue;
    }
    if (r.removed) continue;
    if (!r.productId) problems.push({ lineId: line.id, problem: "no_product" });
    else if (!validIds.has(r.productId)) problems.push({ lineId: line.id, problem: "unknown_product" });
    if (!r.cases || !Number.isInteger(r.cases) || r.cases < 1) problems.push({ lineId: line.id, problem: "no_qty" });
    if (line.unit !== "CASE" && !r.unitConfirmed) problems.push({ lineId: line.id, problem: "unit" });
    const changedProduct = r.productId !== line.productId;
    if (confidenceLevel(line.confidence) !== "high" && !changedProduct && !r.checked) problems.push({ lineId: line.id, problem: "unchecked" });
    if (r.productId && r.cases && validIds.has(r.productId)) {
      items.push({ productId: r.productId, cases: r.cases });
      if (changedProduct && !r.substituted && line.phrase) corrections.push({ phrase: line.phrase, productId: r.productId });
    }
  }

  if (problems.length) return { ok: false, reason: "problems", problems };
  if (items.length === 0) return { ok: false, reason: "nothing_to_order" };

  let learned = 0;
  const result = await placeOrder({
    actorId: input.actorId,
    retailerId: capture.retailerId,
    items,
    idempotencyKey: `capture:${capture.id}`,
    source: "CAPTURE",
    afterCreate: async (tx, orderId) => {
      const done = await tx.capture.updateMany({ where: { id: capture.id, status: "NEEDS_REVIEW" }, data: { status: "CONFIRMED", orderId } });
      if (done.count === 0) throw new Error("Capture was confirmed by someone else");
      for (const c of corrections) {
        await tx.retailerAlias.upsert({
          where: { retailerId_phrase: { retailerId: capture.retailerId, phrase: c.phrase } },
          create: { retailerId: capture.retailerId, phrase: c.phrase, productId: c.productId, createdById: input.actorId },
          update: { productId: c.productId, createdById: input.actorId },
        });
        learned++;
      }
      await tx.auditLog.create({ data: { actorId: input.actorId, action: "capture.confirmed", entityId: capture.id, data: { orderId, learned } } });
    },
  });
  if (!result.ok) return { ok: false, reason: "order", result };
  return { ok: true, order: result, learned };
}

export async function discardCapture(captureId: string, actorId: string, retailerScope: string | null) {
  const res = await db.capture.updateMany({
    where: { id: captureId, status: "NEEDS_REVIEW", ...(retailerScope ? { retailerId: retailerScope } : {}) },
    data: { status: "DISCARDED" },
  });
  if (res.count) await db.auditLog.create({ data: { actorId, action: "capture.discarded", entityId: captureId } });
  return res.count > 0;
}
