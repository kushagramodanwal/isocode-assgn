// Fictional seed catalogue. Brand names, shops and phone numbers are invented.
// GST rates are placeholders to verify with the client (A-02), not tax advice.

export type SeedSku = {
  code: string;
  packLabel: string;
  packGrams: number;
  unitsPerCase: number;
  unitPricePaise: number;
  stockCases: number;
  allowPieces?: boolean;
  premiumPricePaise?: number; // TierPrice for PREMIUM retailers (A-09)
};

export type SeedProduct = {
  key: string;
  brand: string;
  name: string;
  nameHi: string;
  category: 'Biscuits' | 'Noodles' | 'Sauces' | 'Tea' | 'Staples' | 'Laundry' | 'Dishwash' | 'Cleaning' | 'Personal care';
  image: string;
  gstRateBps: number;
  skus: SeedSku[];
};

export const BRANDS = ['Rewa Foods', 'Satpura Staples', 'Shwet Home Care', 'Kanha Hygiene'] as const;

export const PRODUCTS: SeedProduct[] = [
  // ---- Rewa Foods (food)
  {
    key: 'biscuit', brand: 'Rewa Foods', name: 'Glucose Biscuit', nameHi: 'ग्लूकोज़ बिस्कुट', category: 'Biscuits',
    image: '/img/biscuit.svg', gstRateBps: 500,
    skus: [
      // From the brief: ₹8.10/unit × 96 = ₹777.60/case. Stock 340 (pricing test case).
      { code: 'SKU-BS-075', packLabel: '75 g', packGrams: 75, unitsPerCase: 96, unitPricePaise: 810, stockCases: 340 },
      { code: 'SKU-BS-150', packLabel: '150 g', packGrams: 150, unitsPerCase: 60, unitPricePaise: 1580, stockCases: 120, premiumPricePaise: 1550 },
      { code: 'SKU-BS-300', packLabel: '300 g', packGrams: 300, unitsPerCase: 30, unitPricePaise: 3050, stockCases: 6 },
    ],
  },
  {
    key: 'cream-biscuit', brand: 'Rewa Foods', name: 'Cream Biscuit', nameHi: 'क्रीम बिस्कुट', category: 'Biscuits',
    image: '/img/cream-biscuit.svg', gstRateBps: 500,
    skus: [
      { code: 'SKU-CB-060', packLabel: '60 g', packGrams: 60, unitsPerCase: 120, unitPricePaise: 900, stockCases: 80 },
      { code: 'SKU-CB-120', packLabel: '120 g', packGrams: 120, unitsPerCase: 60, unitPricePaise: 1750, stockCases: 45 },
    ],
  },
  {
    key: 'noodles', brand: 'Rewa Foods', name: 'Masala Noodles', nameHi: 'मसाला नूडल्स', category: 'Noodles',
    image: '/img/noodles.svg', gstRateBps: 500,
    skus: [
      { code: 'SKU-ND-070', packLabel: '70 g', packGrams: 70, unitsPerCase: 96, unitPricePaise: 1150, stockCases: 150, allowPieces: true },
      { code: 'SKU-ND-280', packLabel: '280 g (4-pack)', packGrams: 280, unitsPerCase: 24, unitPricePaise: 4400, stockCases: 40, premiumPricePaise: 4300 },
    ],
  },
  {
    key: 'ketchup', brand: 'Rewa Foods', name: 'Tomato Ketchup', nameHi: 'टमाटर केचप', category: 'Sauces',
    image: '/img/ketchup.svg', gstRateBps: 500,
    skus: [
      { code: 'SKU-KT-200', packLabel: '200 g', packGrams: 200, unitsPerCase: 48, unitPricePaise: 4200, stockCases: 30 },
      { code: 'SKU-KT-500', packLabel: '500 g', packGrams: 500, unitsPerCase: 24, unitPricePaise: 9800, stockCases: 25 },
      { code: 'SKU-KT-1KG', packLabel: '1 kg', packGrams: 1000, unitsPerCase: 12, unitPricePaise: 17500, stockCases: 0 },
    ],
  },
  // ---- Satpura Staples (food)
  {
    key: 'tea', brand: 'Satpura Staples', name: 'Chai Patti (Tea)', nameHi: 'चाय पत्ती', category: 'Tea',
    image: '/img/tea.svg', gstRateBps: 500,
    skus: [
      { code: 'SKU-TE-100', packLabel: '100 g', packGrams: 100, unitsPerCase: 100, unitPricePaise: 4900, stockCases: 4 },
      // From the brief: ₹118.00/unit × 40 = ₹4,720.00/case, out of stock.
      { code: 'SKU-TE-250', packLabel: '250 g', packGrams: 250, unitsPerCase: 40, unitPricePaise: 11800, stockCases: 0 },
      { code: 'SKU-TE-500', packLabel: '500 g', packGrams: 500, unitsPerCase: 20, unitPricePaise: 23200, stockCases: 35, premiumPricePaise: 22800 },
    ],
  },
  {
    key: 'salt', brand: 'Satpura Staples', name: 'Iodised Salt', nameHi: 'आयोडीन नमक', category: 'Staples',
    image: '/img/salt.svg', gstRateBps: 0,
    skus: [
      { code: 'SKU-SL-500', packLabel: '500 g', packGrams: 500, unitsPerCase: 50, unitPricePaise: 1300, stockCases: 90 },
      { code: 'SKU-SL-1KG', packLabel: '1 kg', packGrams: 1000, unitsPerCase: 25, unitPricePaise: 2400, stockCases: 140 },
    ],
  },
  {
    key: 'poha', brand: 'Satpura Staples', name: 'Poha', nameHi: 'पोहा', category: 'Staples',
    image: '/img/poha.svg', gstRateBps: 500,
    skus: [
      { code: 'SKU-PH-500', packLabel: '500 g', packGrams: 500, unitsPerCase: 40, unitPricePaise: 3100, stockCases: 60 },
      { code: 'SKU-PH-1KG', packLabel: '1 kg', packGrams: 1000, unitsPerCase: 20, unitPricePaise: 5900, stockCases: 50 },
    ],
  },
  {
    key: 'haldi', brand: 'Satpura Staples', name: 'Haldi Powder', nameHi: 'हल्दी पाउडर', category: 'Staples',
    image: '/img/haldi.svg', gstRateBps: 500,
    skus: [
      { code: 'SKU-HL-100', packLabel: '100 g', packGrams: 100, unitsPerCase: 100, unitPricePaise: 2600, stockCases: 30 },
      { code: 'SKU-HL-200', packLabel: '200 g', packGrams: 200, unitsPerCase: 50, unitPricePaise: 5000, stockCases: 18 },
    ],
  },
  // ---- Shwet Home Care (home care)
  {
    key: 'detergent', brand: 'Shwet Home Care', name: 'Detergent Powder', nameHi: 'डिटर्जेंट पाउडर', category: 'Laundry',
    image: '/img/detergent.svg', gstRateBps: 1800,
    skus: [
      { code: 'SKU-DT-500', packLabel: '500 g', packGrams: 500, unitsPerCase: 40, unitPricePaise: 5300, stockCases: 70 },
      // From the brief: ₹101.50/unit × 20 = ₹2,030.00/case.
      { code: 'SKU-DT-1KG', packLabel: '1 kg', packGrams: 1000, unitsPerCase: 20, unitPricePaise: 10150, stockCases: 200 },
      { code: 'SKU-DT-2KG', packLabel: '2 kg', packGrams: 2000, unitsPerCase: 10, unitPricePaise: 19800, stockCases: 40, premiumPricePaise: 19400 },
    ],
  },
  {
    key: 'dishwash', brand: 'Shwet Home Care', name: 'Dishwash Bar', nameHi: 'बर्तन साबुन', category: 'Dishwash',
    image: '/img/dishwash.svg', gstRateBps: 1800,
    skus: [
      { code: 'SKU-DW-200', packLabel: '200 g', packGrams: 200, unitsPerCase: 72, unitPricePaise: 1800, stockCases: 85, allowPieces: true },
      { code: 'SKU-DW-500', packLabel: '500 g', packGrams: 500, unitsPerCase: 36, unitPricePaise: 4300, stockCases: 22 },
    ],
  },
  {
    key: 'dish-liquid', brand: 'Shwet Home Care', name: 'Dishwash Liquid', nameHi: 'बर्तन धोने का लिक्विड', category: 'Dishwash',
    image: '/img/dish-liquid.svg', gstRateBps: 1800,
    skus: [
      { code: 'SKU-DL-250', packLabel: '250 ml', packGrams: 250, unitsPerCase: 48, unitPricePaise: 4500, stockCases: 30 },
      { code: 'SKU-DL-500', packLabel: '500 ml', packGrams: 500, unitsPerCase: 24, unitPricePaise: 8600, stockCases: 12 },
    ],
  },
  {
    key: 'floor', brand: 'Shwet Home Care', name: 'Floor Cleaner', nameHi: 'फ़र्श क्लीनर', category: 'Cleaning',
    image: '/img/floor.svg', gstRateBps: 1800,
    skus: [
      { code: 'SKU-FC-500', packLabel: '500 ml', packGrams: 500, unitsPerCase: 24, unitPricePaise: 8200, stockCases: 20 },
      { code: 'SKU-FC-1L', packLabel: '1 L', packGrams: 1000, unitsPerCase: 12, unitPricePaise: 15600, stockCases: 9 },
    ],
  },
  // ---- Kanha Hygiene (home care)
  {
    key: 'soap', brand: 'Kanha Hygiene', name: 'Neem Bath Soap', nameHi: 'नीम साबुन', category: 'Personal care',
    image: '/img/soap.svg', gstRateBps: 1800,
    skus: [
      { code: 'SKU-NS-075', packLabel: '75 g', packGrams: 75, unitsPerCase: 144, unitPricePaise: 2100, stockCases: 60, allowPieces: true },
      { code: 'SKU-NS-125', packLabel: '125 g', packGrams: 125, unitsPerCase: 72, unitPricePaise: 3300, stockCases: 40 },
    ],
  },
  {
    key: 'sandal-soap', brand: 'Kanha Hygiene', name: 'Sandal Bath Soap', nameHi: 'चंदन साबुन', category: 'Personal care',
    image: '/img/sandal-soap.svg', gstRateBps: 1800,
    skus: [
      { code: 'SKU-SS-100', packLabel: '100 g', packGrams: 100, unitsPerCase: 96, unitPricePaise: 3200, stockCases: 35 },
      { code: 'SKU-SS-150', packLabel: '150 g', packGrams: 150, unitsPerCase: 72, unitPricePaise: 4600, stockCases: 15 },
    ],
  },
  {
    key: 'detergent-bar', brand: 'Kanha Hygiene', name: 'Detergent Bar', nameHi: 'कपड़े धोने का साबुन', category: 'Laundry',
    image: '/img/detergent-bar.svg', gstRateBps: 1800,
    skus: [{ code: 'SKU-DB-250', packLabel: '250 g', packGrams: 250, unitsPerCase: 60, unitPricePaise: 2200, stockCases: 75 }],
  },
  {
    key: 'toilet', brand: 'Kanha Hygiene', name: 'Toilet Cleaner', nameHi: 'टॉयलेट क्लीनर', category: 'Cleaning',
    image: '/img/toilet.svg', gstRateBps: 1800,
    skus: [{ code: 'SKU-TC-500', packLabel: '500 ml', packGrams: 500, unitsPerCase: 24, unitPricePaise: 8900, stockCases: 28 }],
  },
  {
    key: 'handwash', brand: 'Kanha Hygiene', name: 'Hand Wash', nameHi: 'हैंड वॉश', category: 'Personal care',
    image: '/img/handwash.svg', gstRateBps: 1800,
    skus: [{ code: 'SKU-HW-200', packLabel: '200 ml', packGrams: 200, unitsPerCase: 48, unitPricePaise: 6200, stockCases: 3 }],
  },
  {
    key: 'toothpowder', brand: 'Kanha Hygiene', name: 'Herbal Tooth Powder', nameHi: 'हर्बल दंत मंजन', category: 'Personal care',
    image: '/img/toothpowder.svg', gstRateBps: 1800,
    skus: [{ code: 'SKU-TP-100', packLabel: '100 g', packGrams: 100, unitsPerCase: 120, unitPricePaise: 3500, stockCases: 26 }],
  },
];

