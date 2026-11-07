import { describe, expect, it } from "vitest";
import { PRODUCTS } from "../../prisma/data/catalogue";
import { parseLine, parseMessage, splitLines } from "./parse";
import { matchLine, matchWithAi, phraseKey, AI_ONLY_CAP, type MatchContext } from "./match";
import { sizeMatches, tokenSimilarity } from "./text";

const catalogue = PRODUCTS.map((p) => ({ id: p.code, name: p.name, nameHi: p.nameHi, brand: p.brand, packLabel: p.packLabel, keywords: p.keywords, category: p.category }));
const ctx = (over: Partial<MatchContext> = {}): MatchContext => ({ catalogue, aliases: new Map(), history: new Map(), ...over });

function capture(message: string, c = ctx()) {
  return parseMessage(message).map((l) => ({ ...l, match: matchLine(l.words, l.sizes, c) }));
}

const BRIEF = "bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti";

// Sharma General Store's real ordering pattern from the seed: the glucose biscuit is a regular.
const SHARMA = ctx({ history: new Map([["SKU-BS-075", 8], ["SKU-DT-1KG", 6], ["SKU-TE-250", 5]]) });

describe("the brief's sample message", () => {
  const lines = capture(BRIEF, SHARMA);

  it("finds three lines, each keeping the retailer's own words", () => {
    expect(lines.map((l) => l.raw)).toEqual([
      "bhaiya 5 peti biscuit chhota",
      "2 peti washing powder 1 kilo",
      "chai patti 250 wala 1 peti",
    ]);
  });

  it("reads quantities in cases ('peti')", () => {
    expect(lines.map((l) => [l.qty, l.unit])).toEqual([
      [5, "CASE"],
      [2, "CASE"],
      [1, "CASE"],
    ]);
  });

  it("maps each line to the right SKU with high confidence, using the shop's history", () => {
    expect(lines.map((l) => l.match.productId)).toEqual(["SKU-BS-075", "SKU-DT-1KG", "SKU-TE-250"]);
    for (const l of lines) expect(l.match.level).toBe("high");
  });

  it("without history, 'biscuit chhota' is honestly not 'Sure' (three small biscuits fit those words)", () => {
    const m = capture(BRIEF)[0]!.match;
    expect(m.level).not.toBe("high");
  });

  it("offers two alternatives per line, and they are look-alikes", () => {
    expect(lines[0]!.match.alternatives).toHaveLength(2);
    for (const a of lines[0]!.match.alternatives) expect(catalogue.find((c) => c.id === a.productId)!.name).toMatch(/biscuit/i);
    expect(lines[2]!.match.alternatives.map((a) => a.productId)).toContain("SKU-TE-500");
  });

  it("always offers two alternatives, never the match itself", () => {
    for (const msg of ["3 peti poha", "2 peti haldi", "1 peti ketchup"]) {
      const m = capture(msg)[0]!.match;
      expect(m.alternatives).toHaveLength(2);
      expect(m.alternatives.map((a) => a.productId)).not.toContain(m.productId);
    }
  });

  it("prefers alternatives from the same category as the match", () => {
    for (const a of lines[1]!.match.alternatives) expect(catalogue.find((c) => c.id === a.productId)!.category).toBe("home");
  });
});

describe("units are asked, not guessed", () => {
  it.each([
    ["5 biscuit", 5, "UNKNOWN"],
    ["10 dabba noodles", 10, "UNKNOWN"],
    ["noodles 2 box", 2, "UNKNOWN"],
    ["24 pkt haldi", 24, "PIECE"],
    ["haldi 3 case", 3, "CASE"],
    ["teen peti namak", 3, "CASE"],
    ["5peti poha", 5, "CASE"],
    ["तीन पेटी नमक", 3, "CASE"],
    ["५ पेटी बिस्कुट", 5, "CASE"],
  ])("%s → %s %s", (text, qty, unit) => {
    const l = parseLine(text);
    expect(l.qty).toBe(qty);
    expect(l.unit).toBe(unit);
  });

  it("a unit word next to the number wins over a descriptive one", () => {
    const l = parseLine("kala dabba wala 3 peti");
    expect([l.qty, l.unit]).toEqual([3, "CASE"]);
    expect(parseLine("10 dabba noodles").unit).toBe("UNKNOWN"); // still asked when dabba is the only unit
  });

  it("a missing quantity stays missing", () => {
    expect(parseLine("thoda haldi bhej dena").qty).toBeNull();
    expect(parseLine("aadha peti poha").qty).toBeNull();
  });

  it("'do' means two before a unit, and 'give' at the end", () => {
    expect(parseLine("do peti namak").qty).toBe(2);
    expect(parseLine("namak 3 peti bhej do").qty).toBe(3);
  });
});

