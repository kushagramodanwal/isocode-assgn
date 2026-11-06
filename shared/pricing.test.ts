import { describe, expect, it } from "vitest";
import {
  applyBp,
  checkCredit,
  pickScheme,
  priceCart,
  priceLine,
  schemeLabelEn,
  type PricedProduct,
  type SchemeRule,
} from "./pricing";

const NOW = new Date("2026-11-06T10:00:00+05:30");
const FROM = new Date("2026-10-01T00:00:00+05:30");
const TO = new Date("2026-12-31T23:59:59+05:30");

const buy10get1: SchemeRule = { id: "s-bis", type: "FREE_GOODS", buyCases: 10, freeCases: 1, validFrom: FROM, validTo: TO };
const det3pc: SchemeRule = {
  id: "s-det",
  type: "SLAB_DISCOUNT",
  slabs: [{ minCases: 5, percentBp: 300 }],
  validFrom: FROM,
  validTo: TO,
};

// The three SKUs from the brief, exactly.
const biscuit: PricedProduct = { id: "SKU-BS-075", unitPricePaise: 810, unitsPerCase: 96, gstRateBp: 500, stockCases: 340, schemes: [buy10get1] };
const detergent: PricedProduct = { id: "SKU-DT-1KG", unitPricePaise: 10150, unitsPerCase: 20, gstRateBp: 1800, stockCases: 85, schemes: [det3pc] };
const tea: PricedProduct = { id: "SKU-TE-250", unitPricePaise: 11800, unitsPerCase: 40, gstRateBp: 500, stockCases: 0, schemes: [] };

describe("applyBp", () => {
  it.each([
    [10_000, 300, 300],
    [1_015_000, 300, 30_450],
    [33, 300, 1], // 0.99 rounds up
    [16, 300, 0], // 0.48 rounds down
    [50, 100, 1], // exactly .5 rounds half up
    [0, 1800, 0],
  ])("%i paise x %i bp = %i", (amount, bp, expected) => {
    expect(applyBp(amount, bp)).toBe(expected);
  });
});

describe("case price from the brief's per-pack dealer prices", () => {
  it.each([
    [biscuit, 77_760],
    [detergent, 203_000],
    [tea, 472_000],
  ])("%o", (p, casePrice) => {
    expect(priceLine(p, 1, NOW).casePricePaise).toBe(casePrice);
  });
});

describe("free goods: buy 10 cases get 1 free", () => {
  it.each([
    // cases, free, nudge add
    [1, 0, null],
    [4, 0, null], // 6 short of 10: more than half away, no nudge
    [5, 0, 5], // exactly half way: nudge "add 5 more"
    [9, 0, 1],
    [10, 1, null],
    [15, 1, 5],
    [20, 2, null],
    [25, 2, 5],
  ])("%i cases → %i free, nudge %s", (cases, free, add) => {
    const q = priceLine(biscuit, cases, NOW);
    expect(q.freeCases).toBe(free);
    expect(q.discountPaise).toBe(0);
    expect(q.grossPaise).toBe(cases * 77_760);
    expect(q.nudge?.addCases ?? null).toBe(add);
    if (free > 0) expect(q.scheme).toMatchObject({ type: "FREE_GOODS", buyCases: 10, freeCases: 1 });
  });

  it("free goods carry no charge and no GST", () => {
    const q = priceLine(biscuit, 10, NOW);
    expect(q.taxablePaise).toBe(777_600);
    expect(q.gstPaise).toBe(38_880); // 5% of 7,776.00
    expect(q.totalPaise).toBe(816_480);
  });

  it("caps free goods at remaining stock and flags it, without blocking", () => {
    const q = priceLine({ ...biscuit, stockCases: 10 }, 10, NOW);
    expect(q.freeCasesEarned).toBe(1);
    expect(q.freeCases).toBe(0);
    expect(q.issues).toEqual(["FREE_GOODS_SHORT"]);
    expect(q.blocked).toBe(false);
  });

  it("gives partial free goods when stock covers some", () => {
    const q = priceLine({ ...biscuit, schemes: [{ ...buy10get1, freeCases: 2 }], stockCases: 21 }, 20, NOW);
    expect(q.freeCasesEarned).toBe(4);
    expect(q.freeCases).toBe(1);
  });

  it("does not nudge towards free goods the warehouse cannot supply", () => {
    expect(priceLine({ ...biscuit, stockCases: 10 }, 9, NOW).nudge).toBeNull();
    expect(priceLine({ ...biscuit, stockCases: 11 }, 9, NOW).nudge).toMatchObject({ addCases: 1 });
  });
});

