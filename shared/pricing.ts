/**
 * Scheme and pricing engine. Pure: no database, no clock, no I/O.
 * The same code prices the cart on the phone and re-prices the order on the server,
 * so what the retailer sees is what the desk exports.
 *
 * Money is integer paise. Quantities are whole cases.
 */

export type Slab = { minCases: number; percentBp: number };

export type SchemeRule =
  | {
      id: string;
      type: "FREE_GOODS";
      buyCases: number;
      freeCases: number;
      validFrom: Date;
      validTo: Date;
    }
  | {
      id: string;
      type: "SLAB_DISCOUNT";
      slabs: Slab[];
      validFrom: Date;
      validTo: Date;
    };

export type PricedProduct = {
  id: string;
  unitPricePaise: number; // retailer's own price per pack, ex-GST
  unitsPerCase: number;
  gstRateBp: number;
  stockCases: number;
  schemes: SchemeRule[];
};

export type LineIssue =
  | "INVALID_QTY" // blocks
  | "OUT_OF_STOCK" // blocks
  | "INSUFFICIENT_STOCK" // blocks: more cases asked than in stock
  | "FREE_GOODS_SHORT"; // warning: scheme earned more free cases than stock left

export const BLOCKING_ISSUES: ReadonlySet<LineIssue> = new Set([
  "INVALID_QTY",
  "OUT_OF_STOCK",
  "INSUFFICIENT_STOCK",
]);

export type Nudge =
  | { kind: "FREE_GOODS"; addCases: number; freeCases: number }
  | { kind: "SLAB_DISCOUNT"; addCases: number; percentBp: number };

export type AppliedScheme =
  | { id: string; type: "FREE_GOODS"; buyCases: number; freeCases: number }
  | { id: string; type: "SLAB_DISCOUNT"; minCases: number; percentBp: number };

export type LineQuote = {
  productId: string;
  cases: number;
  freeCases: number;
  freeCasesEarned: number; // before the stock cap
  casePricePaise: number;
  grossPaise: number;
  discountPaise: number;
  taxablePaise: number;
  gstRateBp: number;
  gstPaise: number;
  totalPaise: number;
  scheme: AppliedScheme | null;
  nudge: Nudge | null;
  issues: LineIssue[];
  blocked: boolean;
};

export type CartTotals = {
  grossPaise: number;
  discountPaise: number;
  taxablePaise: number;
  gstPaise: number;
  totalPaise: number;
  paidCases: number;
  freeCases: number;
  freeGoodsValuePaise: number;
};

export type CartQuote = { lines: LineQuote[]; totals: CartTotals; blocked: boolean };

export const MAX_CASES_PER_LINE = 999;

/** Nudge only when the next reward is within half the threshold (rounded up). */
export const NUDGE_FRACTION = 0.5;

/** Integer division of a*b by 10_000, rounded half up. Inputs are non-negative. */
export function applyBp(amountPaise: number, bp: number): number {
  return Math.floor((amountPaise * bp + 5_000) / 10_000);
}

export function isSchemeLive(s: SchemeRule, now: Date): boolean {
  return s.validFrom.getTime() <= now.getTime() && now.getTime() <= s.validTo.getTime();
}

function slabFor(slabs: Slab[], cases: number): Slab | null {
  let best: Slab | null = null;
  for (const s of slabs) {
    if (cases >= s.minCases && (!best || s.minCases > best.minCases)) best = s;
  }
  return best;
}

function nextSlab(slabs: Slab[], cases: number): Slab | null {
  let next: Slab | null = null;
  for (const s of slabs) {
    if (s.minCases > cases && (!next || s.minCases < next.minCases)) next = s;
  }
  return next;
}

/** Benefit of a scheme at this quantity, in paise, so competing schemes can be compared. */
function benefitPaise(s: SchemeRule, cases: number, casePricePaise: number): number {
  if (s.type === "FREE_GOODS") {
    return Math.floor(cases / s.buyCases) * s.freeCases * casePricePaise;
  }
  const slab = slabFor(s.slabs, cases);
  return slab ? applyBp(cases * casePricePaise, slab.percentBp) : 0;
}

