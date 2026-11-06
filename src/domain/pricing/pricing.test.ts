import { describe, expect, it } from 'vitest';
import { applyBps, priceCart, type PriceCartInput, type Scheme, type SkuInfo } from './index';

const NOW = new Date('2026-11-06T10:00:00+05:30');
const DAY = 86_400_000;

const skus: Record<string, SkuInfo> = {
  BS075: { id: 'BS075', productId: 'biscuit', unitsPerCase: 96, gstRateBps: 500, stockCases: 340 },
  DT1KG: { id: 'DT1KG', productId: 'detergent', unitsPerCase: 20, gstRateBps: 1800, stockCases: 200 },
  TE250: { id: 'TE250', productId: 'tea', unitsPerCase: 40, gstRateBps: 500, stockCases: 0 },
  TE500: { id: 'TE500', productId: 'tea', unitsPerCase: 20, gstRateBps: 500, stockCases: 35 },
  KT500: { id: 'KT500', productId: 'ketchup', unitsPerCase: 24, gstRateBps: 500, stockCases: 25 },
};
const prices = { BS075: 810, DT1KG: 10150, TE250: 11800, TE500: 23200, KT500: 9800 };

const scheme = (over: Partial<Scheme> & Pick<Scheme, 'id' | 'skuId' | 'type' | 'params'>): Scheme => ({
  validFrom: new Date(NOW.getTime() - 30 * DAY),
  validTo: new Date(NOW.getTime() + 30 * DAY),
  labelEn: over.id,
  labelHi: over.id,
  ...over,
});

const biscuitFree = scheme({ id: 'bs-10+1', skuId: 'BS075', type: 'FREE_GOODS', params: { buy: 10, get: 1 } });
const detergentSlab = scheme({ id: 'dt-3pc', skuId: 'DT1KG', type: 'SLAB_DISCOUNT', params: { minCases: 5, discountBps: 300 } });
const schemes = [biscuitFree, detergentSlab];

const input = (lines: PriceCartInput['lines'], over: Partial<PriceCartInput> = {}): PriceCartInput => ({
  lines,
  skus,
  prices,
  schemes,
  at: NOW,
  retailer: { segment: 'URBAN', availableCreditPaise: 100_000_000 },
  ...over,
});

const line = (cart: ReturnType<typeof priceCart>, skuId: string) => cart.lines.find((l) => l.skuId === skuId)!;