describe("pack sizes are not quantities", () => {
  it("separates 'biscuit 200 g 4 peti'", () => {
    const l = parseLine("biscuit 200 g 4 peti");
    expect(l.qty).toBe(4);
    expect(l.sizes).toEqual([{ value: 200, unit: "g" }]);
  });

  it("treats a large bare number as a pack size", () => {
    const l = parseLine("biscuit 75 3 peti");
    expect(l.qty).toBe(3);
    expect(l.sizes).toEqual([{ value: 75, unit: null }]);
  });

  it("size picks the right pack", () => {
    expect(capture("2 peti biscuit 200 gram")[0]!.match.productId).toBe("SKU-BS-200");
    expect(capture("1 peti chai 500 wala")[0]!.match.productId).toBe("SKU-TE-500");
    expect(capture("3 peti surf 500 g")[0]!.match.productId).toBe("SKU-DT-500");
  });

  it("size helpers", () => {
    expect(sizeMatches({ value: 1000, unit: "g" }, "1 kg")).toBe(true);
    expect(sizeMatches({ value: 1, unit: null }, "1 kg")).toBe(true);
    expect(sizeMatches({ value: 250, unit: null }, "250 ml")).toBe(true);
    expect(sizeMatches({ value: 500, unit: "g" }, "1 kg")).toBe(false);
  });
});

describe("splitting a message", () => {
  it("splits on commas, new lines, 'aur' and numbering", () => {
    expect(splitLines("1) 2 peti namak\n2) haldi 1 peti aur poha 3 peti. bas")).toEqual([
      "2 peti namak",
      "haldi 1 peti",
      "poha 3 peti",
      "bas",
    ]);
  });

  it("list numbering left on a line is neither a quantity nor a size", () => {
    const l = parseLine("4) lal wala sabun 3 peti");
    expect(l.qty).toBe(3);
    expect(l.sizes).toEqual([]);
  });

  it("keeps decimals inside sizes", () => {
    expect(splitLines("1.5 kg wala namak 2 peti")).toHaveLength(1);
  });

  it("drops greetings that name no product", () => {
    expect(parseMessage("namaste bhaiya,\n2 peti namak")).toHaveLength(1);
  });
});

describe("matching when unsure", () => {
  it("handles misspellings", () => {
    expect(tokenSimilarity("biskut", "biscuit")).toBeGreaterThan(0.85);
    expect(capture("4 peti nudals")[0]!.match.productId).toBe("SKU-ND-070");
    expect(capture("2 peti detergnt 1 kg")[0]!.match.productId).toBe("SKU-DT-1KG");
  });

  it("an ambiguous word gets a lower confidence, not a confident guess", () => {
    const m = capture("2 peti biscuit")[0]!.match;
    expect(m.level).not.toBe("high");
    expect(m.alternatives).toHaveLength(2);
  });

  it("does not guess when nothing matches", () => {
    const m = capture("3 peti rocket")[0]!.match;
    expect(m.productId).toBeNull();
    expect(m.level).toBe("low");
    expect(m.matchedBy).toBe("none");
  });

  it("the retailer's history breaks a near tie", () => {
    const m = capture("2 peti biscuit", ctx({ history: new Map([["SKU-BS-200", 6]]) }))[0]!.match;
    expect(m.productId).toBe("SKU-BS-200");
    expect(m.matchedBy).toBe("history");
  });

  it("a learned alias wins with high confidence and keeps alternatives", () => {
    const words = parseLine("3 peti lal wala sabun").words;
    const key = phraseKey(words, []);
    const m = matchLine(words, [], ctx({ aliases: new Map([[key, "SKU-SP-100"]]) }));
    expect(m.productId).toBe("SKU-SP-100");
    expect(m.matchedBy).toBe("alias");
    expect(m.level).toBe("high");
    expect(m.alternatives.map((a) => a.productId)).not.toContain("SKU-SP-100");
  });

  it("ignores an alias pointing at a product no longer in the catalogue", () => {
    const m = matchLine(["namak"], [], ctx({ aliases: new Map([["namak", "SKU-GONE"]]) }));
    expect(m.productId).toBe("SKU-SL-1KG");
  });

  it("reads Devanagari product names", () => {
    expect(capture("दो पेटी हल्दी")[0]!.match.productId).toBe("SKU-HL-100");
  });
});

