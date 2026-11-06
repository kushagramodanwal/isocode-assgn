/**
 * Seeds a realistic, fully fictional data set. Safe to re-run: it wipes the tables first.
 * Run: npm run db:seed
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { BRANDS, PRODUCTS, SCHEMES } from "./data/catalogue";
import { DESK_USERS, INCOMING_MESSAGES, LEARNED_ALIASES, RETAILERS, SPECIAL_PRICES } from "./data/people";
import { priceCart, schemeLabelEn, type PricedProduct, type SchemeRule } from "../shared/pricing";
import { parseMessage } from "../shared/capture/parse";
import { matchLine } from "../shared/capture/match";

const db = new PrismaClient();
const DAY = 86_400_000;
const paise = (rupees: number) => Math.round(rupees * 100);

// Deterministic PRNG so every reviewer sees the same data.
let seed = 20261106;
function rand() {
  seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
  return seed / 2 ** 31;
}
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;

async function wipe() {
  await db.auditLog.deleteMany();
  await db.retailerAlias.deleteMany();
  await db.captureLine.deleteMany();
  await db.capture.deleteMany();
  await db.orderLine.deleteMany();
  await db.order.deleteMany();
  await db.exportBatch.deleteMany();
  await db.retailerPrice.deleteMany();
  await db.scheme.deleteMany();
  await db.product.deleteMany();
  await db.brand.deleteMany();
  await db.otpChallenge.deleteMany();
  await db.user.deleteMany();
  await db.retailer.deleteMany();
  await db.$executeRawUnsafe(`ALTER SEQUENCE "Order_number_seq" RESTART WITH 1001`);
}

async function main() {
  const now = new Date();
  await wipe();

  // ── Catalogue ────────────────────────────────────────────────
  const brandIds = new Map<string, string>();
  for (const name of BRANDS) brandIds.set(name, (await db.brand.create({ data: { name } })).id);

  const productByCode = new Map<string, { id: string; name: string; packLabel: string }>();
  for (const p of PRODUCTS) {
    const row = await db.product.create({
      data: {
        code: p.code, name: p.name, nameHi: p.nameHi, brandId: brandIds.get(p.brand)!, category: p.category,
        packLabel: p.packLabel, unitsPerCase: p.unitsPerCase, unitPricePaise: paise(p.unitPrice),
        gstRateBp: p.gstPct * 100, stockCases: p.stockCases, image: p.art, keywords: p.keywords,
      },
    });
    productByCode.set(p.code, { id: row.id, name: row.name, packLabel: row.packLabel });
  }

  // Schemes run for the current quarter relative to seeding, so the demo never expires.
  const validFrom = new Date(now.getTime() - 36 * DAY);
  const validTo = new Date(now.getTime() + 60 * DAY);
  const schemeRules = new Map<string, SchemeRule[]>();
  for (const s of SCHEMES) {
    const productId = productByCode.get(s.code)!.id;
    const row = await db.scheme.create({
      data: s.type === "FREE_GOODS"
        ? { productId, type: s.type, buyCases: s.buyCases, freeCases: s.freeCases, validFrom, validTo }
        : { productId, type: s.type, slabs: s.slabs, validFrom, validTo },
    });
    const rule: SchemeRule = s.type === "FREE_GOODS"
      ? { id: row.id, type: "FREE_GOODS", buyCases: s.buyCases, freeCases: s.freeCases, validFrom, validTo }
      : { id: row.id, type: "SLAB_DISCOUNT", slabs: s.slabs, validFrom, validTo };
    schemeRules.set(productId, [rule]);
  }
  // An expired scheme stays in the data to prove it is ignored.
  await db.scheme.create({
    data: { productId: productByCode.get("SKU-SL-1KG")!.id, type: "FREE_GOODS", buyCases: 20, freeCases: 1, validFrom: new Date(now.getTime() - 120 * DAY), validTo: new Date(now.getTime() - 40 * DAY) },
  });

  // ── People ───────────────────────────────────────────────────
  const retailerIds = new Map<string, string>();
  for (const r of RETAILERS) {
    const row = await db.retailer.create({
      data: {
        code: r.code, shopName: r.shopName, ownerName: r.ownerName, area: r.area, route: r.route, phone: r.phone,
        creditLimitPaise: paise(r.creditLimit), outstandingPaise: paise(r.outstanding),
        outstandingAsOf: new Date(now.getTime() - DAY), // last Tally sync: yesterday
      },
    });
    retailerIds.set(r.code, row.id);
    await db.user.create({ data: { phone: r.phone, name: r.ownerName, role: "RETAILER", retailerId: row.id, lang: r.lang } });
  }
  const deskIds: string[] = [];
  for (const d of DESK_USERS) deskIds.push((await db.user.create({ data: { phone: d.phone, name: d.name, role: "DESK" } })).id);

  for (const sp of SPECIAL_PRICES) {
    await db.retailerPrice.create({
      data: { retailerId: retailerIds.get(sp.retailer)!, productId: productByCode.get(sp.sku)!.id, unitPricePaise: paise(sp.unitPrice) },
    });
  }

  // ── Order history (60 days) ──────────────────────────────────
  const priced = (retailerId: string) =>
    new Map<string, PricedProduct>(
      PRODUCTS.map((p) => {
        const id = productByCode.get(p.code)!.id;
        const special = SPECIAL_PRICES.find((s) => s.sku === p.code && retailerIds.get(s.retailer) === retailerId);
        return [id, { id, unitPricePaise: paise(special?.unitPrice ?? p.unitPrice), unitsPerCase: p.unitsPerCase, gstRateBp: p.gstPct * 100, stockCases: 10_000, schemes: schemeRules.get(id) ?? [] }];
      }),
    );

  type Planned = { at: Date; retailer: string; status: "EXPORTED" | "CONFIRMED" | "CREDIT_HOLD"; items: { productId: string; cases: number }[] };
  const planned: Planned[] = [];
  const allCodes = PRODUCTS.filter((p) => p.code !== "SKU-TE-250" || true).map((p) => p.code);

  for (const r of RETAILERS) {
    const favourites = Array.from(new Set(Array.from({ length: 7 }, () => pick(allCodes))));
    if (r.code === "JBP-R-0001") favourites.unshift("SKU-BS-075", "SKU-DT-1KG", "SKU-TE-250");
    const lastDaysAgo = r.quietDays ?? 1 + Math.floor(rand() * 3);
    for (let d = lastDaysAgo; d <= 60; d += 3 + Math.floor(rand() * 4)) {
      const at = new Date(now.getTime() - d * DAY - Math.floor(rand() * 8) * 3_600_000);
      const n = 2 + Math.floor(rand() * 4);
      const codes = Array.from(new Set(Array.from({ length: n }, () => pick(favourites))));
      planned.push({
        at, retailer: r.code, status: "EXPORTED",
        items: codes.map((c) => ({ productId: productByCode.get(c)!.id, cases: 1 + Math.floor(rand() * 6) })),
      });
    }
  }
  // Today's orders waiting for export, and one over the credit limit.
  const today = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const P = (c: string) => productByCode.get(c)!.id;
  planned.push(
    { at: today(5), retailer: "JBP-R-0003", status: "CONFIRMED", items: [{ productId: P("SKU-BS-075"), cases: 10 }, { productId: P("SKU-DT-1KG"), cases: 5 }, { productId: P("SKU-SL-1KG"), cases: 4 }] },
    { at: today(4), retailer: "JBP-R-0010", status: "CONFIRMED", items: [{ productId: P("SKU-ND-070"), cases: 12 }, { productId: P("SKU-TE-500"), cases: 6 }, { productId: P("SKU-SL-1KG"), cases: 8 }] },
    { at: today(3), retailer: "JBP-R-0016", status: "CONFIRMED", items: [{ productId: P("SKU-DT-1KG"), cases: 8 }, { productId: P("SKU-SP-100"), cases: 10 }, { productId: P("SKU-HW-200"), cases: 2 }] },
    { at: today(2), retailer: "JBP-R-0002", status: "CREDIT_HOLD", items: [{ productId: P("SKU-DT-1KG"), cases: 2 }, { productId: P("SKU-CB-100"), cases: 3 }] },
  );
  planned.sort((a, b) => a.at.getTime() - b.at.getTime());

  const batches = new Map<string, string>();
  for (const o of planned) {
    const retailerId = retailerIds.get(o.retailer)!;
    const quote = priceCart(o.items, priced(retailerId), o.at);
    let exportBatchId: string | null = null;
    if (o.status === "EXPORTED") {
      const key = o.at.toISOString().slice(0, 10);
      if (!batches.has(key)) {
        batches.set(key, (await db.exportBatch.create({ data: { createdById: deskIds[0]!, createdAt: new Date(o.at.getTime() + 14 * 3_600_000) } })).id);
      }
      exportBatchId = batches.get(key)!;
    }
    const placedById = (await db.user.findFirstOrThrow({ where: { retailerId } })).id;
    await db.order.create({
      data: {
        retailerId, placedById, source: rand() < 0.35 ? "CAPTURE" : "APP", status: o.status, exportBatchId,
        holdReason: o.status === "CREDIT_HOLD" ? "Over available credit (seeded example)" : null,
        grossPaise: quote.totals.grossPaise, discountPaise: quote.totals.discountPaise, taxablePaise: quote.totals.taxablePaise,
        gstPaise: quote.totals.gstPaise, totalPaise: quote.totals.totalPaise,
        idempotencyKey: `seed:${o.retailer}:${o.at.getTime()}`, createdAt: o.at, updatedAt: o.at,
        lines: {
          create: quote.lines.map((l) => ({
            productId: l.productId, cases: l.cases, freeCases: l.freeCases,
            unitPricePaise: priced(retailerId).get(l.productId)!.unitPricePaise, casePricePaise: l.casePricePaise,
            grossPaise: l.grossPaise, discountPaise: l.discountPaise, taxablePaise: l.taxablePaise,
            gstRateBp: l.gstRateBp, gstPaise: l.gstPaise, totalPaise: l.totalPaise,
            schemeLabel: l.scheme ? schemeLabelEn(l.scheme) : null,
          })),
        },
      },
    });
  }
  // Make the held order's reason concrete.
  const gupta = RETAILERS.find((r) => r.code === "JBP-R-0002")!;
  await db.order.updateMany({
    where: { status: "CREDIT_HOLD" },
    data: { holdReason: `Over available credit (limit ₹${gupta.creditLimit.toLocaleString("en-IN")}, outstanding ₹${gupta.outstanding.toLocaleString("en-IN")})` },
  });

  // ── Learned aliases and incoming WhatsApp messages ───────────
  for (const a of LEARNED_ALIASES) {
    await db.retailerAlias.create({ data: { retailerId: retailerIds.get(a.retailer)!, phrase: a.phrase, productId: productByCode.get(a.sku)!.id, createdById: deskIds[0]! } });
  }

  const catalogue = PRODUCTS.map((p) => ({ id: productByCode.get(p.code)!.id, name: p.name, nameHi: p.nameHi, brand: p.brand, packLabel: p.packLabel, keywords: p.keywords, category: p.category }));
  for (const m of INCOMING_MESSAGES) {
    const retailerId = retailerIds.get(m.retailer)!;
    const history = new Map(
      (await db.orderLine.groupBy({ by: ["productId"], where: { order: { retailerId } }, _count: { productId: true } })).map((r) => [r.productId, r._count.productId]),
    );
    const aliases = new Map((await db.retailerAlias.findMany({ where: { retailerId } })).map((a) => [a.phrase, a.productId]));
    const lines = parseMessage(m.text);
    await db.capture.create({
      data: {
        retailerId, createdById: deskIds[0]!, channel: "WHATSAPP_TEXT", rawText: m.text, parser: "rules",
        createdAt: new Date(now.getTime() - m.minutesAgo * 60_000),
        lines: {
          create: lines.map((l, position) => {
            const r = matchLine(l.words, l.sizes, { catalogue, history, aliases });
            return {
              position, rawText: l.raw, phrase: r.phrase, qty: l.qty, unit: l.unit, productId: r.productId,
              confidence: r.confidence, matchedBy: r.matchedBy, alternatives: r.alternatives as unknown as Prisma.InputJsonValue,
            };
          }),
        },
      },
    });
  }

  const counts = { products: PRODUCTS.length, retailers: RETAILERS.length, orders: planned.length, captures: INCOMING_MESSAGES.length };
  console.log("Seeded", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