describe('priceCart — required cases (brief §6)', () => {
  const cases: {
    name: string;
    in: PriceCartInput;
    check: (c: ReturnType<typeof priceCart>) => void;
  }[] = [
    {
      name: 'Biscuit 9 cases → 0 free, nudge "add 1 for 1 free"',
      in: input([{ skuId: 'BS075', qtyCases: 9 }]),
      check: (c) => {
        expect(line(c, 'BS075').freeCases).toBe(0);
        expect(c.nudges).toEqual([{ skuId: 'BS075', type: 'ADD_FOR_FREE', addCases: 1, freeCases: 1, schemeId: 'bs-10+1' }]);
      },
    },
    {
      name: 'Biscuit 10 cases → 1 free',
      in: input([{ skuId: 'BS075', qtyCases: 10 }]),
      check: (c) => {
        expect(line(c, 'BS075').freeCases).toBe(1);
        expect(line(c, 'BS075').appliedScheme?.id).toBe('bs-10+1');
        expect(c.freeGoods).toEqual([{ skuId: 'BS075', freeCases: 1, schemeId: 'bs-10+1' }]);
        expect(c.nudges).toEqual([]);
      },
    },
    {
      name: 'Biscuit 21 cases → 2 free',
      in: input([{ skuId: 'BS075', qtyCases: 21 }]),
      check: (c) => expect(line(c, 'BS075').freeCases).toBe(2),
    },
    {
      name: 'Biscuit 330 cases, stock 340 → 10 free (of 33) + warning',
      in: input([{ skuId: 'BS075', qtyCases: 330 }]),
      check: (c) => {
        const l = line(c, 'BS075');
        expect(l.qtyCases).toBe(330);
        expect(l.freeCases).toBe(10);
        expect(l.errors).toEqual([]);
        expect(c.warnings).toEqual([{ code: 'FREE_GOODS_CAPPED', skuId: 'BS075', wanted: 33, given: 10 }]);
      },
    },
    {
      name: 'Detergent 4 cases → no discount; nudge "add 1 for 3% off"',
      in: input([{ skuId: 'DT1KG', qtyCases: 4 }]),
      check: (c) => {
        expect(line(c, 'DT1KG').discountPaise).toBe(0);
        expect(c.nudges).toEqual([{ skuId: 'DT1KG', type: 'ADD_FOR_DISCOUNT', addCases: 1, discountBps: 300, schemeId: 'dt-3pc' }]);
      },
    },
    {
      name: 'Detergent 5 cases → line ₹10,150.00, discount ₹304.50, taxable ₹9,845.50',
      in: input([{ skuId: 'DT1KG', qtyCases: 5 }]),
      check: (c) => {
        const l = line(c, 'DT1KG');
        expect(l.grossPaise).toBe(1_015_000);
        expect(l.discountPaise).toBe(30_450);
        expect(l.taxablePaise).toBe(984_550);
        expect(l.gstPaise).toBe(177_219); // 18% of 9,845.50 = 1,772.19
        expect(c.totals.totalPaise).toBe(984_550 + 177_219);
      },
    },
    {
      name: 'Tea 1 case, stock 0 → INSUFFICIENT_STOCK, available 0, in-stock alternative offered',
      in: input([{ skuId: 'TE250', qtyCases: 1 }]),
      check: (c) => {
        const l = line(c, 'TE250');
        expect(l.errors).toEqual([{ code: 'INSUFFICIENT_STOCK', available: 0, alternatives: ['TE500'] }]);
        expect(l.included).toBe(false);
        expect(c.blocked).toBe(true);
        expect(c.totals.totalPaise).toBe(0);
      },
    },
    {
      name: 'Scheme expired yesterday → not applied',
      in: input([{ skuId: 'BS075', qtyCases: 10 }], {
        schemes: [{ ...biscuitFree, validTo: new Date(NOW.getTime() - DAY) }],
      }),
      check: (c) => {
        expect(line(c, 'BS075').freeCases).toBe(0);
        expect(line(c, 'BS075').activeScheme).toBeNull();
        expect(c.nudges).toEqual([]);
      },
    },
    {
      name: 'Scheme not yet valid → not applied',
      in: input([{ skuId: 'BS075', qtyCases: 10 }], {
        schemes: [{ ...biscuitFree, validFrom: new Date(NOW.getTime() + DAY) }],
      }),
      check: (c) => expect(line(c, 'BS075').freeCases).toBe(0),
    },
    {
      name: 'Scheme for other segment → not applied',
      in: input([{ skuId: 'KT500', qtyCases: 5 }], {
        schemes: [scheme({ id: 'kt', skuId: 'KT500', type: 'FREE_GOODS', params: { buy: 5, get: 1 }, segment: 'URBAN' })],
        retailer: { segment: 'SEMI_URBAN', availableCreditPaise: 100_000_000 },
      }),
      check: (c) => expect(line(c, 'KT500').freeCases).toBe(0),
    },
    {
      name: 'Scheme for same segment → applied',
      in: input([{ skuId: 'KT500', qtyCases: 5 }], {
        schemes: [scheme({ id: 'kt', skuId: 'KT500', type: 'FREE_GOODS', params: { buy: 5, get: 1 }, segment: 'URBAN' })],
      }),
      check: (c) => expect(line(c, 'KT500').freeCases).toBe(1),
    },
    {
      name: 'Cart total > available credit → WILL_HOLD',
      in: input([{ skuId: 'DT1KG', qtyCases: 5 }], { retailer: { segment: 'URBAN', availableCreditPaise: 1_000_000 } }),
      check: (c) => expect(c.creditStatus).toBe('WILL_HOLD'),
    },
    {
      name: 'Cart total == available credit → OK',
      in: input([{ skuId: 'BS075', qtyCases: 1 }], { retailer: { segment: null, availableCreditPaise: 81_648 } }),
      check: (c) => {
        expect(c.totals.totalPaise).toBe(77_760 + 3_888);
        expect(c.creditStatus).toBe('OK');
      },
    },
    {
      name: 'Sample message (5 biscuit, 2 detergent, 1 tea)',
      in: input([
        { skuId: 'BS075', qtyCases: 5 },
        { skuId: 'DT1KG', qtyCases: 2 },
        { skuId: 'TE250', qtyCases: 1 },
      ]),
      check: (c) => {
        expect(line(c, 'BS075').grossPaise).toBe(388_800);
        expect(line(c, 'BS075').appliedScheme).toBeNull();
        expect(line(c, 'BS075').freeCases).toBe(0);
        expect(line(c, 'DT1KG').grossPaise).toBe(406_000);
        expect(line(c, 'DT1KG').discountPaise).toBe(0);
        expect(line(c, 'TE250').errors[0]?.code).toBe('INSUFFICIENT_STOCK');
        expect(c.nudges.map((n) => [n.skuId, n.type, n.addCases])).toEqual([
          ['BS075', 'ADD_FOR_FREE', 5],
          ['DT1KG', 'ADD_FOR_DISCOUNT', 3],
        ]);
        expect(c.blocked).toBe(true);
        expect(c.totals.grossPaise).toBe(388_800 + 406_000);
      },
    },
  ];

  it.each(cases)('$name', ({ in: i, check }) => check(priceCart(i)));
});

