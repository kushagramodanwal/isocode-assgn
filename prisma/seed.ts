// Idempotent seed: wipes app tables and recreates fictional demo data. Safe on any DB you own.
import { PrismaClient, type OrderStatus } from '@prisma/client';
import { BRANDS, PRODUCTS, SCHEMES } from './data/catalogue';
import { ALIASES, DESK_USER, MESSAGES, RETAILERS, SALESMAN_USER } from './data/people';

const prisma = new PrismaClient();
const DAY = 86_400_000;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bpsOf = (paise: number, bps: number) => Math.floor((paise * bps + 5000) / 10000);

export async function seed(now = new Date()) {
  const rand = mulberry32(20261106);

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.tallyExport.deleteMany(),
    prisma.captureLine.deleteMany(),
    prisma.captureDraft.deleteMany(),
    prisma.inboundMessage.deleteMany(),
    prisma.retailerAlias.deleteMany(),
    prisma.orderLine.deleteMany(),
    prisma.order.deleteMany(),
    prisma.counter.deleteMany(),
    prisma.scheme.deleteMany(),
    prisma.retailerPrice.deleteMany(),
    prisma.tierPrice.deleteMany(),
    prisma.sku.deleteMany(),
    prisma.product.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.otpChallenge.deleteMany(),
    prisma.user.deleteMany(),
    prisma.retailer.deleteMany(),
  ]);

  // ---- Catalogue
  const brandIds: Record<string, string> = {};
  for (const name of BRANDS) brandIds[name] = (await prisma.brand.create({ data: { name } })).id;

  const skuByCode: Record<string, { id: string; unitsPerCase: number; unitPricePaise: number; gstRateBps: number; premium?: number }> = {};
  for (const p of PRODUCTS) {
    const product = await prisma.product.create({
      data: { brandId: brandIds[p.brand]!, name: p.name, nameHi: p.nameHi, category: p.category, imageUrl: p.image },
    });
    for (const s of p.skus) {
      const sku = await prisma.sku.create({
        data: {
          code: s.code, productId: product.id, packLabel: s.packLabel, packGrams: s.packGrams,
          unitsPerCase: s.unitsPerCase, unitPricePaise: s.unitPricePaise, gstRateBps: p.gstRateBps,
          stockCases: s.stockCases, allowPieces: s.allowPieces ?? false,
        },
      });
      skuByCode[s.code] = { id: sku.id, unitsPerCase: s.unitsPerCase, unitPricePaise: s.unitPricePaise, gstRateBps: p.gstRateBps, premium: s.premiumPricePaise };
      if (s.premiumPricePaise) {
        await prisma.tierPrice.create({ data: { tier: 'PREMIUM', skuId: sku.id, unitPricePaise: s.premiumPricePaise } });
      }
    }
  }

  for (const sc of SCHEMES) {
    await prisma.scheme.create({
      data: {
        skuId: skuByCode[sc.skuCode]!.id, type: sc.type, params: sc.params,
        validFrom: new Date(now.getTime() + sc.fromDays * DAY), validTo: new Date(now.getTime() + sc.toDays * DAY),
        segment: sc.segment ?? null, labelEn: sc.labelEn, labelHi: sc.labelHi,
      },
    });
  }

  // ---- People
  const desk = await prisma.user.create({ data: { phone: DESK_USER.phone, name: DESK_USER.name, role: 'DESK' } });
  const salesman = await prisma.user.create({ data: { phone: SALESMAN_USER.phone, name: SALESMAN_USER.name, role: 'SALESMAN' } });

  const retailerIds: Record<string, string> = {};
  const retailerUserIds: Record<string, string> = {};
  for (const r of RETAILERS) {
    const retailer = await prisma.retailer.create({
      data: {
        shopName: r.shopName, ownerName: r.ownerName, phone: r.phone, area: r.area, route: r.route,
        segment: r.segment, priceTier: r.priceTier, creditLimitPaise: r.creditLimitPaise,
        outstandingPaise: r.outstandingPaise, tallyLedgerName: `${r.shopName} - ${r.area}`, salesmanId: salesman.id,
      },
    });
    retailerIds[r.key] = retailer.id;
    const user = await prisma.user.create({
      data: { phone: r.phone, name: r.ownerName.replace(' (fictional)', ''), role: 'RETAILER', retailerId: retailer.id, preferredLang: r.key === 'r2' ? 'hi' : 'en' },
    });
    retailerUserIds[r.key] = user.id;
  }
  // One per-retailer price override (A-09): City Fresh Mart negotiated salt.
  await prisma.retailerPrice.create({ data: { retailerId: retailerIds.r4!, skuId: skuByCode['SKU-SL-1KG']!.id, unitPricePaise: 2300 } });

  // ---- 60 days of order history (simple snapshot math, no schemes on history).
  let counter = 0;
  const nextNumber = (d: Date) => `JBP-${d.getFullYear()}-${String(++counter).padStart(6, '0')}`;
  type Hist = { r: (typeof RETAILERS)[number]; at: Date };
  const history: Hist[] = [];
  for (const r of RETAILERS) {
    for (let daysAgo = 60; daysAgo >= r.lastOrderDaysAgo; daysAgo -= 5 + Math.floor(rand() * 4)) {
      history.push({ r, at: new Date(now.getTime() - daysAgo * DAY - Math.floor(rand() * 8) * 3_600_000) });
    }
    // Ensure the exact "last order" day exists.
    history.push({ r, at: new Date(now.getTime() - r.lastOrderDaysAgo * DAY) });
  }
  history.sort((a, b) => a.at.getTime() - b.at.getTime());

  for (const h of history) {
    const tier = h.r.priceTier;
    const picks = h.r.favourites.filter(() => rand() < 0.6);
    if (picks.length === 0) picks.push(h.r.favourites[0]!);
    const lines = picks.map((code) => {
      const sku = skuByCode[code]!;
      const unit = tier === 'PREMIUM' && sku.premium ? sku.premium : sku.unitPricePaise;
      const qtyCases = 1 + Math.floor(rand() * 4);
      const value = qtyCases * sku.unitsPerCase * unit;
      const gst = bpsOf(value, sku.gstRateBps);
      return { skuId: sku.id, qtyCases, freeCases: 0, unitPricePaise: unit, unitsPerCase: sku.unitsPerCase, discountPaise: 0, gstRateBps: sku.gstRateBps, gstPaise: gst, lineTotalPaise: value + gst, value };
    });
    const taxable = lines.reduce((s, l) => s + l.value, 0);
    const gst = lines.reduce((s, l) => s + l.gstPaise, 0);
    const ageDays = (now.getTime() - h.at.getTime()) / DAY;
    const status: OrderStatus = ageDays > 3 ? 'EXPORTED' : 'CONFIRMED';
    await prisma.order.create({
      data: {
        number: nextNumber(h.at), retailerId: retailerIds[h.r.key]!, source: rand() < 0.7 ? 'APP' : 'SALESMAN', status,
        taxablePaise: taxable, discountPaise: 0, gstPaise: gst, totalPaise: taxable + gst,
        createdById: retailerUserIds[h.r.key]!, confirmedById: desk.id, confirmedAt: h.at, createdAt: h.at,
        lines: { create: lines.map(({ value: _v, ...l }) => l) },
      },
    });
  }

  // A pending credit hold for the near-limit retailer (demo of release flow).
  {
    const sku = skuByCode['SKU-TE-500']!;
    const unit = sku.premium ?? sku.unitPricePaise;
    const qty = 3;
    const value = qty * sku.unitsPerCase * unit;
    const g = bpsOf(value, sku.gstRateBps);
    await prisma.order.create({
      data: {
        number: nextNumber(now), retailerId: retailerIds.r2!, source: 'APP', status: 'CREDIT_HOLD',
        taxablePaise: value, discountPaise: 0, gstPaise: g, totalPaise: value + g, createdById: retailerUserIds.r2!,
        createdAt: new Date(now.getTime() - 2 * 3_600_000),
        lines: { create: [{ skuId: sku.id, qtyCases: qty, unitPricePaise: unit, unitsPerCase: sku.unitsPerCase, gstRateBps: sku.gstRateBps, gstPaise: g, lineTotalPaise: value + g }] },
      },
    });
  }
  await prisma.counter.create({ data: { key: `order-${now.getFullYear()}`, value: counter } });

  // ---- Inbound messages and aliases
  for (const m of MESSAGES) {
    const r = RETAILERS.find((x) => x.key === m.retailer)!;
    await prisma.inboundMessage.create({
      data: { retailerId: retailerIds[m.retailer]!, fromPhone: r.phone, channel: 'WHATSAPP_MOCK', rawText: m.text, receivedAt: new Date(now.getTime() - m.hoursAgo * 3_600_000) },
    });
  }
  for (const a of ALIASES) {
    await prisma.retailerAlias.create({
      data: { retailerId: retailerIds[a.retailer]!, phrase: a.phrase, skuId: skuByCode[a.skuCode]!.id, hits: a.hits, createdFrom: 'DESK_CORRECTION' },
    });
  }

  return { orders: counter, skus: Object.keys(skuByCode).length, retailers: RETAILERS.length };
}

const isMain = process.argv[1]?.endsWith('seed.ts');
if (isMain) {
  seed()
    .then((r) => console.log('Seeded', r))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
