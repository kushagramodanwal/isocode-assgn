/**
 * Map a retailer's words for one line to a SKU. Pure and explainable:
 * every score comes from word overlap, pack size, the retailer's own aliases and their order history.
 */
import { sizeMatches, tokenSimilarity, tokenise, normaliseText, type Size } from "./text";

export type CatalogueEntry = {
  id: string;
  name: string;
  nameHi: string;
  brand: string;
  packLabel: string;
  keywords: string[];
  category?: string;
};

export type MatchContext = {
  catalogue: CatalogueEntry[];
  /** phrase → productId, learned from this retailer's corrected orders */
  aliases: Map<string, string>;
  /** productId → number of past orders containing it, for this retailer */
  history: Map<string, number>;
};

export type Candidate = { productId: string; score: number };

export type ConfidenceLevel = "high" | "medium" | "low";

export type MatchResult = {
  phrase: string;
  productId: string | null;
  confidence: number; // 0..100
  level: ConfidenceLevel;
  matchedBy: "alias" | "catalogue" | "history" | "none";
  alternatives: Candidate[]; // the next two best SKUs
};

/** Below this the line is left unmatched rather than guessed. */
export const MIN_MATCH_SCORE = 35;
/** A lead smaller than this over the runner-up lowers confidence. */
export const CLEAR_MARGIN = 15;

export function confidenceLevel(c: number): ConfidenceLevel {
  return c >= 80 ? "high" : c >= 55 ? "medium" : "low";
}

export function phraseKey(words: string[], sizes: Size[]): string {
  const sizeText = sizes.map((s) => (s.unit ? `${s.value}${s.unit}` : String(s.value)));
  return [...words, ...sizeText].join(" ").trim();
}

type Vocab = { tokens: string[]; phrases: string[][] };

const vocabCache = new WeakMap<CatalogueEntry, Vocab>();

function vocabOf(p: CatalogueEntry): Vocab {
  const cached = vocabCache.get(p);
  if (cached) return cached;
  const sources = [p.name, p.nameHi, p.brand, ...p.keywords];
  const phrases = sources.map((s) => tokenise(normaliseText(s)).filter((t) => !/^\d/.test(t)));
  const tokens = [...new Set(phrases.flat())];
  const v = { tokens, phrases: phrases.filter((ph) => ph.length > 1) };
  vocabCache.set(p, v);
  return v;
}

export function scoreProduct(
  words: string[],
  sizes: Size[],
  p: CatalogueEntry,
  historyCount: number,
): number {
  const v = vocabOf(p);
  let coverage = 0;
  if (words.length) {
    let sum = 0;
    for (const w of words) {
      let best = 0;
      for (const t of v.tokens) best = Math.max(best, tokenSimilarity(w, t));
      sum += best;
    }
    coverage = sum / words.length;
  }

  // A multi-word keyword appearing intact ("washing powder", "chai patti") is strong evidence.
  const joined = ` ${words.join(" ")} `;
  const phraseBonus = v.phrases.some((ph) => joined.includes(` ${ph.join(" ")} `)) ? 0.1 : 0;

  let sizeAdj = 0;
  if (sizes.length) sizeAdj = sizes.some((s) => sizeMatches(s, p.packLabel)) ? 0.2 : -0.25;

  const historyBoost = 0.08 * Math.min(1, historyCount / 3);
  const raw = 0.85 * coverage + phraseBonus + sizeAdj + (coverage > 0 ? historyBoost : 0);
  return Math.round(100 * Math.max(0, Math.min(1, raw)));
}

export function matchLine(words: string[], sizes: Size[], ctx: MatchContext): MatchResult {
  const phrase = phraseKey(words, sizes);
  const ranked: Candidate[] = ctx.catalogue
    .map((p) => ({ productId: p.id, score: scoreProduct(words, sizes, p, ctx.history.get(p.id) ?? 0) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || (a.productId < b.productId ? -1 : 1));

  const aliasId = phrase ? ctx.aliases.get(phrase) : undefined;
  if (aliasId && ctx.catalogue.some((p) => p.id === aliasId)) {
    return {
      phrase,
      productId: aliasId,
      confidence: 97,
      level: "high",
      matchedBy: "alias",
      alternatives: ranked.filter((c) => c.productId !== aliasId).slice(0, 2),
    };
  }

  const top = ranked[0];
  if (!top || top.score < MIN_MATCH_SCORE) {
    return { phrase, productId: null, confidence: top?.score ?? 0, level: "low", matchedBy: "none", alternatives: ranked.slice(0, 2) };
  }

  const margin = top.score - (ranked[1]?.score ?? 0);
  const topCategory = ctx.catalogue.find((p) => p.id === top.productId)?.category;
  const confidence = Math.max(0, Math.round(top.score - Math.max(0, CLEAR_MARGIN - margin) * 1.5));
  const withoutHistory = scoreProduct(words, sizes, ctx.catalogue.find((p) => p.id === top.productId)!, 0);
  const historyDecided = (ctx.history.get(top.productId) ?? 0) > 0 && ranked[1] !== undefined && withoutHistory <= ranked[1].score;

  return {
    phrase,
    productId: top.productId,
    confidence,
    level: confidenceLevel(confidence),
    matchedBy: historyDecided ? "history" : "catalogue",
    alternatives: pickAlternatives(ranked.slice(1), top.productId, topCategory, ctx),
  };
}

/**
 * The next two guesses. Same-category products are preferred: if the best match is a biscuit,
 * a biscuit the retailer didn't mean is a better second guess than a detergent that shares a word.
 * If fewer than two products share any words, the shop's most-ordered products in that category
 * fill the gap (score 0, so the screen never presents them as word matches).
 */
function pickAlternatives(rest: Candidate[], topId: string, category: string | undefined, ctx: MatchContext): Candidate[] {
  const cat = new Map(ctx.catalogue.map((p) => [p.id, p.category]));
  const bonus = (c: Candidate) => (category && cat.get(c.productId) === category ? 15 : 0);
  const picked = [...rest].sort((a, b) => b.score + bonus(b) - (a.score + bonus(a))).slice(0, 2);
  if (picked.length >= 2 || !category) return picked;
  const used = new Set([topId, ...picked.map((c) => c.productId)]);
  const fillers = ctx.catalogue
    .filter((p) => p.category === category && !used.has(p.id))
    .sort((a, b) => (ctx.history.get(b.id) ?? 0) - (ctx.history.get(a.id) ?? 0) || (a.id < b.id ? -1 : 1))
    .map((p) => ({ productId: p.id, score: 0 }));
  return [...picked, ...fillers].slice(0, 2);
}
