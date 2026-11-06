/**
 * Fictional catalogue for "Company A", Jabalpur. Brands and products are invented.
 * The first three SKUs (SKU-BS-075, SKU-DT-1KG, SKU-TE-250) are exactly the brief's sample data.
 * Dealer price is per pack, excluding GST (assumption A-01, A-02).
 * GST rates are placeholders to be confirmed by the client's accountant (A-03).
 */
export type ArtKind = "biscuit" | "box" | "pouch" | "bar" | "bottle" | "jar" | "noodles" | "tea";

export type SeedProduct = {
  code: string;
  name: string;
  nameHi: string;
  brand: string;
  category: "food" | "home";
  packLabel: string;
  unitsPerCase: number;
  unitPrice: number; // rupees per pack
  gstPct: number;
  stockCases: number;
  art: ArtKind;
  keywords: string[];
};

export const BRANDS = ["Rewa Foods", "Satpura Tea", "Shuddh Home Care", "Madhuban Kitchen"] as const;

export const PRODUCTS: SeedProduct[] = [
  // ── From the brief ────────────────────────────────────────────
  {
    code: "SKU-BS-075", name: "Glucose biscuit", nameHi: "ग्लूकोज़ बिस्किट", brand: "Rewa Foods", category: "food",
    packLabel: "75 g", unitsPerCase: 96, unitPrice: 8.1, gstPct: 5, stockCases: 340, art: "biscuit",
    keywords: ["biscuit", "biskut", "biskit", "glucose", "chhota", "chota", "small", "बिस्कुट", "छोटा"],
  },
  {
    code: "SKU-DT-1KG", name: "Detergent powder", nameHi: "डिटर्जेंट पाउडर", brand: "Shuddh Home Care", category: "home",
    packLabel: "1 kg", unitsPerCase: 20, unitPrice: 101.5, gstPct: 18, stockCases: 85, art: "box",
    keywords: ["detergent", "washing powder", "kapde ka powder", "sarf", "powder", "सर्फ", "वाशिंग पाउडर"],
  },
  {
    code: "SKU-TE-250", name: "Tea leaf", nameHi: "चाय पत्ती", brand: "Satpura Tea", category: "food",
    packLabel: "250 g", unitsPerCase: 40, unitPrice: 118, gstPct: 5, stockCases: 0, art: "tea",
    keywords: ["tea", "chai", "chai patti", "chaipatti", "patti", "chay", "चाय", "पत्ती"],
  },
  // ── Rest of the range ─────────────────────────────────────────
  {
    code: "SKU-BS-200", name: "Glucose biscuit", nameHi: "ग्लूकोज़ बिस्किट", brand: "Rewa Foods", category: "food",
    packLabel: "200 g", unitsPerCase: 48, unitPrice: 21.6, gstPct: 5, stockCases: 120, art: "biscuit",
    keywords: ["biscuit", "biskut", "glucose", "bada", "bara", "big", "family", "बड़ा"],
  },
  {
    code: "SKU-CB-100", name: "Chocolate cream biscuit", nameHi: "चॉकलेट क्रीम बिस्किट", brand: "Rewa Foods", category: "food",
    packLabel: "100 g", unitsPerCase: 60, unitPrice: 18, gstPct: 5, stockCases: 210, art: "biscuit",
    keywords: ["cream biscuit", "cream", "chocolate", "choco", "क्रीम"],
  },
  {
    code: "SKU-NK-200", name: "Aloo bhujia", nameHi: "आलू भुजिया", brand: "Rewa Foods", category: "food",
    packLabel: "200 g", unitsPerCase: 40, unitPrice: 38, gstPct: 5, stockCases: 90, art: "pouch",
    keywords: ["bhujia", "namkeen", "sev", "aloo", "नमकीन", "भुजिया"],
  },
  {
    code: "SKU-ND-070", name: "Masala noodles", nameHi: "मसाला नूडल्स", brand: "Rewa Foods", category: "food",
    packLabel: "70 g", unitsPerCase: 96, unitPrice: 11.2, gstPct: 5, stockCases: 260, art: "noodles",
    keywords: ["noodles", "noodle", "nudals", "chowmein", "नूडल्स"],
  },
  {
    code: "SKU-TE-500", name: "Tea leaf", nameHi: "चाय पत्ती", brand: "Satpura Tea", category: "food",
    packLabel: "500 g", unitsPerCase: 24, unitPrice: 228, gstPct: 5, stockCases: 64, art: "tea",
    keywords: ["tea", "chai", "chai patti", "chaipatti", "patti", "bada", "चाय", "पत्ती"],
  },
  {
    code: "SKU-TD-1KG", name: "Tea dust", nameHi: "चाय डस्ट", brand: "Satpura Tea", category: "food",
    packLabel: "1 kg", unitsPerCase: 12, unitPrice: 420, gstPct: 5, stockCases: 30, art: "tea",
    keywords: ["tea dust", "dust", "chai", "chura", "चाय"],
  },
  {
    code: "SKU-SL-1KG", name: "Iodised salt", nameHi: "आयोडीन नमक", brand: "Madhuban Kitchen", category: "food",
    packLabel: "1 kg", unitsPerCase: 25, unitPrice: 18.5, gstPct: 0, stockCases: 400, art: "pouch",
    keywords: ["salt", "namak", "noon", "नमक"],
  },
  {
    code: "SKU-HL-100", name: "Haldi powder", nameHi: "हल्दी पाउडर", brand: "Madhuban Kitchen", category: "food",
    packLabel: "100 g", unitsPerCase: 100, unitPrice: 24, gstPct: 5, stockCases: 75, art: "pouch",
    keywords: ["haldi", "turmeric", "हल्दी"],
  },
  {
    code: "SKU-KT-500", name: "Tomato ketchup", nameHi: "टोमैटो केचप", brand: "Madhuban Kitchen", category: "food",
    packLabel: "500 g", unitsPerCase: 24, unitPrice: 72, gstPct: 5, stockCases: 48, art: "bottle",
    keywords: ["ketchup", "sauce", "tomato", "chatni", "सॉस", "केचप"],
  },
  {
    code: "SKU-PH-500", name: "Thick poha", nameHi: "मोटा पोहा", brand: "Madhuban Kitchen", category: "food",
    packLabel: "500 g", unitsPerCase: 40, unitPrice: 27, gstPct: 5, stockCases: 150, art: "pouch",
    keywords: ["poha", "chivda", "पोहा"],
  },
  {
    code: "SKU-DT-500", name: "Detergent powder", nameHi: "डिटर्जेंट पाउडर", brand: "Shuddh Home Care", category: "home",
    packLabel: "500 g", unitsPerCase: 40, unitPrice: 52, gstPct: 18, stockCases: 140, art: "box",
    keywords: ["detergent", "washing powder", "sarf", "powder", "chhota", "सर्फ"],
  },
  {
    code: "SKU-DB-150", name: "Detergent bar", nameHi: "कपड़े धोने का साबुन", brand: "Shuddh Home Care", category: "home",
    packLabel: "150 g", unitsPerCase: 75, unitPrice: 9.5, gstPct: 18, stockCases: 300, art: "bar",
    keywords: ["washing bar", "kapde ka sabun", "tikiya", "bar", "sabun", "साबुन"],
  },
  {
    code: "SKU-DW-200", name: "Dishwash bar", nameHi: "बर्तन साबुन", brand: "Shuddh Home Care", category: "home",
    packLabel: "200 g", unitsPerCase: 60, unitPrice: 17, gstPct: 18, stockCases: 180, art: "bar",
    keywords: ["dishwash", "bartan", "bartan sabun", "बर्तन"],
  },
  {
    code: "SKU-DL-250", name: "Dishwash liquid", nameHi: "बर्तन धोने का लिक्विड", brand: "Shuddh Home Care", category: "home",
    packLabel: "250 ml", unitsPerCase: 48, unitPrice: 45, gstPct: 18, stockCases: 60, art: "bottle",
    keywords: ["dishwash liquid", "liquid", "gel", "bartan", "लिक्विड"],
  },
  {
    code: "SKU-FC-1L", name: "Floor cleaner", nameHi: "फ़र्श क्लीनर", brand: "Shuddh Home Care", category: "home",
    packLabel: "1 L", unitsPerCase: 12, unitPrice: 89, gstPct: 18, stockCases: 8, art: "bottle",
    keywords: ["floor cleaner", "phenyl", "fenyl", "pocha", "फिनाइल"],
  },
  {
    code: "SKU-TC-500", name: "Toilet cleaner", nameHi: "टॉयलेट क्लीनर", brand: "Shuddh Home Care", category: "home",
    packLabel: "500 ml", unitsPerCase: 24, unitPrice: 78, gstPct: 18, stockCases: 44, art: "bottle",
    keywords: ["toilet cleaner", "toilet", "acid", "टॉयलेट"],
  },
  {
    code: "SKU-SP-100", name: "Neem bath soap", nameHi: "नीम साबुन", brand: "Shuddh Home Care", category: "home",
    packLabel: "100 g", unitsPerCase: 72, unitPrice: 24, gstPct: 18, stockCases: 220, art: "bar",
    keywords: ["soap", "neem", "nahane ka sabun", "sabun", "साबुन", "नीम"],
  },
  {
    code: "SKU-HW-200", name: "Handwash", nameHi: "हैंडवॉश", brand: "Shuddh Home Care", category: "home",
    packLabel: "200 ml", unitsPerCase: 36, unitPrice: 55, gstPct: 18, stockCases: 52, art: "bottle",
    keywords: ["handwash", "hand wash", "liquid soap", "हैंडवॉश"],
  },
];

/** Schemes valid for the whole demo quarter. */
export const SCHEMES: Array<
  | { code: string; type: "FREE_GOODS"; buyCases: number; freeCases: number }
  | { code: string; type: "SLAB_DISCOUNT"; slabs: { minCases: number; percentBp: number }[] }
> = [
  { code: "SKU-BS-075", type: "FREE_GOODS", buyCases: 10, freeCases: 1 }, // brief
  { code: "SKU-DT-1KG", type: "SLAB_DISCOUNT", slabs: [{ minCases: 5, percentBp: 300 }] }, // brief
  { code: "SKU-ND-070", type: "SLAB_DISCOUNT", slabs: [{ minCases: 10, percentBp: 200 }] },
  { code: "SKU-TE-500", type: "FREE_GOODS", buyCases: 6, freeCases: 1 },
  { code: "SKU-DB-150", type: "FREE_GOODS", buyCases: 20, freeCases: 1 },
  { code: "SKU-SP-100", type: "SLAB_DISCOUNT", slabs: [{ minCases: 5, percentBp: 300 }, { minCases: 10, percentBp: 500 }] },
  { code: "SKU-CB-100", type: "FREE_GOODS", buyCases: 12, freeCases: 1 },
];
