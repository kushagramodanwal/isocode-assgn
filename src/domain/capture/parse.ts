/**
 * Rule-based extraction of order lines from a free-text message.
 * Used directly when no LLM is configured, and as the fallback when the LLM fails.
 * It only extracts (what words, how many, which unit). Matching words to SKUs is match.ts.
 */
import { normaliseText, sizeUnit, tokenise, type Size } from "./text";

export type Unit = "CASE" | "PIECE" | "UNKNOWN";

export type ExtractedLine = {
  raw: string; // the retailer's own words for this line, untouched
  qty: number | null;
  unit: Unit;
  words: string[]; // product words left after removing qty, unit and filler
  sizes: Size[];
};

const CASE_WORDS = new Set([
  "peti", "petti", "pethi", "case", "cases", "cs", "carton", "cartons", "cartoon", "ctn", "ctns",
  "पेटी", "पेटि", "केस", "कार्टन",
]);
// Pieces / packets: sold loose
const PIECE_WORDS = new Set([
  "pc", "pcs", "piece", "pieces", "pkt", "pkts", "packet", "packets", "packet.", "nag", "pack", "packs",
  "पैकेट", "पीस", "नग",
]);
// Words that might mean a case or a single pack. These are asked, never guessed.
const AMBIGUOUS_UNIT_WORDS = new Set(["dabba", "dabbe", "dibba", "box", "boxes", "डिब्बा", "डब्बा", "bundle"]);

const NUMBER_WORDS: Record<string, number> = {
  ek: 1, one: 1, एक: 1,
  do: 2, two: 2, दो: 2,
  teen: 3, tin: 3, three: 3, तीन: 3,
  char: 4, chaar: 4, four: 4, चार: 4,
  panch: 5, paanch: 5, five: 5, पांच: 5, पाँच: 5,
  chhe: 6, chah: 6, cheh: 6, six: 6, छह: 6, छः: 6,
  saat: 7, sat: 7, seven: 7, सात: 7,
  aath: 8, ath: 8, eight: 8, आठ: 8,
  nau: 9, nine: 9, नौ: 9,
  das: 10, dus: 10, ten: 10, दस: 10,
  gyarah: 11, eleven: 11, barah: 12, twelve: 12, pandrah: 15, fifteen: 15,
  bees: 20, twenty: 20, बीस: 20, pachees: 25, pachchis: 25, tees: 30, pachas: 50,
  aadha: 0.5, half: 0.5, adha: 0.5,
};

/** Polite words, verbs and connectors that never name a product. */
const FILLER = new Set([
  "bhaiya", "bhaia", "bhaiyya", "bhai", "ji", "sir", "please", "pls", "plz", "bhej", "bhejo", "bhejna",
  "bhejiye", "dena", "dedo", "dijiye", "de", "do", "kar", "karo", "kardo", "chahiye", "chaiye", "aur",
  "and", "or", "bhi", "ka", "ki", "ke", "wala", "wali", "wale", "vala", "vali", "waala", "ka.", "hai",
  "h", "me", "mein", "se", "ko", "order", "send", "need", "want", "add", "the", "of", "with", "also",
  "kal", "aaj", "subah", "shaam", "jaldi", "abhi", "thoda", "total", "hi", "namaste", "ram", "jai",
  "भैया", "भाई", "जी", "भेज", "देना", "दो", "और", "वाला", "वाली", "का", "की", "के", "चाहिए",
  "maal", "saman", "samaan", "x",
]);

/** Split a message into one chunk per product. */
export function splitLines(message: string): string[] {
  return message
    .normalize("NFC")
    .split(/\n|,|;|\+|&|\||(?:\s|^)(?:aur|and|और|phir|fir)(?=\s)|\.(?!\d)|।/iu)
    .map((s) => s.replace(/^\s*(?:\d{1,2}[).:-]|[-*•])\s+/, "").trim())
    .filter((s) => /[a-zऀ-ॿ]/iu.test(s));
}

function numberOf(token: string): number | null {
  if (/^\d+(?:\.\d+)?$/.test(token)) return Number(token);
  return NUMBER_WORDS[token] ?? null;
}

