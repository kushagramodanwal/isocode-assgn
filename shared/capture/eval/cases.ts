/**
 * Labelled evaluation set for message capture. Written the way kirana owners actually type:
 * no commas, Hinglish, Devanagari, typos, brand slang, missing units, look-alike products.
 * Labels are what a careful desk clerk would decide from the words and the shop's history.
 *
 * - anchor: a substring of the message that identifies the line (used to align predictions).
 * - sku: the right SKU, or null when no product in the catalogue fits.
 * - ambiguous: the words alone don't decide it; a reader must not show it as "Sure" unless it
 *   picks the expected (history-backed) SKU.
 */
export type ExpectedLine = { anchor: string; sku: string | null; qty: number | null; unit: "CASE" | "PIECE" | "UNKNOWN"; ambiguous?: boolean };
export type EvalCase = { id: string; message: string; lines: ExpectedLine[] };

/** A typical shop's past orders (SKU → number of orders), used for history-based tie-breaks. */
export const TYPICAL_HISTORY: Record<string, number> = {
  "SKU-BS-075": 8, "SKU-DT-1KG": 6, "SKU-SL-1KG": 6, "SKU-TE-250": 5, "SKU-SP-100": 5, "SKU-CB-100": 4,
  "SKU-ND-070": 4, "SKU-NK-200": 3, "SKU-HW-200": 2, "SKU-KT-500": 2,
};

const C = "CASE" as const, P = "PIECE" as const, U = "UNKNOWN" as const;