describe("slab discount: 3% off 5 or more cases", () => {
  it("brief example: 2 cases → no discount, nudge to 5", () => {
    const q = priceLine(detergent, 2, NOW);
    expect(q.discountPaise).toBe(0);
    expect(q.scheme).toBeNull();
    expect(q.nudge).toEqual({ kind: "SLAB_DISCOUNT", addCases: 3, percentBp: 300 });
  });

  it("5 cases → 3% off, GST on the discounted value", () => {
    const q = priceLine(detergent, 5, NOW);
    expect(q.grossPaise).toBe(1_015_000);
    expect(q.discountPaise).toBe(30_450);
    expect(q.taxablePaise).toBe(984_550);
    expect(q.gstPaise).toBe(177_219); // 18% of 9,845.50 = 1,772.19
    expect(q.totalPaise).toBe(1_161_769);
    expect(q.nudge).toBeNull();
  });

  it("picks the highest slab reached, with unsorted slabs", () => {
    const multi: PricedProduct = {
      ...detergent,
      schemes: [{ ...det3pc, slabs: [{ minCases: 20, percentBp: 500 }, { minCases: 5, percentBp: 300 }, { minCases: 10, percentBp: 400 }] }],
    };
    expect(priceLine(multi, 4, NOW).discountPaise).toBe(0);
    expect(priceLine(multi, 10, NOW).scheme).toMatchObject({ minCases: 10, percentBp: 400 });
    expect(priceLine(multi, 12, NOW).nudge).toMatchObject({ addCases: 8, percentBp: 500 });
    expect(priceLine(multi, 9, NOW).nudge).toMatchObject({ addCases: 1, percentBp: 400 });
  });
});

describe("validity window and competing schemes", () => {
  it("ignores expired and future schemes", () => {
    const expired = { ...buy10get1, validTo: new Date("2026-11-05T23:59:59+05:30") };
    const future = { ...buy10get1, id: "f", validFrom: new Date("2026-11-07T00:00:00+05:30") };
    expect(priceLine({ ...biscuit, schemes: [expired, future] }, 10, NOW).freeCases).toBe(0);
  });

  it("is live on the boundary instants", () => {
    expect(priceLine({ ...biscuit, schemes: [{ ...buy10get1, validFrom: NOW }] }, 10, NOW).freeCases).toBe(1);
    expect(priceLine({ ...biscuit, schemes: [{ ...buy10get1, validTo: NOW }] }, 10, NOW).freeCases).toBe(1);
  });

  it("never stacks: gives the retailer the more valuable scheme at that quantity", () => {
    const both: PricedProduct = {
      ...biscuit,
      schemes: [buy10get1, { ...det3pc, id: "s-bis-slab", slabs: [{ minCases: 5, percentBp: 500 }] }],
    };
    // 5 cases: free goods give nothing yet, 5% off does
    expect(priceLine(both, 5, NOW).scheme?.type).toBe("SLAB_DISCOUNT");
    // 10 cases: 1 free case (10%) beats 5% off
    const q = priceLine(both, 10, NOW);
    expect(q.scheme?.type).toBe("FREE_GOODS");
    expect(q.discountPaise).toBe(0);
  });

  it("breaks ties by scheme id so pricing is deterministic", () => {
    const a = { ...buy10get1, id: "b" };
    const b = { ...buy10get1, id: "a" };
    expect(pickScheme([a, b], 10, 100, NOW)?.id).toBe("a");
  });

  it("ignores malformed schemes instead of dividing by zero", () => {
    const bad: SchemeRule = { ...buy10get1, buyCases: 0 };
    const q = priceLine({ ...biscuit, schemes: [bad] }, 10, NOW);
    expect(q.freeCases).toBe(0);
    expect(Number.isFinite(q.totalPaise)).toBe(true);
  });
});

