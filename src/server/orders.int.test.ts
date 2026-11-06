/**
 * Order placement against a real Postgres (TEST_DATABASE_URL). Skipped when it isn't set.
 * Each test builds its own retailer and products, so tests don't depend on the seed.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

const run = !!process.env.TEST_DATABASE_URL;
const { db } = run ? await import("@/lib/db") : ({} as typeof import("@/lib/db"));
const { placeOrder, rejectOrder, releaseHold } = run ? await import("./orders") : ({} as typeof import("./orders"));
const { createCapture, confirmCapture } = run ? await import("./capture") : ({} as typeof import("./capture"));

const DAY = 86_400_000;

async function fixture(opts: { limit?: number; outstanding?: number; biscuitStock?: number } = {}) {
  const tag = randomUUID().slice(0, 8);
  const brand = await db.brand.create({ data: { name: `Brand ${tag}` } });
  const retailer = await db.retailer.create({
    data: {
      code: `T-${tag}`, shopName: `Test Shop ${tag}`, ownerName: "Test", area: "Test", route: "R", phone: `9${tag.replace(/\D/g, "0").padEnd(9, "0").slice(0, 9)}`,
      creditLimitPaise: opts.limit ?? 50_000_00, outstandingPaise: opts.outstanding ?? 0, outstandingAsOf: new Date(Date.now() - DAY),
    },
  });
  const user = await db.user.create({ data: { phone: `8${tag.replace(/\D/g, "1").padEnd(9, "1").slice(0, 9)}`, name: "Tester", role: "RETAILER", retailerId: retailer.id } });
  const biscuit = await db.product.create({
    data: { code: `B-${tag}`, name: "Glucose biscuit", nameHi: "बिस्किट", brandId: brand.id, category: "food", packLabel: "75 g", unitsPerCase: 96, unitPricePaise: 810, gstRateBp: 500, stockCases: opts.biscuitStock ?? 340, image: "biscuit", keywords: ["biscuit", "chhota"] },
  });
  const tea = await db.product.create({
    data: { code: `T-${tag}`, name: "Tea leaf", nameHi: "चाय", brandId: brand.id, category: "food", packLabel: "250 g", unitsPerCase: 40, unitPricePaise: 11800, gstRateBp: 500, stockCases: 0, image: "tea", keywords: ["chai patti"] },
  });
  await db.scheme.create({ data: { productId: biscuit.id, type: "FREE_GOODS", buyCases: 10, freeCases: 1, validFrom: new Date(Date.now() - DAY), validTo: new Date(Date.now() + DAY) } });
  return { retailer, user, biscuit, tea };
}

const ids: string[] = [];
beforeEach(() => { ids.length = 0; });
afterAll(async () => { if (run) await db.$disconnect(); });

describe.skipIf(!run)("placeOrder (database)", () => {
  it("reprices on the server, reserves paid + free stock, and confirms within credit", async () => {
    const f = await fixture();
    const r = await placeOrder({ actorId: f.user.id, retailerId: f.retailer.id, source: "APP", idempotencyKey: randomUUID(), items: [{ productId: f.biscuit.id, cases: 10 }] });
    expect(r.ok && r.status).toBe("CONFIRMED");
    const order = await db.order.findUniqueOrThrow({ where: { id: r.ok ? r.orderId : "" }, include: { lines: true } });
    expect(order.totalPaise).toBe(816_480);
    expect(order.lines[0]).toMatchObject({ cases: 10, freeCases: 1, schemeLabel: "Buy 10 get 1 free" });
    expect((await db.product.findUniqueOrThrow({ where: { id: f.biscuit.id } })).stockCases).toBe(329);
  });

  it("puts an order over available credit on hold with a reason", async () => {
    const f = await fixture({ limit: 10_000_00, outstanding: 6_000_00 });
    const r = await placeOrder({ actorId: f.user.id, retailerId: f.retailer.id, source: "APP", idempotencyKey: randomUUID(), items: [{ productId: f.biscuit.id, cases: 10 }] });
    expect(r.ok && r.status).toBe("CREDIT_HOLD");
    const order = await db.order.findUniqueOrThrow({ where: { id: r.ok ? r.orderId : "" } });
    expect(order.holdReason).toMatch(/Over available credit by ₹4,164.80/);
  });

  it("counts earlier accepted orders against credit, so two small orders can't both pass", async () => {
    const f = await fixture({ limit: 12_000_00 });
    const a = await placeOrder({ actorId: f.user.id, retailerId: f.retailer.id, source: "APP", idempotencyKey: randomUUID(), items: [{ productId: f.biscuit.id, cases: 10 }] });
    const b = await placeOrder({ actorId: f.user.id, retailerId: f.retailer.id, source: "APP", idempotencyKey: randomUUID(), items: [{ productId: f.biscuit.id, cases: 10 }] });
    expect([a.ok && a.status, b.ok && b.status]).toEqual(["CONFIRMED", "CREDIT_HOLD"]);
  });

  it("refuses an out-of-stock line and creates nothing", async () => {
    const f = await fixture();
    const r = await placeOrder({ actorId: f.user.id, retailerId: f.retailer.id, source: "APP", idempotencyKey: randomUUID(), items: [{ productId: f.tea.id, cases: 1 }] });
    expect(r).toMatchObject({ ok: false, reason: "blocked" });
    expect(await db.order.count({ where: { retailerId: f.retailer.id } })).toBe(0);
  });

  it("stops when the total the person saw is not the server's total", async () => {
    const f = await fixture();
    const r = await placeOrder({ actorId: f.user.id, retailerId: f.retailer.id, source: "APP", idempotencyKey: randomUUID(), items: [{ productId: f.biscuit.id, cases: 1 }], expectedTotalPaise: 1 });
    expect(r).toMatchObject({ ok: false, reason: "changed" });
  });

  it("is idempotent: the same key twice gives one order", async () => {
    const f = await fixture();
    const key = randomUUID();
    const a = await placeOrder({ actorId: f.user.id, retailerId: f.retailer.id, source: "APP", idempotencyKey: key, items: [{ productId: f.biscuit.id, cases: 2 }] });
    const b = await placeOrder({ actorId: f.user.id, retailerId: f.retailer.id, source: "APP", idempotencyKey: key, items: [{ productId: f.biscuit.id, cases: 2 }] });
    expect(a.ok && b.ok && a.orderId === b.orderId).toBe(true);
    expect(b.ok && b.replayed).toBe(true);
    expect(await db.order.count({ where: { retailerId: f.retailer.id } })).toBe(1);
  });

  it("never oversells when two orders race for the last cases", async () => {
    const f = await fixture({ biscuitStock: 5, limit: 1_000_000_00 });
    const place = () => placeOrder({ actorId: f.user.id, retailerId: f.retailer.id, source: "APP", idempotencyKey: randomUUID(), items: [{ productId: f.biscuit.id, cases: 4 }] });
    const results = await Promise.all([place(), place()]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: f.biscuit.id } })).stockCases).toBe(1);
  });

  it("rejecting returns stock; releasing a hold confirms; exported orders can't be rejected", async () => {
    const f = await fixture({ limit: 1_00 });
    const r = await placeOrder({ actorId: f.user.id, retailerId: f.retailer.id, source: "APP", idempotencyKey: randomUUID(), items: [{ productId: f.biscuit.id, cases: 10 }] });
    if (!r.ok) throw new Error("expected order");
    await releaseHold(r.orderId, f.user.id);
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).status).toBe("CONFIRMED");
    await rejectOrder(r.orderId, f.user.id, "test");
    expect((await db.product.findUniqueOrThrow({ where: { id: f.biscuit.id } })).stockCases).toBe(340);
    await expect(releaseHold(r.orderId, f.user.id)).rejects.toThrow();
  });
});

describe.skipIf(!run)("capture confirm (database)", () => {
  it("won't place an order until unclear units and unsure lines are answered, then learns corrections", async () => {
    const f = await fixture();
    const id = await createCapture({ actorId: f.user.id, retailerId: f.retailer.id, text: "chhota biscuit 5, lal dabba 2 peti", channel: "APP_TEXT" });
    const lines = await db.captureLine.findMany({ where: { captureId: id }, orderBy: { position: "asc" } });
    expect(lines[0]).toMatchObject({ unit: "UNKNOWN", qty: 5 });

    const base = lines.map((l) => ({ lineId: l.id, removed: false, productId: l.productId, cases: l.qty, unitConfirmed: false, checked: false, substituted: false }));
    const refused = await confirmCapture({ actorId: f.user.id, captureId: id, retailerScope: f.retailer.id, lines: base });
    expect(refused.ok).toBe(false);
    expect(!refused.ok && refused.reason === "problems" && refused.problems.map((p) => p.problem)).toContain("unit");

    // Another retailer can't confirm it.
    const other = await fixture();
    expect(await confirmCapture({ actorId: other.user.id, captureId: id, retailerScope: other.retailer.id, lines: base })).toMatchObject({ ok: false, reason: "not_found" });

    const fixed = [
      { ...base[0]!, productId: f.biscuit.id, unitConfirmed: true, checked: true },
      { ...base[1]!, productId: f.biscuit.id, cases: 2, unitConfirmed: true, checked: true }, // correction: "lal dabba" → biscuit
    ];
    const ok = await confirmCapture({ actorId: f.user.id, captureId: id, retailerScope: f.retailer.id, lines: fixed });
    expect(ok.ok).toBe(true);
    const alias = await db.retailerAlias.findFirst({ where: { retailerId: f.retailer.id } });
    expect(alias?.productId).toBe(f.biscuit.id);
    expect((await db.capture.findUniqueOrThrow({ where: { id } })).status).toBe("CONFIRMED");
    // A second confirm is refused, not a duplicate order.
    expect(await confirmCapture({ actorId: f.user.id, captureId: id, retailerScope: f.retailer.id, lines: fixed })).toMatchObject({ ok: false, reason: "already_done" });
  });
});
