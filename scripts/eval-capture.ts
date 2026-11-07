/**
 * Scores message capture on the labelled set (shared/capture/eval/cases.ts).
 *   npm run eval            rule-based reader, with and without shop history
 *   npm run eval -- --gemini   also Gemini (needs GEMINI_API_KEY; paced for the free tier)
 */
import { EVAL_CASES, TYPICAL_HISTORY } from "../shared/capture/eval/cases";
import { evaluate, type Report } from "../shared/capture/eval/score";
import { parseMessage } from "../shared/capture/parse";
import type { MatchContext } from "../shared/capture/match";
import { PRODUCTS } from "../prisma/data/catalogue";

const catalogue = PRODUCTS.map((p) => ({ id: p.code, name: p.name, nameHi: p.nameHi, brand: p.brand, packLabel: p.packLabel, keywords: p.keywords, category: p.category }));
const ctx = (history: Record<string, number>): MatchContext => ({ catalogue, aliases: new Map(), history: new Map(Object.entries(history)) });

function print(name: string, r: Report) {
  console.log(`\n${name}`);
  console.log(`  lines ${r.lines} · SKU ${r.skuAccuracy}% · qty ${r.qtyAccuracy}% · unit ${r.unitAccuracy}%`);
  console.log(`  dangerous (wrong but "Sure") ${r.dangerous} · auto-accepted ${r.autoAccepted}% · ambiguous handled ${r.ambiguousHandled}/${r.ambiguousTotal} · extra lines ${r.extraLines}`);
  for (const o of r.outcomes.filter((x) => !x.skuOk || !x.qtyOk || !x.unitOk)) {
    const flags = [!o.skuOk && "sku", !o.qtyOk && "qty", !o.unitOk && "unit"].filter(Boolean).join("+");
    console.log(`  ${o.dangerous ? "!!" : "  "} ${o.caseId.padEnd(18)} "${o.anchor}"`.padEnd(46) + ` want ${String(o.expectedSku).padEnd(11)} got ${String(o.gotSku).padEnd(11)} ${o.level} ${o.confidence}% [${flags}]`);
  }
}

console.log(`Catalogue: ${catalogue.length} SKUs · ${EVAL_CASES.length} messages`);
print("Rules, with shop history", await evaluate(EVAL_CASES, parseMessage, ctx(TYPICAL_HISTORY)));
print("Rules, no history", await evaluate(EVAL_CASES, parseMessage, ctx({})));

if (process.argv.includes("--gemini")) {
  const { env } = await import("../server/src/env");
  const { extractWithLlm } = await import("../server/src/services/llm");
  if (!env.llmEnabled) throw new Error("Set LLM_PROVIDER=gemini and GEMINI_API_KEY in .env");
  const terms = [...new Set(PRODUCTS.map((p) => `${p.name} ${p.packLabel}`))];
  let failures = 0;
  const read = async (m: string) => {
    await new Promise((r) => setTimeout(r, 13_000)); // free tier: 5 requests a minute
    try {
      return await extractWithLlm(m, terms);
    } catch {
      failures++;
      return parseMessage(m); // what the app does
    }
  };
  const r = await evaluate(EVAL_CASES, read, ctx(TYPICAL_HISTORY));
  print(`Gemini (${env.llmModel}) + guardrails, with shop history · ${failures} calls fell back to rules`, r);
}