export const EVAL_CASES: EvalCase[] = [
  { id: "brief", message: "bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti", lines: [
    { anchor: "biscuit chhota", sku: "SKU-BS-075", qty: 5, unit: C, ambiguous: true },
    { anchor: "washing powder", sku: "SKU-DT-1KG", qty: 2, unit: C },
    { anchor: "chai patti", sku: "SKU-TE-250", qty: 1, unit: C },
  ] },
  { id: "milk-elaichi", message: "5 peti doodh biscuit, 2 peti cream biscuit elaichi wala", lines: [
    { anchor: "doodh", sku: "SKU-MB-075", qty: 5, unit: C },
    { anchor: "elaichi", sku: "SKU-EB-100", qty: 2, unit: C },
  ] },
  { id: "tea-vs-dust", message: "chai patti 1 kilo 2 peti aur chai dust 1 kg 1 peti", lines: [
    { anchor: "chai patti", sku: "SKU-TE-1KG", qty: 2, unit: C },
    { anchor: "dust", sku: "SKU-TD-1KG", qty: 1, unit: C },
  ] },
  { id: "salts", message: "sendha namak 3 peti, namak 10 peti", lines: [
    { anchor: "sendha", sku: "SKU-SL-RCK", qty: 3, unit: C },
    { anchor: "namak 10", sku: "SKU-SL-1KG", qty: 10, unit: C, ambiguous: true },
  ] },
  { id: "surf-2kg", message: "surf 2 kilo wala 4 peti", lines: [{ anchor: "surf", sku: "SKU-DT-2KG", qty: 4, unit: C }] },
  { id: "washing-liquid", message: "washing liquid 1 litre 2 peti", lines: [{ anchor: "washing liquid", sku: "SKU-DT-LQ1", qty: 2, unit: C }] },
  { id: "dishwash-pair", message: "bartan wala liquid 500 ml 3 peti, vim bar bada 2 peti", lines: [
    { anchor: "liquid", sku: "SKU-DL-500", qty: 3, unit: C },
    { anchor: "vim", sku: "SKU-DW-500", qty: 2, unit: C },
  ] },
  { id: "spices-no-commas", message: "lal mirch 5 peti dhania 3 peti haldi 200 gm 2 peti", lines: [
    { anchor: "mirch", sku: "SKU-MC-100", qty: 5, unit: C },
    { anchor: "dhania", sku: "SKU-DH-100", qty: 3, unit: C },
    { anchor: "haldi", sku: "SKU-HL-200", qty: 2, unit: C },
  ] },
  { id: "soaps", message: "neem sabun bada 2 peti, nimbu sabun 3 peti", lines: [
    { anchor: "neem", sku: "SKU-SP-150", qty: 2, unit: C },
    { anchor: "nimbu", sku: "SKU-SP-LIM", qty: 3, unit: C },
  ] },
  { id: "just-sabun", message: "sabun 5 peti", lines: [{ anchor: "sabun", sku: "SKU-SP-100", qty: 5, unit: C, ambiguous: true }] },
  { id: "devanagari-namkeen", message: "दो पेटी आलू भुजिया बड़ा, एक पेटी मिक्सचर", lines: [
    { anchor: "भुजिया", sku: "SKU-NK-400", qty: 2, unit: C },
    { anchor: "मिक्सचर", sku: "SKU-NK-MIX", qty: 1, unit: C },
  ] },
  { id: "noodle-slang", message: "nudals 4 pack wala 2 peti, maggi chhota 5 peti", lines: [
    { anchor: "nudals", sku: "SKU-ND-280", qty: 2, unit: C },
    { anchor: "maggi", sku: "SKU-ND-070", qty: 5, unit: C },
  ] },
  { id: "ketchups", message: "ketchup bada 1 peti, sauce 500 gm 2 peti", lines: [
    { anchor: "ketchup", sku: "SKU-KT-1KG", qty: 1, unit: C },
    { anchor: "sauce", sku: "SKU-KT-500", qty: 2, unit: C },
  ] },
  { id: "cleaners", message: "phenyl chhota 4 peti, handwash refill 2 peti, handwash 3 peti", lines: [
    { anchor: "phenyl", sku: "SKU-FC-500", qty: 4, unit: C },
    { anchor: "refill", sku: "SKU-HW-750", qty: 2, unit: C },
    { anchor: "handwash 3", sku: "SKU-HW-200", qty: 3, unit: C, ambiguous: true },
  ] },
  { id: "choco-50", message: "choco cream biscuit 50 gm 6 peti", lines: [{ anchor: "choco", sku: "SKU-CB-050", qty: 6, unit: C }] },
  { id: "pieces", message: "haldi 100 gm 50 packet", lines: [{ anchor: "haldi", sku: "SKU-HL-100", qty: 50, unit: P }] },
  { id: "no-unit", message: "detergent 1 kg 10", lines: [{ anchor: "detergent", sku: "SKU-DT-1KG", qty: 10, unit: U }] },
  { id: "dabba", message: "tea 500 3 dabba", lines: [{ anchor: "tea", sku: "SKU-TE-500", qty: 3, unit: U }] },
  { id: "unknown-product", message: "poha 2 peti, rocket 1 peti", lines: [
    { anchor: "poha", sku: "SKU-PH-500", qty: 2, unit: C },
    { anchor: "rocket", sku: null, qty: 1, unit: C },
  ] },
  { id: "english", message: "Please send 4 cases glucose biscuit 400g and 2 cases milk biscuits", lines: [
    { anchor: "glucose", sku: "SKU-BS-400", qty: 4, unit: C },
    { anchor: "milk", sku: "SKU-MB-075", qty: 2, unit: C },
  ] },
  { id: "typo-200", message: "biskut 200 wala 3 peti", lines: [{ anchor: "biskut", sku: "SKU-BS-200", qty: 3, unit: C }] },
  { id: "tikiya", message: "tikiya sabun 250 2 peti", lines: [{ anchor: "tikiya", sku: "SKU-DB-250", qty: 2, unit: C }] },
  { id: "toilet-floor", message: "toilet cleaner 2 peti, floor cleaner 1 litre 1 peti", lines: [
    { anchor: "toilet", sku: "SKU-TC-500", qty: 2, unit: C },
    { anchor: "floor", sku: "SKU-FC-1L", qty: 1, unit: C },
  ] },
  { id: "hindi-tea", message: "चाय पत्ती 500 ग्राम 2 पेटी", lines: [{ anchor: "चाय", sku: "SKU-TE-500", qty: 2, unit: C }] },
  { id: "noodles-70", message: "noodles 70 gm 10 peti", lines: [{ anchor: "noodles", sku: "SKU-ND-070", qty: 10, unit: C }] },
  { id: "cream-generic", message: "cream biscuit 3 peti", lines: [{ anchor: "cream", sku: "SKU-CB-100", qty: 3, unit: C, ambiguous: true }] },
  { id: "namkeen-pair", message: "mixture 2 peti aur bhujia 2 peti", lines: [
    { anchor: "mixture", sku: "SKU-NK-MIX", qty: 2, unit: C },
    { anchor: "bhujia", sku: "SKU-NK-200", qty: 2, unit: C, ambiguous: true },
  ] },
  { id: "salt-generic", message: "salt 5 case", lines: [{ anchor: "salt", sku: "SKU-SL-1KG", qty: 5, unit: C, ambiguous: true }] },
  { id: "dishbar-200", message: "dishwash bar 200g 6 peti", lines: [{ anchor: "dishwash", sku: "SKU-DW-200", qty: 6, unit: C }] },
  { id: "bars", message: "detergent bar 150 gm 10 peti, bartan sabun 500 gm 2 peti", lines: [
    { anchor: "detergent bar", sku: "SKU-DB-150", qty: 10, unit: C },
    { anchor: "bartan", sku: "SKU-DW-500", qty: 2, unit: C },
  ] },
];