function unitOf(token: string): Unit | null {
  if (CASE_WORDS.has(token)) return "CASE";
  if (PIECE_WORDS.has(token)) return "PIECE";
  if (AMBIGUOUS_UNIT_WORDS.has(token)) return "UNKNOWN";
  return null;
}

/** Split glued tokens like "5peti", "1kg", "250gm", "2x". */
function explode(tokens: string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    const m = t.match(/^(\d+(?:\.\d+)?)([a-zऀ-ॿ]+)$/u) ?? t.match(/^([a-z]+)(\d+(?:\.\d+)?)$/u);
    if (m) out.push(m[1]!, m[2]!);
    else out.push(t);
  }
  return out;
}

export function parseLine(rawLine: string): ExtractedLine {
  const tokens = explode(tokenise(normaliseText(rawLine)));
  const used = new Array(tokens.length).fill(false);
  const sizes: Size[] = [];
  let qty: number | null = null;
  let unit: Unit = "UNKNOWN";
  let unitFound = false;

  // 1. number + size unit ("1 kilo", "250 gm") and number + "wala" ("250 wala") are pack sizes.
  for (let i = 0; i < tokens.length; i++) {
    const n = numberOf(tokens[i]!);
    if (n === null || !/^\d/.test(tokens[i]!)) continue;
    const next = tokens[i + 1];
    const su = next ? sizeUnit(next) : undefined;
    if (su) {
      sizes.push({ value: n * su.mult, unit: su.unit });
      used[i] = used[i + 1] = true;
    } else if (next && /^(wala|wali|wale|vala|vali|waala|वाला|वाली)$/u.test(next)) {
      sizes.push({ value: n, unit: null });
      used[i] = used[i + 1] = true;
    }
  }

  // 2. number + count unit ("5 peti") or count unit + number ("peti 5") is the quantity.
  for (let i = 0; i < tokens.length && !unitFound; i++) {
    if (used[i]) continue;
    const u = unitOf(tokens[i]!);
    if (!u) continue;
    const before = i > 0 && !used[i - 1] ? numberOf(tokens[i - 1]!) : null;
    const after = i + 1 < tokens.length && !used[i + 1] ? numberOf(tokens[i + 1]!) : null;
    if (before !== null) {
      qty = before;
      used[i - 1] = true;
    } else if (after !== null) {
      qty = after;
      used[i + 1] = true;
    }
    unit = u;
    unitFound = true;
    used[i] = true;
  }

  // 3. No unit word: a lone small number is the quantity, but the unit stays UNKNOWN (asked).
  //    "do" only counts as 2 here if nothing else gave us a number.
  if (qty === null) {
    for (let i = 0; i < tokens.length; i++) {
      if (used[i]) continue;
      const t = tokens[i]!;
      const n = numberOf(t);
      if (n === null || (t === "do" && i === tokens.length - 1)) continue;
      if (/^\d/.test(t) && n >= 50) {
        // Big bare numbers ("biscuit 75") are much more likely a pack size than 75 cases.
        sizes.push({ value: n, unit: null });
        used[i] = true;
        continue;
      }
      qty = n;
      used[i] = true;
      break;
    }
  }

  // 4. Anything numeric left over is a size hint ("chai 250 1 peti").
  const words: string[] = [];
  tokens.forEach((t, i) => {
    if (used[i]) return;
    const n = /^\d/.test(t) ? numberOf(t) : null;
    if (n !== null) {
      sizes.push({ value: n, unit: null });
      return;
    }
    if (FILLER.has(t) || NUMBER_WORDS[t] !== undefined || unitOf(t)) return;
    if (t.length < 2) return;
    words.push(t);
  });

  if (qty !== null && (!Number.isInteger(qty) || qty <= 0)) qty = null; // "aadha peti" → ask

  return { raw: rawLine.trim(), qty, unit, words, sizes };
}

export function parseMessage(message: string): ExtractedLine[] {
  return splitLines(message)
    .map(parseLine)
    .filter((l) => l.words.length > 0 || l.qty !== null);
}
