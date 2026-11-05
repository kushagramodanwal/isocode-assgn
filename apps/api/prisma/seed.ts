import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FMCG Retailer Database...');

  // 1. Retailers (10 to 12 kirana shops in Jabalpur)
  const retailersData = [
    { code: 'RET-JBP-001', name: 'Ramesh Kirana Store (Wright Town)', creditLimitPaise: 5000000n }, // ₹50,000
    { code: 'RET-JBP-002', name: 'Gupta General Store (Napier Town)', creditLimitPaise: 10000000n }, // ₹1,00,000
    { code: 'RET-JBP-003', name: 'Shreeji Provisions (Gorakhpur)', creditLimitPaise: 100000n }, // ₹1,000 (near limit to trigger hold)
    { code: 'RET-JBP-004', name: 'Patel Daily Needs (Madan Mahal)', creditLimitPaise: 7500000n },
    { code: 'RET-JBP-005', name: 'Maha Laxmi Supermart (Civil Lines)', creditLimitPaise: 15000000n },
    { code: 'RET-JBP-006', name: 'Krishna Store (Sadar Bazar)', creditLimitPaise: 4000000n },
    { code: 'RET-JBP-007', name: 'Vijay Traders (Adhartal)', creditLimitPaise: 6000000n },
    { code: 'RET-JBP-008', name: 'Sharma Kirana (Garha)', creditLimitPaise: 3000000n },
    { code: 'RET-JBP-009', name: 'Jabalpur Mart (Lordganj)', creditLimitPaise: 12000000n },
    { code: 'RET-JBP-010', name: 'Agrawal Brothers (Ganjipura)', creditLimitPaise: 8000000n },
  ];

  const retailers: Record<string, any> = {};
  for (const r of retailersData) {
    const ret = await prisma.retailer.upsert({
      where: { code: r.code },
      update: { name: r.name, creditLimitPaise: r.creditLimitPaise },
      create: r,
    });
    retailers[r.code] = ret;
  }

  // 2. Users (Desk & Retailers)
  const usersData = [
    // Desk users
    { phone: '+910000000099', role: 'desk', retailerId: null },
    { phone: '+910000000098', role: 'desk', retailerId: null },
    // Retailer users
    { phone: '+910000000001', role: 'retailer', retailerId: retailers['RET-JBP-001'].id },
    { phone: '+910000000002', role: 'retailer', retailerId: retailers['RET-JBP-002'].id },
    { phone: '+910000000003', role: 'retailer', retailerId: retailers['RET-JBP-003'].id },
    { phone: '+910000000004', role: 'retailer', retailerId: retailers['RET-JBP-004'].id },
    { phone: '+910000000005', role: 'retailer', retailerId: retailers['RET-JBP-005'].id },
    { phone: '+910000000006', role: 'retailer', retailerId: retailers['RET-JBP-006'].id },
    { phone: '+910000000007', role: 'retailer', retailerId: retailers['RET-JBP-007'].id },
    { phone: '+910000000008', role: 'retailer', retailerId: retailers['RET-JBP-008'].id },
    { phone: '+910000000009', role: 'retailer', retailerId: retailers['RET-JBP-009'].id },
    { phone: '+910000000010', role: 'retailer', retailerId: retailers['RET-JBP-010'].id },
  ];

  const users: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { phone: u.phone },
      update: { role: u.role, retailerId: u.retailerId },
      create: u,
    });
    users[u.phone] = user;
  }

  // 3. SKUs (22 SKUs across Biscuits, Detergent, Tea, and Home Care)
  // Must include sample SKUs: SKU-BS-075, SKU-DT-1KG, SKU-TE-250
  const skusData = [
    // Biscuits
    { code: 'SKU-BS-075', name: 'Parle-G Glucose Biscuit (Small 75g pack, 48 units/case)', brand: 'Parle', stock: 150, listPricePaise: 48000n }, // ₹480/case
    { code: 'SKU-BS-250', name: 'Parle-G Family Pack 250g (24 units/case)', brand: 'Parle', stock: 80, listPricePaise: 60000n },
    { code: 'SKU-BS-M20', name: 'Britannia Marie Gold 200g (30 units/case)', brand: 'Britannia', stock: 45, listPricePaise: 90000n },
    { code: 'SKU-BS-GD1', name: 'Good Day Butter Cookies 100g (40 units/case)', brand: 'Britannia', stock: 12, listPricePaise: 80000n }, // Low stock (<20)
    { code: 'SKU-BS-BOU', name: 'Bourbon Chocolate Sandwich 120g (36 units/case)', brand: 'Britannia', stock: 25, listPricePaise: 108000n },

    // Detergent & Cleaning
    { code: 'SKU-DT-1KG', name: 'Surf Excel Quick Wash 1kg (12 units/case)', brand: 'Hindustan Unilever', stock: 65, listPricePaise: 10150n }, // ₹101.50/case sample spec
    { code: 'SKU-DT-500', name: 'Surf Excel Easy Wash 500g (24 units/case)', brand: 'Hindustan Unilever', stock: 40, listPricePaise: 120000n },
    { code: 'SKU-DT-TL1', name: 'Tide Plus Double Power 1kg (12 units/case)', brand: 'P&G', stock: 95, listPricePaise: 135000n },
    { code: 'SKU-DT-RN2', name: 'Rin Bar 250g (48 units/case)', brand: 'Hindustan Unilever', stock: 110, listPricePaise: 96000n },
    { code: 'SKU-DT-WH1', name: 'Wheel Active 2-in-1 Powder 1kg (16 units/case)', brand: 'Hindustan Unilever', stock: 18, listPricePaise: 88000n }, // Low stock (<20)

    // Tea & Beverages
    { code: 'SKU-TE-250', name: 'Tata Tea Gold Leaf 250g (20 units/case)', brand: 'Tata Tea', stock: 0, listPricePaise: 250000n }, // Exactly 0 on-hand (Spec 7)
    { code: 'SKU-TE-500', name: 'Tata Tea Premium 500g (16 units/case)', brand: 'Tata Tea', stock: 35, listPricePaise: 320000n },
    { code: 'SKU-TE-RED', name: 'Red Label Natural Care 250g (24 units/case)', brand: 'Brooke Bond', stock: 0, listPricePaise: 290000n }, // Out of stock (0 cases)
    { code: 'SKU-TE-TAJ', name: 'Taj Mahal Gourmet Tea 250g (12 units/case)', brand: 'Brooke Bond', stock: 8, listPricePaise: 210000n }, // Low stock (<20)
    { code: 'SKU-BV-BOO', name: 'Boost Energy Drink 500g (12 units/case)', brand: 'Hindustan Unilever', stock: 30, listPricePaise: 280000n },

    // Home Care & Hygiene
    { code: 'SKU-HC-LY1', name: 'Lizol Floor Cleaner Citrus 1L (12 units/case)', brand: 'Reckitt', stock: 50, listPricePaise: 198000n },
    { code: 'SKU-HC-HP5', name: 'Harpic Power Plus 500ml (24 units/case)', brand: 'Reckitt', stock: 70, listPricePaise: 216000n },
    { code: 'SKU-HC-CLO', name: 'Colin Glass Cleaner 500ml (20 units/case)', brand: 'Reckitt', stock: 45, listPricePaise: 180000n },
    { code: 'SKU-HC-VIM', name: 'Vim Dishwash Gel 750ml (16 units/case)', brand: 'Hindustan Unilever', stock: 85, listPricePaise: 176000n },
    { code: 'SKU-HC-OD1', name: 'Odonil Bathroom Air Freshener 50g (40 units/case)', brand: 'Dabur', stock: 100, listPricePaise: 160000n },
    { code: 'SKU-HC-DET', name: 'Dettol Antiseptic Liquid 550ml (12 units/case)', brand: 'Reckitt', stock: 15, listPricePaise: 240000n }, // Low stock (<20)
    { code: 'SKU-HC-PRL', name: 'Pril Lime Dishwashing Liquid 425ml (18 units/case)', brand: 'Jyothy Labs', stock: 60, listPricePaise: 155000n },
  ];

  const now = new Date();
  const futureYear = new Date(now.getFullYear() + 1, 11, 31);
  const pastYear = new Date(now.getFullYear() - 1, 0, 1);

  const skus: Record<string, any> = {};
  for (const s of skusData) {
    const sku = await prisma.sku.upsert({
      where: { code: s.code },
      update: { name: s.name, brand: s.brand },
      create: {
        code: s.code,
        name: s.name,
        brand: s.brand,
      },
    });
    skus[s.code] = sku;

    // Stock
    await prisma.stock.upsert({
      where: { skuId: sku.id },
      update: { onHandCases: s.stock },
      create: {
        skuId: sku.id,
        onHandCases: s.stock,
      },
    });

    // List Price
    await prisma.price.deleteMany({
      where: { skuId: sku.id, retailerId: null },
    });
    await prisma.price.create({
      data: {
        skuId: sku.id,
        retailerId: null,
        pricePaise: s.listPricePaise,
        gstInclusive: true,
        validFrom: pastYear,
        validTo: futureYear,
      },
    });
  }

  // 4. Retailer-specific prices for 3 retailers
  const r1 = retailers['RET-JBP-001'].id;
  const r2 = retailers['RET-JBP-002'].id;
  const r3 = retailers['RET-JBP-003'].id;

  // Discounted price for Ramesh Kirana on Parle-G: ₹450 instead of ₹480
  await prisma.price.deleteMany({ where: { skuId: skus['SKU-BS-075'].id, retailerId: r1 } });
  await prisma.price.create({
    data: {
      skuId: skus['SKU-BS-075'].id,
      retailerId: r1,
      pricePaise: 45000n,
      gstInclusive: true,
      validFrom: pastYear,
      validTo: futureYear,
    },
  });

  // Special rate for Gupta General Store on Surf Excel 1kg: ₹9800n
  await prisma.price.deleteMany({ where: { skuId: skus['SKU-DT-1KG'].id, retailerId: r2 } });
  await prisma.price.create({
    data: {
      skuId: skus['SKU-DT-1KG'].id,
      retailerId: r2,
      pricePaise: 9800n,
      gstInclusive: true,
      validFrom: pastYear,
      validTo: futureYear,
    },
  });

  // 5. Schemes
  // Scheme 1: Buy 10 Get 1 Free on Parle-G (SKU-BS-075)
  await prisma.scheme.deleteMany({ where: { skuId: skus['SKU-BS-075'].id } });
  await prisma.scheme.create({
    data: {
      skuId: skus['SKU-BS-075'].id,
      type: 'buy_n_get_m',
      n: 10,
      m: 1,
      validFrom: pastYear,
      validTo: futureYear,
      active: true,
      retailerId: null,
    },
  });

  // Scheme 2: Slab Discount on Detergent 1kg (SKU-DT-1KG): 3% off on 5+ cases
  await prisma.scheme.deleteMany({ where: { skuId: skus['SKU-DT-1KG'].id } });
  await prisma.scheme.create({
    data: {
      skuId: skus['SKU-DT-1KG'].id,
      type: 'slab',
      minCases: 5,
      discountBps: 300, // 3%
      validFrom: pastYear,
      validTo: futureYear,
      active: true,
      retailerId: null,
    },
  });

  // Scheme 3: Exclusive retailer scheme for Gupta General Store (RET-JBP-002) on Harpic: Buy 5 get 1 free
  await prisma.scheme.deleteMany({ where: { skuId: skus['SKU-HC-HP5'].id, retailerId: r2 } });
  await prisma.scheme.create({
    data: {
      skuId: skus['SKU-HC-HP5'].id,
      type: 'buy_n_get_m',
      n: 5,
      m: 1,
      retailerId: r2,
      validFrom: pastYear,
      validTo: futureYear,
      active: true,
    },
  });

  // Scheme 4: Expired Scheme (Tata Tea Gold)
  await prisma.scheme.deleteMany({ where: { skuId: skus['SKU-TE-250'].id } });
  await prisma.scheme.create({
    data: {
      skuId: skus['SKU-TE-250'].id,
      type: 'slab',
      minCases: 10,
      discountBps: 500, // 5%
      validFrom: new Date(now.getFullYear() - 1, 0, 1),
      validTo: new Date(now.getFullYear() - 1, 6, 1), // expired
      active: false,
    },
  });

  // 6. Aliases (8 to 10 aliases, including "chhota" -> SKU-BS-075 for Ramesh Kirana only)
  await prisma.alias.deleteMany({});
  await prisma.alias.createMany({
    data: [
      { retailerId: r1, phraseNormalised: 'chhota', skuId: skus['SKU-BS-075'].id, active: true },
      { retailerId: r1, phraseNormalised: 'biscuit chhota', skuId: skus['SKU-BS-075'].id, active: true },
      { retailerId: r1, phraseNormalised: 'surf excel', skuId: skus['SKU-DT-1KG'].id, active: true },
      { retailerId: r2, phraseNormalised: 'chhota parle', skuId: skus['SKU-BS-075'].id, active: true },
      { retailerId: r2, phraseNormalised: 'tide powder', skuId: skus['SKU-DT-TL1'].id, active: true },
      { retailerId: r3, phraseNormalised: 'harpic blue', skuId: skus['SKU-HC-HP5'].id, active: true },
      { retailerId: r3, phraseNormalised: 'lizol yellow', skuId: skus['SKU-HC-LY1'].id, active: true },
      { retailerId: r1, phraseNormalised: 'gold tea', skuId: skus['SKU-TE-250'].id, active: true },
    ],
  });

  // 7. Seed historical orders (25 orders across mixed states)
  await prisma.orderLine.deleteMany({});
  await prisma.orderEvent.deleteMany({});
  await prisma.order.deleteMany({});

  const sampleStatuses = [
    'pending_desk',
    'pending_desk',
    'on_hold',
    'approved',
    'payment_failed',
    'pending_desk',
    'approved',
    'on_hold',
    'cancelled',
  ];

  for (let i = 1; i <= 20; i++) {
    const retKey = `RET-JBP-00${(i % 10) + 1}`;
    const ret = retailers[retKey] || retailers['RET-JBP-001'];
    const userPhone = `+9100000000${(i % 10) + 1 < 10 ? '0' + ((i % 10) + 1) : (i % 10) + 1}`;
    const user = users[userPhone] || users['+910000000001'];
    const st = sampleStatuses[i % sampleStatuses.length];

    const isOnline = i % 3 === 0;
    const paymentMode = isOnline ? 'online_mock' : 'credit_account';
    const paymentStatus = isOnline
      ? st === 'payment_failed'
        ? 'failed'
        : 'succeeded'
      : 'not_required';

    const orderNumber = `ORD-DEMO-${1000 + i}`;
    const orderTotal = 48000n * BigInt((i % 4) + 1);

    const ord = await prisma.order.create({
      data: {
        orderNumber,
        retailerId: ret.id,
        placedByUserId: user.id,
        status: st,
        version: 1,
        totalPaise: orderTotal,
        paymentMode,
        paymentStatus,
        paymentReference: isOnline ? `DEMO_PAY_REF_${i}` : null,
        holdReason: st === 'on_hold' ? 'Exceeds credit limit by ₹4,500.00' : null,
        idempotencyKey: `SEED_IDEM_${i}`,
        placedAt: new Date(Date.now() - i * 3600 * 1000 * 4),
      },
    });

    await prisma.orderLine.create({
      data: {
        orderId: ord.id,
        skuId: skus['SKU-BS-075'].id,
        billedCases: (i % 4) + 1,
        freeCases: i % 4 === 0 ? 1 : 0,
        unitPricePaise: 48000n,
        gstInclusive: true,
        discountPaise: 0n,
        lineTotalPaise: orderTotal,
        schemeExplanation: i % 4 === 0 ? 'Buy 10 Get 1 Free' : 'Standard price',
      },
    });

    await prisma.orderEvent.create({
      data: {
        orderId: ord.id,
        fromStatus: 'new',
        toStatus: st,
        actorUserId: user.id,
        note: `Seeded order created in state ${st}`,
      },
    });
  }

  // 8. Notifications
  await prisma.notification.deleteMany({});
  await prisma.notification.createMany({
    data: [
      {
        userId: users['+910000000001'].id,
        channel: 'sms_mock',
        template: 'otp_sent',
        body: 'Your login verification code has been sent to ••••0001.',
        status: 'sent',
        attempts: 1,
      },
      {
        userId: users['+910000000001'].id,
        channel: 'sms_mock',
        template: 'order_placed',
        body: 'Order ORD-DEMO-1001 placed. Total: ₹480.00. Payment: credit_account.',
        status: 'sent',
        attempts: 1,
      },
      {
        userId: users['+910000000001'].id,
        channel: 'sms_mock',
        template: 'order_approved',
        body: 'Order ORD-DEMO-1004 has been approved for dispatch.',
        status: 'sent',
        attempts: 1,
      },
      {
        userId: users['+910000000001'].id,
        channel: 'sms_mock',
        template: 'payment_failed',
        body: 'Payment failed for order ORD-DEMO-1005. Please choose another payment mode.',
        status: 'sent',
        attempts: 1,
      },
    ],
  });

  // 9. One Seeded Export Batch
  await prisma.exportBatch.deleteMany({});
  await prisma.exportBatch.create({
    data: {
      fileSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      orderCount: 3,
      totalPaise: 144000n,
      excluded: [],
      createdByUserId: users['+910000000099'].id,
    },
  });

  console.log('Seed completed successfully!');
  console.log('Demo Logins:');
  console.log('  Retailer: Phone = +910000000001, OTP = 123456');
  console.log('  Desk:     Phone = +910000000099, OTP = 123456');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
