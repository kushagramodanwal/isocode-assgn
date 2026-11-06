/**
 * The Gemini adapter without a network or a key: the SDK is mocked, so these tests pin down
 * the guardrails (unit and quantity cross-checks) and every way the model's answer can be unusable.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// A plain stub, not vi.fn: a spy wrapping a rejecting async function reports a stray rejection.
const stub: { impl: (req: unknown) => Promise<unknown>; calls: { config: { responseMimeType: string; temperature: number } }[] } = {
  impl: async () => ({}),
  calls: [],
};
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: (req: never) => { stub.calls.push(req); return stub.impl(req); } };
  },
  Type: { OBJECT: "OBJECT", ARRAY: "ARRAY", STRING: "STRING", INTEGER: "INTEGER" },
}));
vi.mock("../env", () => ({ env: { GEMINI_API_KEY: "test", llmModel: "gemini-flash-latest" } }));

const { extractWithLlm, reconcile } = await import("./llm");

const BRIEF = "bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti";
const reply = (lines: unknown[], finishReason = "STOP") => ({ text: JSON.stringify({ lines }), candidates: [{ finishReason }] });

beforeEach(() => { stub.calls = []; stub.impl = async () => ({}); });

describe("extractWithLlm (Gemini, mocked)", () => {
  it("turns a good answer into lines, with catalogue words from the model", async () => {
    stub.impl = async () => reply([
      { original: "bhaiya 5 peti biscuit chhota", quantity: 5, unit: "CASE", product: "glucose biscuit small", pack_size: null },
      { original: "2 peti washing powder 1 kilo", quantity: 2, unit: "CASE", product: "detergent powder", pack_size: "1 kg" },
      { original: "chai patti 250 wala 1 peti", quantity: 1, unit: "CASE", product: "tea leaf", pack_size: "250 g" },
    ]);
    const lines = await extractWithLlm(BRIEF, ["Glucose biscuit 75 g"]);
    expect(lines.map((l) => [l.qty, l.unit])).toEqual([[5, "CASE"], [2, "CASE"], [1, "CASE"]]);
    expect(lines[1]!.words).toEqual(["detergent", "powder"]);
    expect(lines[1]!.sizes).toEqual([{ value: 1000, unit: "g" }]);
    const call = stub.calls[0]!;
    expect(call.config.responseMimeType).toBe("application/json");
    expect(call.config.temperature).toBe(0);
  });

  it.each([
    ["not JSON", { text: "Sure! Here is your order", candidates: [{ finishReason: "STOP" }] }, /not JSON/],
    ["wrong shape", { text: JSON.stringify({ items: [] }), candidates: [{ finishReason: "STOP" }] }, /schema/],
    ["cut off", reply([], "MAX_TOKENS"), /cut off/],
    ["safety stop", reply([], "SAFETY"), /stopped early/],
    ["blocked prompt", { text: "", promptFeedback: { blockReason: "OTHER" } }, /blocked/],
  ])("throws on %s, so capture falls back to the rule reader", async (_name, res, msg) => {
    stub.impl = async () => res;
    await expect(extractWithLlm(BRIEF, [])).rejects.toThrow(msg);
  });

  it.each([["network failure", "fetch failed"], ["timeout", "The operation was aborted due to timeout"]])("throws on %s", async (_n, message) => {
    stub.impl = async () => { throw new Error(message); };
    await expect(extractWithLlm(BRIEF, [])).rejects.toThrow(message);
  });
});

describe("reconcile: the model never decides the unit, and disagreement means 'ask'", () => {
  it("keeps UNKNOWN when the retailer wrote no unit word, whatever the model says", () => {
    const l = reconcile({ original: "biscuit 5", quantity: 5, unit: "CASE", product: "glucose biscuit", pack_size: null }, "biscuit 5");
    expect(l.unit).toBe("UNKNOWN");
    expect(l.qty).toBe(5);
  });

  it("'dabba' stays a question even if the model calls it a case", () => {
    expect(reconcile({ original: "10 dabba noodles", quantity: 10, unit: "CASE", product: "masala noodles", pack_size: null }, "10 dabba noodles").unit).toBe("UNKNOWN");
  });

  it("empties the quantity when model and rules disagree", () => {
    const l = reconcile({ original: "2 peti namak", quantity: 20, unit: "CASE", product: "salt", pack_size: null }, "2 peti namak");
    expect(l.qty).toBeNull();
  });

  it("uses the model's quantity when the rules found none (e.g. number words the rules don't know)", () => {
    const l = reconcile({ original: "solah peti poha", quantity: 16, unit: "CASE", product: "poha", pack_size: null }, "solah peti poha");
    expect(l.qty).toBe(16);
    expect(l.unit).toBe("CASE");
  });

  it("falls back to the rule words if the model returns no product words", () => {
    expect(reconcile({ original: "3 peti haldi", quantity: 3, unit: "CASE", product: "", pack_size: null }, "3 peti haldi").words).toEqual(["haldi"]);
  });
});
