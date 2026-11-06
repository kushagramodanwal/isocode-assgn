/**
 * Sends the seeded WhatsApp messages to Gemini and prints what comes back next to the rule reader.
 * Usage (after setting LLM_PROVIDER=gemini and GEMINI_API_KEY in .env):  npm run ai:check
 */
import { env } from "../server/src/env";
import { extractWithLlm } from "../server/src/services/llm";
import { parseMessage } from "../shared/capture/parse";
import { INCOMING_MESSAGES } from "../prisma/data/people";
import { PRODUCTS } from "../prisma/data/catalogue";

if (!env.llmEnabled) {
  console.error("Gemini is off. Set LLM_PROVIDER=gemini and GEMINI_API_KEY in .env, then run again.");
  process.exit(1);
}

const terms = [...new Set(PRODUCTS.map((p) => `${p.name} ${p.packLabel}`))];
const show = (l: { raw: string; qty: number | null; unit: string; words: string[]; sizes: { value: number; unit: string | null }[] }) =>
  `${l.raw.padEnd(34)} qty=${String(l.qty).padEnd(4)} ${l.unit.padEnd(7)} [${l.words.join(" ")}]${l.sizes.length ? ` size=${l.sizes.map((s) => `${s.value}${s.unit ?? ""}`).join(",")}` : ""}`;

console.log(`Model: ${env.llmModel}\n`);
for (const m of INCOMING_MESSAGES) {
  console.log(`Message: ${m.text.replace(/\n/g, " / ")}`);
  const started = Date.now();
  try {
    const lines = await extractWithLlm(m.text, terms);
    console.log(`  Gemini (${Date.now() - started} ms):`);
    lines.forEach((l) => console.log(`    ${show(l)}`));
  } catch (e) {
    console.log(`  Gemini failed: ${e instanceof Error ? e.message : e} (the app would fall back to rules)`);
  }
  console.log("  Rules:");
  parseMessage(m.text).forEach((l) => console.log(`    ${show(l)}`));
  console.log();
}
