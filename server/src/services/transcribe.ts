import { GoogleGenAI, ThinkingLevel, Type, type Schema } from "@google/genai";
import { z } from "zod";
import { env } from "../env";
import type { MediaKind } from "./media";

/**
 * Turns a photo of a list or a voice note into the order's words, with Gemini.
 * The model only writes down what is there: no translating, no correcting, no adding.
 * The transcript then goes through the same text pipeline (and guardrails) as a typed order.
 */
const Transcript = z.object({ lines: z.array(z.string()).max(40), isOrder: z.boolean() });

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    lines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "One ordered item per line, as written or said" },
    isOrder: { type: Type.BOOLEAN, description: "false if this is not a list of products to order" },
  },
  required: ["lines", "isOrder"],
  propertyOrdering: ["lines", "isOrder"],
};

const RULES = `- One item per line, with its quantity and unit exactly as given (peti, case, packet, dabba...).
- Do not translate, correct spelling, convert units or add anything that is not there.
- Write [unclear] in place of any word or number you cannot read or hear with confidence. Never guess a number.
- Leave out greetings and chit-chat.
- If it is not an order (a selfie, music, silence), return no lines and isOrder=false.`;

const PROMPTS: Record<MediaKind, string> = {
  PHOTO: `This is a photo of a handwritten or printed order list from a kirana shop in Jabalpur, India, for its FMCG distributor.
Copy the list. Keep the script it is written in: Devanagari stays Devanagari, Roman stays Roman. Write numbers as digits.
${RULES}`,
  VOICE: `This is a voice note from a kirana shop owner in Jabalpur, India, ordering stock from their distributor. It is usually in Hindi or Hinglish.
Write down what they order in Roman Hinglish as spoken (for example "5 peti biscuit chhota"), with numbers as digits.
${RULES}`,
};

export class MediaUnreadable extends Error {}

let client: GoogleGenAI | null = null;

export async function transcribeMedia(kind: MediaKind, mimeType: string, bytes: Uint8Array): Promise<string[]> {
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: env.llmModel,
    contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } }, { text: PROMPTS[kind] }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      temperature: 0,
      maxOutputTokens: 4000,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      // Images and audio take longer than text.
      abortSignal: AbortSignal.timeout(Math.max(env.LLM_TIMEOUT_MS, 45_000)),
    },
  });
  if (response.promptFeedback?.blockReason) throw new Error(`blocked (${response.promptFeedback.blockReason})`);
  const finish = response.candidates?.[0]?.finishReason;
  if (finish && finish !== "STOP") throw new Error(`model stopped early (${finish})`);
  let json: unknown;
  try {
    json = JSON.parse(response.text ?? "");
  } catch {
    throw new Error("model output was not JSON");
  }
  const out = Transcript.safeParse(json);
  if (!out.success) throw new Error("model output did not match the schema");
  const lines = out.data.lines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!out.data.isOrder || lines.length === 0) {
    throw new MediaUnreadable(kind === "PHOTO" ? "No order list could be read in this photo." : "No order could be heard in this voice note.");
  }
  return lines;
}
