import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { z } from "zod";
import { env } from "../env";
import { parseLine, type ExtractedLine } from "../../../shared/capture/parse";
import { normaliseText, tokenise } from "../../../shared/capture/text";

/**
 * Optional LLM extraction with Google Gemini (AI Studio key). The model only splits the message
 * into lines and rewrites the product words into catalogue vocabulary. SKU matching and confidence
 * stay in match.ts, so every score is explainable, and the unit is never taken from the model's
 * guess (see reconcile).
 */
const LineSchema = z.object({
  original: z.string(),
  quantity: z.number().int().nullable(),
  unit: z.enum(["CASE", "PIECE", "UNKNOWN"]),
  product: z.string(),
  pack_size: z.string().nullable(),
});
const OutputSchema = z.object({ lines: z.array(LineSchema).max(40) });
export type LlmLine = z.infer<typeof LineSchema>;

/** The same shape for Gemini's constrained JSON output. Validated again with zod on arrival. */
const GEMINI_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING, description: "The exact words from the message for this line, copied verbatim" },
          quantity: { type: Type.INTEGER, nullable: true, description: "Number of units ordered, null if not stated" },
          unit: { type: Type.STRING, enum: ["CASE", "PIECE", "UNKNOWN"] },
          product: { type: Type.STRING, description: "Product words in simple English using catalogue terms, e.g. 'glucose biscuit small'" },
          pack_size: { type: Type.STRING, nullable: true, description: "Pack size if stated, e.g. '250 g', '1 kg', else null" },
        },
        required: ["original", "quantity", "unit", "product", "pack_size"],
        propertyOrdering: ["original", "quantity", "unit", "product", "pack_size"],
      },
    },
  },
  required: ["lines"],
};

const SYSTEM = `You read orders that kirana shop owners in Jabalpur send to their FMCG distributor on WhatsApp.
Messages mix Hindi, Hinglish and English. Split the message into one line per product.
Rules:
- "original" must be copied exactly from the message.
- unit is CASE only for words meaning a case or carton (peti, case, carton, ctn, पेटी). PIECE only for piece/packet words (pc, pkt, packet, nag). Anything else, including dabba or box or no unit word, is UNKNOWN. Never guess.
- quantity is the count of units ordered, not the pack size. "250 wala" and "1 kilo" are pack sizes.
- If a quantity is not stated or is a fraction, use null.
- Ignore greetings and requests like "bhaiya", "bhej dena".`;

const TIMEOUT_MS = 15_000;
let client: GoogleGenAI | null = null;

export async function extractWithLlm(message: string, catalogueTerms: string[]): Promise<ExtractedLine[]> {
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: env.llmModel,
    contents: message,
    config: {
      systemInstruction: `${SYSTEM}\n\nCatalogue terms: ${catalogueTerms.join("; ")}`,
      responseMimeType: "application/json",
      responseSchema: GEMINI_SCHEMA,
      temperature: 0,
      maxOutputTokens: 4000,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });
  const finish = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason) throw new Error(`message blocked (${response.promptFeedback.blockReason})`);
  if (finish === "MAX_TOKENS") throw new Error("model output was cut off");
  if (finish && finish !== "STOP") throw new Error(`model stopped early (${finish})`);
  let json: unknown;
  try {
    json = JSON.parse(response.text ?? "");
  } catch {
    throw new Error("model output was not JSON");
  }
  const out = OutputSchema.safeParse(json);
  if (!out.success) throw new Error("model output did not match the schema");
  return out.data.lines.map((l) => reconcile(l, message));
}

/**
 * Cross-check the model against the deterministic parser on the same words.
 * - Unit: only what the retailer actually wrote. If the rules see no unit word, it stays UNKNOWN.
 * - Quantity: if the two disagree, it becomes null so a person is asked.
 * - Original words: must really appear in the message, otherwise we fall back to the model's text
 *   but the rules parse of it still drives unit and quantity.
 */
export function reconcile(l: LlmLine, message: string): ExtractedLine {
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
