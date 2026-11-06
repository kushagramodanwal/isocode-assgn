/** Text helpers for Hinglish / Hindi / English order messages. Pure. */

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

export function normaliseText(input: string): string {
  let s = input.normalize("NFC").toLowerCase();
  s = s.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
  s = s.replace(/[“”"'`’]/g, " ");
  return s;
}

export function tokenise(s: string): string[] {
  // Keep Latin letters, digits, Devanagari (incl. matras) and dots within numbers.
  return s
    .replace(/(\d)\s*[x×*]\s*(?=\d|$|\s)/g, "$1 ")
    .split(/[^a-z0-9ऀ-ॿ.]+/u)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** Collapse spelling variants common in typed Hinglish: biskut / biscuit, petti / peti. */
export function phonetic(t: string): string {
  return t
    .replace(/ph/g, "f")
    .replace(/sh/g, "s")
    .replace(/(ck|q|c)/g, "k")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/ee|ii/g, "i")
    .replace(/oo|uu/g, "u")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/(?<=.)[aeiouy]+/g, "");
}

/** 0..1 similarity between two single tokens. */
export function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length >= 3 && b.length >= 3) {
    if (phonetic(a) === phonetic(b)) return 0.92;
    if (b.startsWith(a) || a.startsWith(b)) {
      const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
      return 0.6 + 0.3 * ratio;
    }
  }
  const longest = Math.max(a.length, b.length);
  if (longest < 4) return 0;
  const sim = 1 - levenshtein(a, b) / longest;
  return sim >= 0.7 ? sim * 0.9 : 0;
}

export type Size = { value: number; unit: "g" | "ml" | null };

const SIZE_UNITS: Record<string, { mult: number; unit: "g" | "ml" }> = {
  g: { mult: 1, unit: "g" },
  gm: { mult: 1, unit: "g" },
  gms: { mult: 1, unit: "g" },
  gram: { mult: 1, unit: "g" },
  grams: { mult: 1, unit: "g" },
  ग्राम: { mult: 1, unit: "g" },
  kg: { mult: 1000, unit: "g" },
  kgs: { mult: 1000, unit: "g" },
  kilo: { mult: 1000, unit: "g" },
  किलो: { mult: 1000, unit: "g" },
  ml: { mult: 1, unit: "ml" },
  l: { mult: 1000, unit: "ml" },
  ltr: { mult: 1000, unit: "ml" },
  litre: { mult: 1000, unit: "ml" },
  liter: { mult: 1000, unit: "ml" },
  लीटर: { mult: 1000, unit: "ml" },
};

export function sizeUnit(token: string) {
  return SIZE_UNITS[token];
}

/** Parse a catalogue pack label such as "75 g" or "1 kg" into base units. */
export function parsePackLabel(label: string): { value: number; base: number; unit: "g" | "ml" } | null {
  const m = normaliseText(label).match(/(\d+(?:\.\d+)?)\s*([a-z]+)/);
  if (!m) return null;
  const u = SIZE_UNITS[m[2]!];
  if (!u) return null;
  const value = Number(m[1]);
  return { value, base: value * u.mult, unit: u.unit };
}

/** Does a size the retailer wrote match a catalogue pack label? */
export function sizeMatches(size: Size, packLabel: string): boolean {
  const pack = parsePackLabel(packLabel);
  if (!pack) return false;
  if (size.unit === null) return size.value === pack.value || size.value === pack.base;
  return size.unit === pack.unit && size.value === pack.base;
}