describe("AI-suggested words can help, but never hide doubt", () => {
  it("agreement lifts confidence a little, not to certainty", () => {
    const own = matchLine(["biscuit"], [], ctx());
    const m = matchWithAi({ words: ["biscuit"], sizes: [], aiWords: ["glucose", "biscuit"] }, ctx());
    expect(m.productId).toBe(own.productId);
    expect(m.confidence).toBeLessThanOrEqual(own.confidence + 15);
    expect(m.level).not.toBe("high"); // "biscuit 5" still asks a person
  });

  it("weak own words plus an agreeing AI stay low: 'lal wala sabun' still needs a person", () => {
    const m = matchWithAi({ words: ["lal", "sabun"], sizes: [], aiWords: ["detergent", "bar"] }, ctx());
    expect(m.productId).toBe("SKU-DB-150");
    expect(m.level).toBe("low");
  });

  it("an AI-only suggestion (own words match nothing) is labelled and capped at medium", () => {
    const m = matchWithAi({ words: ["kala", "dabba"], sizes: [], aiWords: ["thick", "poha"] }, ctx());
    expect(m.productId).toBe("SKU-PH-500");
    expect(m.matchedBy).toBe("ai");
    expect(m.confidence).toBeLessThanOrEqual(AI_ONLY_CAP);
    expect(m.level).toBe("medium");
  });

  it("a shop's learned alias beats the AI, keyed on the shop's own words", () => {
    const m = matchWithAi({ words: ["lal", "sabun"], sizes: [], aiWords: ["detergent", "bar"] }, ctx({ aliases: new Map([["lal sabun", "SKU-SP-100"]]) }));
    expect(m.productId).toBe("SKU-SP-100");
    expect(m.matchedBy).toBe("alias");
    expect(m.phrase).toBe("lal sabun");
  });

  it("no AI words: same as the plain matcher", () => {
    expect(matchWithAi({ words: ["namak"], sizes: [] }, ctx())).toEqual(matchLine(["namak"], [], ctx()));
  });
});

describe("matching details found by the evaluation set", () => {
  it("a longer, different word is not a match ('rocket' is not 'rock salt')", () => {
    expect(tokenSimilarity("rocket", "rock")).toBe(0);
    expect(tokenSimilarity("biscuits", "biscuit")).toBeGreaterThan(0.85);
    expect(tokenSimilarity("choco", "chocolate")).toBeGreaterThan(0.7);
  });

  it("splits messages that skip commas, quantity last or first", () => {
    expect(splitLines("lal mirch 5 peti dhania 3 peti haldi 200 gm 2 peti")).toEqual(["lal mirch 5 peti", "dhania 3 peti", "haldi 200 gm 2 peti"]);
    expect(splitLines("5 peti namak 2 peti haldi")).toEqual(["5 peti namak", "2 peti haldi"]);
  });

  it("'4 pack wala' describes the product; the order is '2 peti'", () => {
    const l = parseLine("nudals 4 pack wala 2 peti");
    expect([l.qty, l.unit]).toEqual([2, "CASE"]);
    expect(l.words).toContain("pack");
  });

  it("Devanagari size words count like their Hinglish spelling", () => {
    expect(capture("दो पेटी आलू भुजिया बड़ा")[0]!.match.productId).toBe("SKU-NK-400");
  });
});

describe("evaluation set (shared/capture/eval): quality floor for the rule reader", async () => {
  const { EVAL_CASES, TYPICAL_HISTORY } = await import("./eval/cases");
  const { evaluate } = await import("./eval/score");
  const r = await evaluate(EVAL_CASES, parseMessage, ctx({ history: new Map(Object.entries(TYPICAL_HISTORY)) }));

  it("never shows a wrong product as 'Sure'", () => expect(r.dangerous).toBe(0));
  it("reads every quantity and unit right", () => {
    expect(r.qtyAccuracy).toBe(100);
    expect(r.unitAccuracy).toBe(100);
  });
  it("gets at least 95% of SKUs right with shop history", () => expect(r.skuAccuracy).toBeGreaterThanOrEqual(95));
  it("handles every ambiguous line safely", () => expect(r.ambiguousHandled).toBe(r.ambiguousTotal));
});
