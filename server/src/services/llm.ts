import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4"; // the SDK helper takes Zod 4 schemas
import { env } from "../env";
import { parseLine, type ExtractedLine } from "../../../shared/capture/parse";
import { normaliseText, tokenise } from "../../../shared/capture/text";

/**
 * Optional LLM extraction. The model only splits the message into lines and rewrites the
 * product words into catalogue vocabulary. SKU matching and confidence stay in match.ts, so
 * every score is explainable, and the unit is never taken from the model's guess (see reconcile).
 */
const LineSchema = z.object({
  original: z.string().describe("The exact words from the message for this line, copied verbatim"),
  quantity: z.number().int().nullable().describe("Number of units ordered, null if not stated"),
  unit: z.enum(["CASE", "PIECE", "UNKNOWN"]),
  product: z.string().describe("Product words in simple English using catalogue terms, e.g. 'glucose biscuit small'"),
  pack_size: z.string().nullable().describe("Pack size if stated, e.g. '250 g', '1 kg', else null"),
});
const OutputSchema = z.object({ lines: z.array(LineSchema).max(40) });

const SYSTEM = `You read orders that kirana shop owners in Jabalpur send to their FMCG distributor on WhatsApp.
Messages mix Hindi, Hinglish and English. Split the message into one line per product.
Rules:
- "original" must be copied exactly from the message.
- unit is CASE only for words meaning a case or carton (peti, case, carton, ctn, पेटी). PIECE only for piece/packet words (pc, pkt, packet, nag). Anything else, including dabba or box or no unit word, is UNKNOWN. Never guess.
- quantity is the count of units ordered, not the pack size. "250 wala" and "1 kilo" are pack sizes.
- If a quantity is not stated or is a fraction, use null.
- Ignore greetings and requests like "bhaiya", "bhej dena".`;

let client: Anthropic | null = null;

export async function extractWithLlm(message: string, catalogueTerms: string[]): Promise<ExtractedLine[]> {
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 15_000, maxRetries: 1 });
  const response = await client.messages.parse({
    model: env.llmModel,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(OutputSchema) },
    system: [
      { type: "text", text: SYSTEM },
      { type: "text", text: `Catalogue terms: ${catalogueTerms.join("; ")}`, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: message }],
  });
  if (response.stop_reason === "refusal") throw new Error("model declined the message");
  if (response.stop_reason === "max_tokens") throw new Error("model output was cut off");
  const out = response.parsed_output;
  if (!out) throw new Error("model output did not match the schema");
  return out.lines.map((l) => reconcile(l, message));
}

/**
 * Cross-check the model against the deterministic parser on the same words.
 * - Unit: only what the retailer actually wrote. If the rules see no unit word, it stays UNKNOWN.
 * - Quantity: if the two disagree, it becomes null so a person is asked.
 * - Original words: must really appear in the message, otherwise we fall back to the model's text
 *   but the rules parse of it still drives unit and quantity.
 */
function reconcile(l: z.infer<typeof LineSchema>, message: string): ExtractedLine {
  const raw = message.includes(l.original) ? l.original : l.original.trim();
  const rules = parseLine(raw);
  const words = tokenise(normaliseText(l.product)).filter((t) => !/^\d/.test(t));
  const sizeLine = l.pack_size ? parseLine(`${l.pack_size} wala`) : null;
  const qty = rules.qty !== null && l.quantity !== null && rules.qty !== l.quantity ? null : (rules.qty ?? l.quantity);
  return {
    raw,
    qty: qty !== null && qty > 0 ? qty : null,
    unit: rules.unit,
    words: words.length ? words : rules.words,
    sizes: sizeLine?.sizes.length ? sizeLine.sizes : rules.sizes,
  };
}
