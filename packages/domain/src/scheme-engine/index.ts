import { calculateBpsDiscount } from '../money.js';
import {
  CartLineInput,
  SchemeEngineInput,
  SchemeEngineOutput,
  SchemeLineResult,
  SchemeRule,
  SchemeType,
} from './types.js';

export * from './types.js';

/**
 * Pure function: calculates schemes (Buy N Get M, and Slab Discounts) on cart lines.
 * Evaluates best scheme for retailer (no stacking per A3).
 * Zero I/O, no database, no internal clock.
 */
export function calculateSchemes(input: SchemeEngineInput): SchemeEngineOutput {
  const { orderDate, retailerId, lines, schemes } = input;

  const results: SchemeLineResult[] = [];
  let subtotalPaise = 0n;
  let totalDiscountPaise = 0n;
  let totalPaise = 0n;
  let totalFreeCases = 0;

  for (const line of lines) {
    const { skuCode, casesOrdered, unitPricePaise, availableStockCases } = line;

    if (casesOrdered < 0) {
      throw new Error(`Negative ordered quantity for SKU ${skuCode}`);
    }

    const lineGrossAmount = BigInt(casesOrdered) * unitPricePaise;
    subtotalPaise += lineGrossAmount;

    if (casesOrdered === 0) {
      results.push({
        skuCode,
        orderedCases: 0,
        billedCases: 0,
        freeCases: 0,
        deliveredCases: 0,
        discountPaise: 0n,
        finalLineTotalPaise: 0n,
        freeGoodsStatus: 'ok',
        appliedSchemeId: null,
        appliedSchemeType: null,
        explanation: 'Zero quantity ordered',
      });
      continue;
    }

    // Filter applicable schemes for this SKU, retailer, validity window, and active state
    const candidateSchemes = schemes.filter((s) => {
      if (s.skuCode !== skuCode) return false;

      // Unknown scheme type throws immediately - never silent zero
      if (s.type !== 'buy_n_get_m' && s.type !== 'slab') {
        throw new Error(`Unknown scheme type: ${(s as any).type}`);
      }

      if (!s.active) return false;

      // Retailer scoping: null applies to all retailers, otherwise must match
      if (s.retailerId !== null && s.retailerId !== undefined && s.retailerId !== retailerId) {
        return false;
      }

      // Validity check
      const validFrom = new Date(s.validFrom);
      const validTo = new Date(s.validTo);
      if (orderDate < validFrom || orderDate > validTo) {
        return false;
      }

      return true;
    });

    // Evaluate Buy N Get M candidates
    let bestBngmOption: {
      scheme: SchemeRule;
      freeCases: number;
      benefitPaise: bigint;
    } | null = null;

    // Evaluate Slab candidates (highest qualifying slab)
    let bestSlabOption: {
      scheme: SchemeRule;
      discountBps: number;
      discountPaise: bigint;
      benefitPaise: bigint;
    } | null = null;

    for (const scheme of candidateSchemes) {
      if (scheme.type === 'buy_n_get_m') {
        const n = scheme.n || 0;
        const m = scheme.m || 0;
        if (n <= 0 || m <= 0) continue;

        const free = Math.floor(casesOrdered / n) * m;
        if (free > 0) {
          const benefit = BigInt(free) * unitPricePaise;
          if (!bestBngmOption || benefit > bestBngmOption.benefitPaise) {
            bestBngmOption = { scheme, freeCases: free, benefitPaise: benefit };
          }
        }
      } else if (scheme.type === 'slab') {
        const minCases = scheme.minCases || 0;
        const discountBps = scheme.discountBps || 0;
        if (casesOrdered >= minCases && discountBps > 0) {
          const discount = calculateBpsDiscount(lineGrossAmount, discountBps);
          if (
            !bestSlabOption ||
            minCases > (bestSlabOption.scheme.minCases || 0) ||
            (minCases === (bestSlabOption.scheme.minCases || 0) && discount > bestSlabOption.discountPaise)
          ) {
            bestSlabOption = {
              scheme,
              discountBps,
              discountPaise: discount,
              benefitPaise: discount,
            };
          }
        }
      }
    }

    // A3: Free goods and slab discounts do not stack. One scheme per line.
    // Pick the scheme with the larger retailer benefit.
    let appliedScheme: SchemeRule | null = null;
    let appliedType: SchemeType | null = null;
    let freeCases = 0;
    let discountPaise = 0n;
    let explanation = 'Standard pricing (no scheme applied)';

    if (bestBngmOption && bestSlabOption) {
      if (bestBngmOption.benefitPaise >= bestSlabOption.benefitPaise) {
        appliedScheme = bestBngmOption.scheme;
        appliedType = 'buy_n_get_m';
        freeCases = bestBngmOption.freeCases;
        explanation = `Buy ${appliedScheme.n} Get ${appliedScheme.m} free: ${freeCases} free case(s) awarded (selected over ${bestSlabOption.discountBps / 100}% slab for higher benefit)`;
      } else {
        appliedScheme = bestSlabOption.scheme;
        appliedType = 'slab';
        discountPaise = bestSlabOption.discountPaise;
        explanation = `Slab discount ${bestSlabOption.discountBps / 100}% applied on >= ${bestSlabOption.scheme.minCases} cases (selected over Buy-N-Get-M for higher benefit)`;
      }
    } else if (bestBngmOption) {
      appliedScheme = bestBngmOption.scheme;
      appliedType = 'buy_n_get_m';
      freeCases = bestBngmOption.freeCases;
      explanation = `Buy ${appliedScheme.n} Get ${appliedScheme.m} free: ${freeCases} free case(s) awarded`;
    } else if (bestSlabOption) {
      appliedScheme = bestSlabOption.scheme;
      appliedType = 'slab';
      discountPaise = bestSlabOption.discountPaise;
      explanation = `Slab discount ${bestSlabOption.discountBps / 100}% applied on >= ${bestSlabOption.scheme.minCases} cases`;
    }

    const billedCases = casesOrdered;
    const deliveredCases = casesOrdered + freeCases;
    const finalLineTotalPaise = lineGrossAmount - discountPaise;

    let freeGoodsStatus: 'ok' | 'pending_stock' = 'ok';
    if (freeCases > 0 && availableStockCases !== undefined) {
      if (availableStockCases < deliveredCases) {
        freeGoodsStatus = 'pending_stock';
        explanation += ` (Free goods pending stock: only ${availableStockCases} on hand)`;
      }
    }

    results.push({
      skuCode,
      orderedCases: casesOrdered,
      billedCases,
      freeCases,
      deliveredCases,
      discountPaise,
      finalLineTotalPaise,
      freeGoodsStatus,
      appliedSchemeId: appliedScheme?.id || null,
      appliedSchemeType: appliedType,
      explanation,
    });

    totalDiscountPaise += discountPaise;
    totalPaise += finalLineTotalPaise;
    totalFreeCases += freeCases;
  }

  return {
    lines: results,
    subtotalPaise,
    totalDiscountPaise,
    totalPaise,
    totalFreeCases,
  };
}