export type SeedScheme = {
  skuCode: string;
  type: 'FREE_GOODS' | 'SLAB_DISCOUNT';
  params: { buy: number; get: number } | { minCases: number; discountBps: number };
  /** Days relative to "now" at seed time. */
  fromDays: number;
  toDays: number;
  segment?: string;
  labelEn: string;
  labelHi: string;
};

export const SCHEMES: SeedScheme[] = [
  { skuCode: 'SKU-BS-075', type: 'FREE_GOODS', params: { buy: 10, get: 1 }, fromDays: -30, toDays: 60, labelEn: '10+1 free', labelHi: '10+1 मुफ़्त' },
  { skuCode: 'SKU-DT-1KG', type: 'SLAB_DISCOUNT', params: { minCases: 5, discountBps: 300 }, fromDays: -30, toDays: 60, labelEn: '3% off on 5+', labelHi: '5+ पर 3% छूट' },
  { skuCode: 'SKU-ND-070', type: 'FREE_GOODS', params: { buy: 20, get: 2 }, fromDays: -10, toDays: 45, labelEn: '20+2 free', labelHi: '20+2 मुफ़्त' },
  { skuCode: 'SKU-NS-075', type: 'SLAB_DISCOUNT', params: { minCases: 3, discountBps: 500 }, fromDays: -5, toDays: 30, labelEn: '5% off on 3+', labelHi: '3+ पर 5% छूट' },
  // Expired yesterday — must never apply.
  { skuCode: 'SKU-TE-500', type: 'SLAB_DISCOUNT', params: { minCases: 2, discountBps: 400 }, fromDays: -40, toDays: -1, labelEn: '4% off on 2+', labelHi: '2+ पर 4% छूट' },
  // Segment-specific: only URBAN shops.
  { skuCode: 'SKU-KT-500', type: 'FREE_GOODS', params: { buy: 5, get: 1 }, fromDays: -15, toDays: 30, segment: 'URBAN', labelEn: '5+1 free (city shops)', labelHi: '5+1 मुफ़्त (शहरी दुकानें)' },
];