/**
 * One scheme per line, never stacked. If several are live, the retailer gets the one worth
 * most at this quantity; ties go to the lowest id so the result is deterministic.
 */
export function pickScheme(
  schemes: SchemeRule[],
  cases: number,
  casePricePaise: number,
  now: Date,
): SchemeRule | null {
  const live = schemes
    .filter((s) => isSchemeLive(s, now) && isWellFormed(s))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let best: SchemeRule | null = null;
  let bestValue = -1;
  for (const s of live) {
    const v = benefitPaise(s, cases, casePricePaise);
    if (v > bestValue) {
      best = s;
      bestValue = v;
    }
  }
  return best;
}

function isWellFormed(s: SchemeRule): boolean {
  if (s.type === "FREE_GOODS") {
    return Number.isInteger(s.buyCases) && s.buyCases > 0 && Number.isInteger(s.freeCases) && s.freeCases > 0;
  }
  return (
    s.slabs.length > 0 &&
    s.slabs.every(
      (x) => Number.isInteger(x.minCases) && x.minCases > 0 && x.percentBp > 0 && x.percentBp < 10_000,
    )
  );
}

function nudgeFor(
  schemes: SchemeRule[],
  cases: number,
  stockCases: number,
  now: Date,
): Nudge | null {
  let best: Nudge | null = null;
  for (const s of schemes) {
    if (!isSchemeLive(s, now) || !isWellFormed(s)) continue;
    let candidate: Nudge | null = null;
    let threshold = 0;
    if (s.type === "FREE_GOODS") {
      const add = s.buyCases - (cases % s.buyCases);
      threshold = s.buyCases;
      candidate = { kind: "FREE_GOODS", addCases: add, freeCases: s.freeCases };
    } else {
      const next = nextSlab(s.slabs, cases);
      if (!next) continue;
      threshold = next.minCases;
      candidate = { kind: "SLAB_DISCOUNT", addCases: next.minCases - cases, percentBp: next.percentBp };
    }
    if (candidate.addCases > Math.ceil(threshold * NUDGE_FRACTION)) continue;
    const extraFree = candidate.kind === "FREE_GOODS" ? candidate.freeCases : 0;
    if (cases + candidate.addCases + extraFree > stockCases) continue; // can't deliver it, don't tempt
    if (!best || candidate.addCases < best.addCases) best = candidate;
  }
  return best;
}

export function priceLine(product: PricedProduct, cases: number, now: Date): LineQuote {
  const casePricePaise = product.unitPricePaise * product.unitsPerCase;
  const issues: LineIssue[] = [];

  if (!Number.isInteger(cases) || cases < 1 || cases > MAX_CASES_PER_LINE) issues.push("INVALID_QTY");
  else if (product.stockCases <= 0) issues.push("OUT_OF_STOCK");
  else if (cases > product.stockCases) issues.push("INSUFFICIENT_STOCK");

  const qty = issues.includes("INVALID_QTY") ? 0 : cases;
  const grossPaise = qty * casePricePaise;
  const scheme = qty > 0 ? pickScheme(product.schemes, qty, casePricePaise, now) : null;

  let discountPaise = 0;
  let freeCasesEarned = 0;
  let applied: AppliedScheme | null = null;

  if (scheme?.type === "FREE_GOODS") {
    freeCasesEarned = Math.floor(qty / scheme.buyCases) * scheme.freeCases;
    if (freeCasesEarned > 0) {
      applied = { id: scheme.id, type: "FREE_GOODS", buyCases: scheme.buyCases, freeCases: scheme.freeCases };
    }
  } else if (scheme?.type === "SLAB_DISCOUNT") {
    const slab = slabFor(scheme.slabs, qty);
    if (slab) {
      discountPaise = applyBp(grossPaise, slab.percentBp);
      applied = { id: scheme.id, type: "SLAB_DISCOUNT", minCases: slab.minCases, percentBp: slab.percentBp };
    }
  }

  // Free goods come out of the same stock. Give what is left and say so.
  const stockAfterPaid = Math.max(0, product.stockCases - qty);
  const freeCases = Math.min(freeCasesEarned, stockAfterPaid);
  if (freeCases < freeCasesEarned && !issues.some((i) => BLOCKING_ISSUES.has(i))) {
    issues.push("FREE_GOODS_SHORT");
  }

  const taxablePaise = grossPaise - discountPaise;
  const gstPaise = applyBp(taxablePaise, product.gstRateBp);
  const blocked = issues.some((i) => BLOCKING_ISSUES.has(i));

  return {
    productId: product.id,
    cases: qty,
    freeCases: blocked ? 0 : freeCases,
    freeCasesEarned,
    casePricePaise,
    grossPaise,
    discountPaise,
    taxablePaise,
    gstRateBp: product.gstRateBp,
    gstPaise,
    totalPaise: taxablePaise + gstPaise,
    scheme: applied,
    nudge: blocked || qty === 0 ? null : nudgeFor(product.schemes, qty, product.stockCases, now),
    issues,
    blocked,
  };
}