describe('priceCart — edge cases', () => {
  it('case prices follow A-01', () => {
    const c = priceCart(input([{ skuId: 'BS075', qtyCases: 1 }, { skuId: 'DT1KG', qtyCases: 1 }, { skuId: 'TE500', qtyCases: 1 }]));
    expect(line(c, 'BS075').casePricePaise).toBe(77_760);
    expect(line(c, 'DT1KG').casePricePaise).toBe(203_000);
  });

  it('merges duplicate SKU lines before pricing', () => {
    const c = priceCart(input([{ skuId: 'BS075', qtyCases: 6 }, { skuId: 'BS075', qtyCases: 4 }]));
    expect(c.lines).toHaveLength(1);
    expect(line(c, 'BS075').freeCases).toBe(1);
  });

  it('rejects quantities outside 1–9999 and non-integers', () => {
    for (const q of [0, -1, 10000, 2.5]) {
      expect(line(priceCart(input([{ skuId: 'BS075', qtyCases: q }])), 'BS075').errors).toEqual([{ code: 'INVALID_QTY' }]);
    }
  });

  it('flags unknown SKUs and missing prices', () => {
    const c = priceCart(input([{ skuId: 'NOPE', qtyCases: 1 }, { skuId: 'TE500', qtyCases: 1 }], { prices: { BS075: 810 } }));
    expect(line(c, 'NOPE').errors).toEqual([{ code: 'UNKNOWN_SKU' }]);
    expect(line(c, 'TE500').errors).toEqual([{ code: 'NO_PRICE' }]);
  });

  it('ignores schemes with invalid params', () => {
    const bad = scheme({ id: 'bad', skuId: 'BS075', type: 'FREE_GOODS', params: { buy: 0, get: 1 } });
    expect(line(priceCart(input([{ skuId: 'BS075', qtyCases: 10 }], { schemes: [bad] })), 'BS075').freeCases).toBe(0);
  });

  it('applies only one scheme per SKU: latest validFrom wins (A-05)', () => {
    const newer = scheme({
      id: 'bs-5+1', skuId: 'BS075', type: 'FREE_GOODS', params: { buy: 5, get: 1 },
      validFrom: new Date(NOW.getTime() - DAY),
    });
    const c = priceCart(input([{ skuId: 'BS075', qtyCases: 10 }], { schemes: [biscuitFree, newer] }));
    expect(line(c, 'BS075').freeCases).toBe(2);
    expect(line(c, 'BS075').appliedScheme?.id).toBe('bs-5+1');
  });

  it('does not nudge when the gap is too large', () => {
    const c = priceCart(input([{ skuId: 'BS075', qtyCases: 3 }, { skuId: 'DT1KG', qtyCases: 1 }]));
    expect(c.nudges).toEqual([]);
  });

  it('does not nudge when stock cannot cover the next threshold', () => {
    const c = priceCart(input([{ skuId: 'BS075', qtyCases: 9 }], { skus: { ...skus, BS075: { ...skus.BS075!, stockCases: 10 } } }));
    expect(c.nudges).toEqual([]);
  });

  it('rounds half-up to the paise (A-04)', () => {
    expect(applyBps(10, 500)).toBe(1); // 0.5 → 1
    expect(applyBps(30, 500)).toBe(2); // 1.5 → 2
    expect(applyBps(29, 500)).toBe(1); // 1.45 → 1
    expect(applyBps(1_015_000, 300)).toBe(30_450);
    expect(() => applyBps(-1, 100)).toThrow(RangeError);
    // Through the engine: gross 96 paise at 5% GST = 4.8 → 5
    const c = priceCart(input([{ skuId: 'BS075', qtyCases: 1 }], { prices: { ...prices, BS075: 1 } }));
    expect(line(c, 'BS075').gstPaise).toBe(5);
  });
});

describe('priceCart — properties', () => {
  // Deterministic pseudo-random carts.
  function* carts(n: number) {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const ids = Object.keys(skus);
    for (let i = 0; i < n; i++) {
      const lines = ids
        .filter(() => rnd() < 0.6)
        .map((skuId) => ({ skuId, qtyCases: 1 + Math.floor(rnd() * 400) }));
      yield input(lines, { retailer: { segment: rnd() < 0.5 ? 'URBAN' : null, availableCreditPaise: Math.floor(rnd() * 5e7) } });
    }
  }

  it('totals equal the sum of included lines, nothing is negative, output is deterministic', () => {
    for (const cartInput of carts(300)) {
      const a = priceCart(cartInput);
      const b = priceCart(structuredClone(cartInput));
      expect(a).toEqual(b);

      const inc = a.lines.filter((l) => l.included);
      expect(a.totals.totalPaise).toBe(inc.reduce((s, l) => s + l.lineTotalPaise, 0));
      expect(a.totals.gstPaise).toBe(inc.reduce((s, l) => s + l.gstPaise, 0));
      expect(a.totals.taxablePaise).toBe(a.totals.grossPaise - a.totals.discountPaise);
      expect(a.totals.totalPaise).toBe(a.totals.taxablePaise + a.totals.gstPaise);

      for (const l of a.lines) {
        for (const v of [l.grossPaise, l.discountPaise, l.taxablePaise, l.gstPaise, l.lineTotalPaise, l.freeCases]) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
        expect(l.discountPaise).toBeLessThanOrEqual(l.grossPaise);
        // Free goods never exceed remaining stock (A-06).
        expect(l.qtyCases + l.freeCases).toBeLessThanOrEqual(skus[l.skuId]!.stockCases + (l.included ? 0 : l.qtyCases));
      }
      expect(a.blocked).toBe(a.lines.some((l) => !l.included));
    }
  });
});
