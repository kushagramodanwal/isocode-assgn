import { z } from 'zod';
import { applyBps } from './money';
import type {
  AppliedScheme,
  CartLineInput,
  LineError,
  Nudge,
  PriceCartInput,
  PricedCart,
  PricedLine,
  Scheme,
  Warning,
} from './types';

/** A nudge is shown when the gap to the next threshold is ≤ ceil(threshold × this). See A-18. */
export const NUDGE_MAX_FRACTION = 0.5;
export const MIN_QTY = 1;
export const MAX_QTY = 9999;

export const freeGoodsParams = z.object({ buy: z.number().int().min(1), get: z.number().int().min(1) }).strict();
export const slabParams = z
  .object({ minCases: z.number().int().min(1), discountBps: z.number().int().min(1).max(10000) })
  .strict();

function parseScheme(s: Scheme): AppliedScheme | null {
  const parsed = s.type === 'FREE_GOODS' ? freeGoodsParams.safeParse(s.params) : slabParams.safeParse(s.params);
  if (!parsed.success) return null;
  return { id: s.id, type: s.type, params: parsed.data, labelEn: s.labelEn, labelHi: s.labelHi };
}

/** Pick the single applicable scheme per SKU (A-05): valid at `at`, matching segment, latest validFrom wins. */
export function activeSchemesBySku(
  schemes: Scheme[],
  at: Date,
  segment: string | null | undefined,
): Map<string, AppliedScheme> {
  const t = at.getTime();
  const candidates = schemes
    .filter((s) => s.validFrom.getTime() <= t && t <= s.validTo.getTime())
    .filter((s) => !s.segment || s.segment === segment)
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime() || a.id.localeCompare(b.id));
  const out = new Map<string, AppliedScheme>();
  for (const s of candidates) {
    if (out.has(s.skuId)) continue;
    const parsed = parseScheme(s);
    if (parsed) out.set(s.skuId, parsed);
  }
  return out;
}

const maxGap = (threshold: number) => Math.ceil(threshold * NUDGE_MAX_FRACTION);

function mergeLines(lines: CartLineInput[]): CartLineInput[] {
  const order: string[] = [];
  const qty = new Map<string, number>();
  for (const l of lines) {
    if (!qty.has(l.skuId)) order.push(l.skuId);
    qty.set(l.skuId, (qty.get(l.skuId) ?? 0) + l.qtyCases);
  }
  return order.map((skuId) => ({ skuId, qtyCases: qty.get(skuId)! }));
}

export function priceCart(input: PriceCartInput): PricedCart {
  const { skus, prices, at, retailer } = input;
  const schemeBySku = activeSchemesBySku(input.schemes, at, retailer.segment);
  const warnings: Warning[] = [];
  const nudges: Nudge[] = [];
  const freeGoods: PricedCart['freeGoods'] = [];

  const lines: PricedLine[] = mergeLines(input.lines).map(({ skuId, qtyCases }) => {
    const sku = skus[skuId];
    const unitPricePaise = prices[skuId];
    const errors: LineError[] = [];
    const scheme = schemeBySku.get(skuId) ?? null;

    const empty = (): PricedLine => ({
      skuId, qtyCases, unitPricePaise: unitPricePaise ?? 0, unitsPerCase: sku?.unitsPerCase ?? 0, casePricePaise: 0,
      grossPaise: 0, discountPaise: 0, taxablePaise: 0, gstRateBps: sku?.gstRateBps ?? 0, gstPaise: 0,
      lineTotalPaise: 0, freeCases: 0, activeScheme: scheme, appliedScheme: null, errors, included: false,
    });

    if (!sku) return (errors.push({ code: 'UNKNOWN_SKU' }), empty());
    if (unitPricePaise === undefined || !Number.isSafeInteger(unitPricePaise) || unitPricePaise < 0) {
      return (errors.push({ code: 'NO_PRICE' }), empty());
    }
    if (!Number.isInteger(qtyCases) || qtyCases < MIN_QTY || qtyCases > MAX_QTY) {
      return (errors.push({ code: 'INVALID_QTY' }), empty());
    }

    const casePricePaise = unitPricePaise * sku.unitsPerCase;
    const grossPaise = casePricePaise * qtyCases;
    let discountPaise = 0;
    let freeCases = 0;
    let appliedScheme: AppliedScheme | null = null;

    if (qtyCases > sku.stockCases) {
      const alternatives = Object.values(skus)
        .filter((s) => s.id !== skuId && s.productId && s.productId === sku.productId && s.stockCases >= qtyCases)
        .map((s) => s.id)
        .sort();
      errors.push({ code: 'INSUFFICIENT_STOCK', available: Math.max(0, sku.stockCases), alternatives });
    } else if (scheme) {
      if (scheme.type === 'FREE_GOODS') {
        const { buy, get } = scheme.params as { buy: number; get: number };
        const wanted = Math.floor(qtyCases / buy) * get;
        const left = sku.stockCases - qtyCases; // A-06: free goods consume stock left after paid qty
        freeCases = Math.min(wanted, left);
        if (wanted > 0) appliedScheme = scheme;
        if (freeCases < wanted) warnings.push({ code: 'FREE_GOODS_CAPPED', skuId, wanted, given: freeCases });
        if (freeCases > 0) freeGoods.push({ skuId, freeCases, schemeId: scheme.id });
        const next = (Math.floor(qtyCases / buy) + 1) * buy;
        const add = next - qtyCases;
        if (add <= maxGap(buy) && next + get <= sku.stockCases) {
          nudges.push({ skuId, type: 'ADD_FOR_FREE', addCases: add, freeCases: get, schemeId: scheme.id });
        }
      } else {
        const { minCases, discountBps } = scheme.params as { minCases: number; discountBps: number };
        if (qtyCases >= minCases) {
          discountPaise = applyBps(grossPaise, discountBps);
          appliedScheme = scheme;
        } else {
          const add = minCases - qtyCases;
          if (add <= maxGap(minCases) && minCases <= sku.stockCases) {
            nudges.push({ skuId, type: 'ADD_FOR_DISCOUNT', addCases: add, discountBps, schemeId: scheme.id });
          }
        }
      }
    }

    const taxablePaise = grossPaise - discountPaise;
    const gstPaise = applyBps(taxablePaise, sku.gstRateBps);
    return {
      skuId, qtyCases, unitPricePaise, unitsPerCase: sku.unitsPerCase, casePricePaise, grossPaise, discountPaise,
      taxablePaise, gstRateBps: sku.gstRateBps, gstPaise, lineTotalPaise: taxablePaise + gstPaise, freeCases,
      activeScheme: scheme, appliedScheme, errors, included: errors.length === 0,
    };
  });

  const inc = lines.filter((l) => l.included);
  const sum = (f: (l: PricedLine) => number) => inc.reduce((s, l) => s + f(l), 0);
  const totals = {
    grossPaise: sum((l) => l.grossPaise),
    discountPaise: sum((l) => l.discountPaise),
    taxablePaise: sum((l) => l.taxablePaise),
    gstPaise: sum((l) => l.gstPaise),
    totalPaise: sum((l) => l.lineTotalPaise),
    paidCases: sum((l) => l.qtyCases),
    freeCases: sum((l) => l.freeCases),
  };

  return {
    lines,
    freeGoods,
    nudges,
    warnings,
    totals,
    creditStatus: totals.totalPaise > retailer.availableCreditPaise ? 'WILL_HOLD' : 'OK',
    availableCreditPaise: retailer.availableCreditPaise,
    blocked: lines.some((l) => !l.included),
  };
}
