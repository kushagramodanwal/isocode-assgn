/**
 * Sends the seeded WhatsApp messages to Gemini and compares the final SKU match with the rule reader.
 * Usage (after setting LLM_PROVIDER=gemini and GEMINI_API_KEY in .env):  npm run ai:check
 * Calls are paced to stay inside the free tier's per-minute limit.
 */
import { env } from "../server/src/env";
import { extractWithLlm } from "../server/src/services/llm";
import { parseMessage, type ExtractedLine } from "../shared/capture/parse";
import { matchWithAi, type MatchContext } from "../shared/capture/match";
import { INCOMING_MESSAGES } from "../prisma/data/people";
import { PRODUCTS } from "../prisma/data/catalogue";

if (!env.llmEnabled) {
  console.error("Gemini is off. Set LLM_PROVIDER=gemini and GEMINI_API_KEY in .env, then run again.");
  process.exit(1);
}

const ctx: MatchContext = {
  catalogue: PRODUCTS.map((p) => ({ id: p.code, name: p.name, nameHi: p.nameHi, brand: p.brand, packLabel: p.packLabel, keywords: p.keywords, category: p.category })),
  aliases: new Map(),
  history: new Map(),
};
const terms = [...new Set(PRODUCTS.map((p) => `${p.name} ${p.packLabel}`))];
const show = (l: ExtractedLine) => {
  const m = matchWithAi(l, ctx);
  return `${l.raw.slice(0, 32).padEnd(33)} ${String(l.qty).padStart(3)} ${l.unit.padEnd(7)} → ${(m.productId ?? "no match").padEnd(11)} ${m.level} ${m.confidence}%${m.matchedBy === "ai" ? " (AI suggestion)" : ""}`;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

console.log(`Model: ${env.llmModel}\n`);
for (const [i, m] of INCOMING_MESSAGES.entries()) {
  if (i > 0) await sleep(13_000); // free tier: 5 requests per minute
  console.log(`Message: ${m.text.replace(/\n/g, " / ")}`);
  const started = Date.now();
  try {
    const lines = await extractWithLlm(m.text, terms);
    console.log(`  Gemini (${Date.now() - started} ms):`);
    lines.forEach((l) => console.log(`    ${show(l)}`));
  } catch (e) {
    console.log(`  Gemini failed after ${Date.now() - started} ms: ${String(e instanceof Error ? e.message : e).slice(0, 140)} (the app falls back to rules)`);
  }
  console.log("  Rules:");
  parseMessage(m.text).forEach((l) => console.log(`    ${show(l)}`));
  console.log();
}
