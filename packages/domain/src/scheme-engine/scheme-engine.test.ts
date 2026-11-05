import { describe, expect, it } from 'vitest';
import { calculateSchemes } from './index.js';
import { SchemeRule } from './types.js';

describe('Scheme Engine (Section 4.2 & 11 Mandatory Tests)', () => {
  const baseDate = new Date('2026-11-06T10:00:00Z');
  const retailerA = 'ret-101';
  const retailerB = 'ret-102';

  const sampleBuyNGetM: SchemeRule = {
    id: 'sch-bngm-1',
    skuCode: 'SKU-BS-075',
    type: 'buy_n_get_m',
    n: 10,
    m: 1,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2026-12-31T23:59:59Z'),
    active: true,
    retailerId: null,
  };

  const sampleSlab: SchemeRule = {
    id: 'sch-slab-1',
    skuCode: 'SKU-DT-1KG',
    type: 'slab',
    minCases: 5,
    discountBps: 300, // 3%
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2026-12-31T23:59:59Z'),
    active: true,
    retailerId: null,
  };

  it('handles threshold at N-1 (9 cases on Buy 10 Get 1 -> 0 free)', () => {
    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [{ skuCode: 'SKU-BS-075', casesOrdered: 9, unitPricePaise: 50000n }],
      schemes: [sampleBuyNGetM],
    });

    expect(res.lines[0].billedCases).toBe(9);
    expect(res.lines[0].freeCases).toBe(0);
    expect(res.lines[0].deliveredCases).toBe(9);
    expect(res.lines[0].discountPaise).toBe(0n);
    expect(res.lines[0].finalLineTotalPaise).toBe(450000n);
  });

  it('handles threshold at exactly N (10 cases on Buy 10 Get 1 -> 1 free)', () => {
    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [{ skuCode: 'SKU-BS-075', casesOrdered: 10, unitPricePaise: 50000n }],
      schemes: [sampleBuyNGetM],
    });

    expect(res.lines[0].billedCases).toBe(10);
    expect(res.lines[0].freeCases).toBe(1);
    expect(res.lines[0].deliveredCases).toBe(11);
    expect(res.lines[0].finalLineTotalPaise).toBe(500000n);
  });

  it('handles multiple of N (20 cases on Buy 10 Get 1 -> 2 free, 20 billed, 22 delivered)', () => {
    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [{ skuCode: 'SKU-BS-075', casesOrdered: 20, unitPricePaise: 50000n }],
      schemes: [sampleBuyNGetM],
    });

    expect(res.lines[0].billedCases).toBe(20);
    expect(res.lines[0].freeCases).toBe(2);
    expect(res.lines[0].deliveredCases).toBe(22);
    expect(res.lines[0].finalLineTotalPaise).toBe(1000000n);
  });

  it('handles large quantities correctly (1000 cases -> 100 free)', () => {
    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [{ skuCode: 'SKU-BS-075', casesOrdered: 1000, unitPricePaise: 10000n }],
      schemes: [sampleBuyNGetM],
    });

    expect(res.lines[0].freeCases).toBe(100);
    expect(res.lines[0].deliveredCases).toBe(1100);
    expect(res.lines[0].billedCases).toBe(1000);
  });

  it('handles zero quantity', () => {
    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [{ skuCode: 'SKU-BS-075', casesOrdered: 0, unitPricePaise: 50000n }],
      schemes: [sampleBuyNGetM],
    });

    expect(res.lines[0].billedCases).toBe(0);
    expect(res.lines[0].freeCases).toBe(0);
    expect(res.lines[0].finalLineTotalPaise).toBe(0n);
  });

  it('handles slab boundary at exactly minCases with paisa rounding down', () => {
    // Spec 4.2 example: 5 cases of detergent at ₹101.50 = 50,750 paise line amount. 3% gives 1,522 paise.
    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [{ skuCode: 'SKU-DT-1KG', casesOrdered: 5, unitPricePaise: 10150n }],
      schemes: [sampleSlab],
    });

    expect(res.lines[0].billedCases).toBe(5);
    expect(res.lines[0].freeCases).toBe(0);
    expect(res.lines[0].discountPaise).toBe(1522n); // floor(50750 * 300 / 10000) = 1522n
    expect(res.lines[0].finalLineTotalPaise).toBe(50750n - 1522n);
  });

  it('ignores slab below minCases', () => {
    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [{ skuCode: 'SKU-DT-1KG', casesOrdered: 4, unitPricePaise: 10150n }],
      schemes: [sampleSlab],
    });

    expect(res.lines[0].discountPaise).toBe(0n);
    expect(res.lines[0].finalLineTotalPaise).toBe(40600n);
  });

  it('ignores expired scheme', () => {
    const expiredScheme: SchemeRule = {
      ...sampleBuyNGetM,
      id: 'sch-expired',
      validTo: new Date('2026-10-01T00:00:00Z'),
    };

    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [{ skuCode: 'SKU-BS-075', casesOrdered: 20, unitPricePaise: 50000n }],
      schemes: [expiredScheme],
    });

    expect(res.lines[0].freeCases).toBe(0);
    expect(res.lines[0].appliedSchemeId).toBeNull();
  });

  it('ignores scheme scoped to another retailer', () => {
    const retailerBScheme: SchemeRule = {
      ...sampleBuyNGetM,
      id: 'sch-ret-b-only',
      retailerId: retailerB,
    };

    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [{ skuCode: 'SKU-BS-075', casesOrdered: 20, unitPricePaise: 50000n }],
      schemes: [retailerBScheme],
    });

    expect(res.lines[0].freeCases).toBe(0);
    expect(res.lines[0].appliedSchemeId).toBeNull();
  });

  it('throws on unknown scheme type - never silent zero', () => {
    const weirdScheme: any = {
      id: 'weird-1',
      skuCode: 'SKU-X',
      type: 'lottery_jackpot',
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      active: true,
    };

    expect(() =>
      calculateSchemes({
        orderDate: baseDate,
        retailerId: retailerA,
        lines: [{ skuCode: 'SKU-X', casesOrdered: 5, unitPricePaise: 1000n }],
        schemes: [weirdScheme],
      })
    ).toThrow(/Unknown scheme type/);
  });

  it('flags free goods as pending_stock when available stock is insufficient', () => {
    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [
        {
          skuCode: 'SKU-BS-075',
          casesOrdered: 10,
          unitPricePaise: 50000n,
          availableStockCases: 10, // Needs 11 (10 ordered + 1 free), but only 10 available
        },
      ],
      schemes: [sampleBuyNGetM],
    });

    expect(res.lines[0].freeCases).toBe(1);
    expect(res.lines[0].deliveredCases).toBe(11);
    expect(res.lines[0].freeGoodsStatus).toBe('pending_stock');
    expect(res.lines[0].explanation).toContain('pending stock');
  });

  it('enforces non-stacking rule (A3) picking higher benefit', () => {
    // Both Buy 10 Get 1 and 20% slab for the same SKU
    const bngm: SchemeRule = {
      id: 'sch-bngm',
      skuCode: 'SKU-DUAL',
      type: 'buy_n_get_m',
      n: 10,
      m: 1, // 1 free case out of 10 = ~10% value
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      active: true,
    };

    const slab20: SchemeRule = {
      id: 'sch-slab20',
      skuCode: 'SKU-DUAL',
      type: 'slab',
      minCases: 10,
      discountBps: 2000, // 20% value
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      active: true,
    };

    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [{ skuCode: 'SKU-DUAL', casesOrdered: 10, unitPricePaise: 10000n }],
      schemes: [bngm, slab20],
    });

    // 20% slab discount (20000 paise) > 1 free case (10000 paise)
    expect(res.lines[0].appliedSchemeType).toBe('slab');
    expect(res.lines[0].discountPaise).toBe(20000n);
    expect(res.lines[0].freeCases).toBe(0);
  });

  it('calculates multiple lines correctly', () => {
    const res = calculateSchemes({
      orderDate: baseDate,
      retailerId: retailerA,
      lines: [
        { skuCode: 'SKU-BS-075', casesOrdered: 10, unitPricePaise: 50000n }, // 1 free
        { skuCode: 'SKU-DT-1KG', casesOrdered: 5, unitPricePaise: 10150n }, // 1522 discount
      ],
      schemes: [sampleBuyNGetM, sampleSlab],
    });

    expect(res.lines).toHaveLength(2);
    expect(res.totalFreeCases).toBe(1);
    expect(res.totalDiscountPaise).toBe(1522n);
    expect(res.totalPaise).toBe(500000n + (50750n - 1522n));
  });
});