/** Lines that are blocked are still priced for display but left out of the totals. */
export function priceCart(
  items: { productId: string; cases: number }[],
  products: Map<string, PricedProduct>,
  now: Date,
): CartQuote {
  const lines: LineQuote[] = [];
  const totals: CartTotals = {
    grossPaise: 0,
    discountPaise: 0,
    taxablePaise: 0,
    gstPaise: 0,
    totalPaise: 0,
    paidCases: 0,
    freeCases: 0,
    freeGoodsValuePaise: 0,
  };
  // Merge duplicate product lines so a scheme can't be split to dodge or double a threshold.
  const merged = new Map<string, number>();
  for (const it of items) merged.set(it.productId, (merged.get(it.productId) ?? 0) + it.cases);

  for (const [productId, cases] of merged) {
    const product = products.get(productId);
    if (!product) continue;
    const q = priceLine(product, cases, now);
    lines.push(q);
    if (q.blocked) continue;
    totals.grossPaise += q.grossPaise;
    totals.discountPaise += q.discountPaise;
    totals.taxablePaise += q.taxablePaise;
    totals.gstPaise += q.gstPaise;
    totals.totalPaise += q.totalPaise;
    totals.paidCases += q.cases;
    totals.freeCases += q.freeCases;
    totals.freeGoodsValuePaise += q.freeCases * q.casePricePaise;
  }
  return { lines, totals, blocked: lines.some((l) => l.blocked) || lines.length === 0 };
}

export type CreditCheck = {
  availablePaise: number;
  exceedsByPaise: number; // 0 when within limit
  withinLimit: boolean;
};

/**
 * Available credit = limit − outstanding (from Tally) − orders already accepted since that
 * outstanding figure was taken. Without the last term, several small orders could each pass.
 */
export function checkCredit(input: {
  creditLimitPaise: number;
  outstandingPaise: number;
  openOrdersPaise: number;
  orderTotalPaise: number;
}): CreditCheck {
  const available = input.creditLimitPaise - input.outstandingPaise - input.openOrdersPaise;
  const exceedsBy = Math.max(0, input.orderTotalPaise - Math.max(0, available));
  return { availablePaise: available, exceedsByPaise: exceedsBy, withinLimit: exceedsBy === 0 };
}

export function schemeLabelEn(s: AppliedScheme | SchemeRule): string {
  if (s.type === "FREE_GOODS") return `Buy ${s.buyCases} get ${s.freeCases} free`;
  if ("percentBp" in s) return `${s.percentBp / 100}% off on ${s.minCases}+ cases`;
  return s.slabs
    .slice()
    .sort((a, b) => a.minCases - b.minCases)
    .map((x) => `${x.percentBp / 100}% off on ${x.minCases}+ cases`)
    .join(", ");
}
