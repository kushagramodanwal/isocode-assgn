/** Scores a capture reader against the labelled set. Pure; used by a test and by the eval script. */
import type { ExtractedLine } from "../parse";
import { matchWithAi, type MatchContext, type MatchResult } from "../match";
import type { EvalCase } from "./cases";

export type LineOutcome = {
  caseId: string;
  anchor: string;
  expectedSku: string | null;
  gotSku: string | null;
  level: MatchResult["level"] | "missing";
  confidence: number;
  skuOk: boolean;
  qtyOk: boolean;
  unitOk: boolean;
  /** Wrong product (or a product where there is none) shown as "Sure": the desk would wave it through. */
  dangerous: boolean;
  ambiguous: boolean;
};

export type Report = {
  lines: number;
  skuAccuracy: number;
  qtyAccuracy: number;
  unitAccuracy: number;
  dangerous: number;
  autoAccepted: number; // correct and "Sure": lines the desk doesn't need to read
  ambiguousHandled: number; // ambiguous lines either right or not shown as "Sure"
  ambiguousTotal: number;
  extraLines: number; // predicted lines that match no expected line
  outcomes: LineOutcome[];
};

const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 100);

export function scoreCase(c: EvalCase, predicted: ExtractedLine[], ctx: MatchContext): LineOutcome[] {
  const used = new Set<number>();
  return c.lines.map((exp) => {
    const i = predicted.findIndex((p, idx) => !used.has(idx) && p.raw.toLowerCase().includes(exp.anchor.toLowerCase()));
    if (i < 0) {
      return { caseId: c.id, anchor: exp.anchor, expectedSku: exp.sku, gotSku: null, level: "missing" as const, confidence: 0, skuOk: false, qtyOk: false, unitOk: false, dangerous: false, ambiguous: !!exp.ambiguous };
    }
    used.add(i);
    const p = predicted[i]!;
    const m = matchWithAi(p, ctx);
    const skuOk = m.productId === exp.sku;
    return {
      caseId: c.id,
      anchor: exp.anchor,
      expectedSku: exp.sku,
      gotSku: m.productId,
      level: m.level,
      confidence: m.confidence,
      skuOk,
      qtyOk: p.qty === exp.qty,
      unitOk: p.unit === exp.unit,
      dangerous: !skuOk && m.level === "high",
      ambiguous: !!exp.ambiguous,
    };
  });
}

export function report(outcomes: LineOutcome[], extraLines: number): Report {
  const n = outcomes.length;
  const amb = outcomes.filter((o) => o.ambiguous);
  return {
    lines: n,
    skuAccuracy: pct(outcomes.filter((o) => o.skuOk).length, n),
    qtyAccuracy: pct(outcomes.filter((o) => o.qtyOk).length, n),
    unitAccuracy: pct(outcomes.filter((o) => o.unitOk).length, n),
    dangerous: outcomes.filter((o) => o.dangerous).length,
    autoAccepted: pct(outcomes.filter((o) => o.skuOk && o.level === "high").length, n),
    ambiguousHandled: amb.filter((o) => o.skuOk || o.level !== "high").length,
    ambiguousTotal: amb.length,
    extraLines,
    outcomes,
  };
}

export async function evaluate(
  cases: EvalCase[],
  read: (message: string) => Promise<ExtractedLine[]> | ExtractedLine[],
  ctx: MatchContext,
): Promise<Report> {
  const outcomes: LineOutcome[] = [];
  let extra = 0;
  for (const c of cases) {
    const predicted = await read(c.message);
    const o = scoreCase(c, predicted, ctx);
    outcomes.push(...o);
    extra += Math.max(0, predicted.length - o.filter((x) => x.level !== "missing").length);
  }
  return report(outcomes, extra);
}