describe("stock and quantity guards", () => {
  it("tea at 0 stock is out of stock and blocked", () => {
    const q = priceLine(tea, 1, NOW);
    expect(q.issues).toEqual(["OUT_OF_STOCK"]);
    expect(q.blocked).toBe(true);
  });

  it("asking for more than stock blocks the line", () => {
    expect(priceLine(detergent, 86, NOW).issues).toEqual(["INSUFFICIENT_STOCK"]);
    expect(priceLine(detergent, 85, NOW).blocked).toBe(false);
  });

  it.each([0, -1, 1.5, 1000, Number.NaN])("rejects %s cases", (cases) => {
    const q = priceLine(detergent, cases, NOW);
    expect(q.issues).toEqual(["INVALID_QTY"]);
    expect(q.totalPaise).toBe(0);
  });
});

describe("priceCart", () => {
  const products = new Map([biscuit, detergent, tea].map((p) => [p.id, p]));

  it("brief's sample order: 5 biscuit, 2 detergent, 1 tea", () => {
    const quote = priceCart(
      [
        { productId: biscuit.id, cases: 5 },
        { productId: detergent.id, cases: 2 },
        { productId: tea.id, cases: 1 },
      ],
      products,
      NOW,
    );
    expect(quote.blocked).toBe(true); // tea is out of stock
    // Totals exclude the blocked tea line
    expect(quote.totals.grossPaise).toBe(5 * 77_760 + 2 * 203_000);
    expect(quote.totals.gstPaise).toBe(19_440 + 73_080);
    expect(quote.lines.find((l) => l.productId === biscuit.id)?.nudge).toMatchObject({ addCases: 5 });
    expect(quote.lines.find((l) => l.productId === detergent.id)?.nudge).toMatchObject({ addCases: 3 });
  });

  it("merges duplicate lines so a threshold can't be split", () => {
    const quote = priceCart(
      [
        { productId: biscuit.id, cases: 6 },
        { productId: biscuit.id, cases: 4 },
      ],
      products,
      NOW,
    );
    expect(quote.lines).toHaveLength(1);
    expect(quote.totals.freeCases).toBe(1);
    expect(quote.totals.freeGoodsValuePaise).toBe(77_760);
  });

  it("an empty cart cannot be placed", () => {
    expect(priceCart([], products, NOW).blocked).toBe(true);
  });

  it("drops unknown products", () => {
    expect(priceCart([{ productId: "nope", cases: 1 }], products, NOW).lines).toHaveLength(0);
  });
});

describe("checkCredit", () => {
  it("counts open orders against the limit", () => {
    const c = checkCredit({ creditLimitPaise: 50_000_00, outstandingPaise: 30_000_00, openOrdersPaise: 15_000_00, orderTotalPaise: 6_000_00 });
    expect(c.availablePaise).toBe(5_000_00);
    expect(c.exceedsByPaise).toBe(1_000_00);
    expect(c.withinLimit).toBe(false);
  });

  it("exactly at the limit is allowed", () => {
    expect(checkCredit({ creditLimitPaise: 100, outstandingPaise: 0, openOrdersPaise: 0, orderTotalPaise: 100 }).withinLimit).toBe(true);
  });

  it("already over the limit: the whole order exceeds", () => {
    const c = checkCredit({ creditLimitPaise: 100, outstandingPaise: 150, openOrdersPaise: 0, orderTotalPaise: 40 });
    expect(c.availablePaise).toBe(-50);
    expect(c.exceedsByPaise).toBe(40);
  });
});

describe("schemeLabelEn", () => {
  it("reads like the brief", () => {
    expect(schemeLabelEn(buy10get1)).toBe("Buy 10 get 1 free");
    expect(schemeLabelEn(det3pc)).toBe("3% off on 5+ cases");
  });
});
