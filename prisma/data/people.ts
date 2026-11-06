// All shops, people and phone numbers are fictional. 9000000xxx numbers are not allocated to real subscribers.

export const ROUTES = {
  R1: 'R1 Napier Town – Wright Town',
  R2: 'R2 Adhartal – Ranjhi',
  R3: 'R3 Garha – Madan Mahal',
} as const;

export type SeedRetailer = {
  key: string;
  shopName: string;
  ownerName: string;
  phone: string;
  area: string;
  route: string;
  segment: 'URBAN' | 'SEMI_URBAN';
  priceTier: 'STANDARD' | 'PREMIUM';
  creditLimitPaise: number;
  outstandingPaise: number;
  /** SKU codes this shop usually buys (drives order history). */
  favourites: string[];
  /** Days since last order; >14 makes them appear on the "no recent order" dashboard. */
  lastOrderDaysAgo: number;
};

const L = (rupees: number) => rupees * 100;

export const RETAILERS: SeedRetailer[] = [
  {
    key: 'r1', shopName: 'Gupta General Store', ownerName: 'Ramesh Gupta (fictional)', phone: '9000000001',
    area: 'Napier Town', route: ROUTES.R1, segment: 'URBAN', priceTier: 'STANDARD',
    creditLimitPaise: L(300000), outstandingPaise: L(42000),
    favourites: ['SKU-BS-075', 'SKU-DT-1KG', 'SKU-TE-250', 'SKU-NS-075', 'SKU-BS-150', 'SKU-SL-1KG'], lastOrderDaysAgo: 2,
  },
  {
    key: 'r2', shopName: 'Shree Ganesh Kirana', ownerName: 'Sunita Patel (fictional)', phone: '9000000002',
    area: 'Adhartal', route: ROUTES.R2, segment: 'SEMI_URBAN', priceTier: 'PREMIUM',
    // Near its limit: only ₹6,000 available.
    creditLimitPaise: L(100000), outstandingPaise: L(94000),
    favourites: ['SKU-DW-200', 'SKU-HL-100', 'SKU-TE-500', 'SKU-DT-2KG', 'SKU-ND-280'], lastOrderDaysAgo: 4,
  },
  {
    key: 'r3', shopName: 'Maa Narmada Traders', ownerName: 'Vikas Tiwari (fictional)', phone: '9000000003',
    area: 'Garha', route: ROUTES.R3, segment: 'SEMI_URBAN', priceTier: 'STANDARD',
    creditLimitPaise: L(150000), outstandingPaise: L(30000),
    favourites: ['SKU-BS-075', 'SKU-SL-1KG', 'SKU-DT-1KG', 'SKU-KT-200'], lastOrderDaysAgo: 3,
  },
  {
    key: 'r4', shopName: 'City Fresh Mart', ownerName: 'Anil Jain (fictional)', phone: '9000000004',
    area: 'Wright Town', route: ROUTES.R1, segment: 'URBAN', priceTier: 'PREMIUM',
    creditLimitPaise: L(500000), outstandingPaise: L(120000),
    favourites: ['SKU-DT-2KG', 'SKU-SL-1KG', 'SKU-KT-500', 'SKU-FC-1L', 'SKU-HW-200'], lastOrderDaysAgo: 1,
  },
  {
    key: 'r5', shopName: 'Sai Kirana Bhandar', ownerName: 'Pooja Yadav (fictional)', phone: '9000000005',
    area: 'Ranjhi', route: ROUTES.R2, segment: 'SEMI_URBAN', priceTier: 'STANDARD',
    creditLimitPaise: L(80000), outstandingPaise: L(20000),
    favourites: ['SKU-BS-075', 'SKU-DT-1KG', 'SKU-ND-070'], lastOrderDaysAgo: 6,
  },
  {
    key: 'r6', shopName: 'Verma Provision Store', ownerName: 'Deepak Verma (fictional)', phone: '9000000006',
    area: 'Madan Mahal', route: ROUTES.R3, segment: 'URBAN', priceTier: 'STANDARD',
    creditLimitPaise: L(120000), outstandingPaise: L(50000),
    favourites: ['SKU-BS-075', 'SKU-DT-500', 'SKU-CB-060', 'SKU-PH-500'], lastOrderDaysAgo: 5,
  },
  {
    key: 'r7', shopName: 'Bharat Daily Needs', ownerName: 'Imran Khan (fictional)', phone: '9000000007',
    area: 'Gorakhpur', route: ROUTES.R1, segment: 'URBAN', priceTier: 'STANDARD',
    // Over its limit: any new order goes to credit hold.
    creditLimitPaise: L(60000), outstandingPaise: L(64500),
    favourites: ['SKU-ND-070', 'SKU-KT-200', 'SKU-SS-100'], lastOrderDaysAgo: 7,
  },
  {
    key: 'r8', shopName: 'Laxmi Kirana', ownerName: 'Kavita Soni (fictional)', phone: '9000000008',
    area: 'Vijay Nagar', route: ROUTES.R2, segment: 'SEMI_URBAN', priceTier: 'STANDARD',
    creditLimitPaise: L(90000), outstandingPaise: L(10000),
    favourites: ['SKU-SL-500', 'SKU-DB-250', 'SKU-TE-100'], lastOrderDaysAgo: 18,
  },
  {
    key: 'r9', shopName: 'Rajesh Stores', ownerName: 'Rajesh Dubey (fictional)', phone: '9000000009',
    area: 'Garha', route: ROUTES.R3, segment: 'SEMI_URBAN', priceTier: 'STANDARD',
    creditLimitPaise: L(70000), outstandingPaise: L(15000),
    favourites: ['SKU-PH-1KG', 'SKU-TE-500', 'SKU-DW-500'], lastOrderDaysAgo: 25,
  },
  {
    key: 'r10', shopName: 'New Sharda Supermarket', ownerName: 'Neha Agrawal (fictional)', phone: '9000000010',
    area: 'Sadar', route: ROUTES.R1, segment: 'URBAN', priceTier: 'PREMIUM',
    creditLimitPaise: L(400000), outstandingPaise: L(90000),
    favourites: ['SKU-ND-070', 'SKU-NS-075', 'SKU-TP-100', 'SKU-DL-250', 'SKU-TC-500'], lastOrderDaysAgo: 2,
  },
];

export const DESK_USER = { phone: '9000000099', name: 'Meena (Order Desk)' };
export const SALESMAN_USER = { phone: '9000000050', name: 'Sanjay (Salesman)' };
/** Demo users who accept OTP 123456 when DEMO_MODE=true. */
export const DEMO_PHONES = ['9000000001', '9000000002', '9000000099', '9000000050'];

/** The sample message from the brief (reconstructed: 5 biscuit, 2 detergent, 1 tea). */
export const SAMPLE_MESSAGE =
  'Bhaiya 5 peti biscuit 75 wala, 2 carton surf 1 kilo aur 1 dabba chai patti 250 wala bhej dena';

export const MESSAGES: { retailer: string; text: string; hoursAgo: number }[] = [
  { retailer: 'r1', text: SAMPLE_MESSAGE, hoursAgo: 1 },
  { retailer: 'r3', text: '५ पेटी बिस्कुट ७५ वाला, २ कार्टन सर्फ़ १ किलो और ३ पेटी नमक', hoursAgo: 2 },
  { retailer: 'r4', text: 'Please send 3 cases Detergent Powder 2 kg and 4 cases Iodised Salt 1 kg', hoursAgo: 3 },
  { retailer: 'r5', text: '10 peti biskut 75 aur 6 carton sarf 1 kilo', hoursAgo: 4 },
  { retailer: 'r6', text: '5 biscuit, 2 surf', hoursAgo: 5 },
  { retailer: 'r7', text: 'noodles chhota peti, ketchup 200 wala 2 case', hoursAgo: 6 },
  { retailer: 'r8', text: '2 peti cold drink aur 3 peti biscuit 150 wala', hoursAgo: 8 },
  { retailer: 'r2', text: '8 peti dishwash bar 200 aur 4 peti haldi 100 wala', hoursAgo: 9 },
  { retailer: 'r9', text: 'ek peti chai 500 wala, do peti poha 1 kilo', hoursAgo: 20 },
  { retailer: 'r10', text: '20 peti noodles 70 wala, 3 carton neem sabun', hoursAgo: 22 },
  { retailer: 'r1', text: 'glucose 3 peti aur neem 2 peti', hoursAgo: 26 },
  { retailer: 'r3', text: '2 dabba ketchup bada, 1 peti floor cleaner', hoursAgo: 30 },
];

/** Pre-existing learned aliases for the demo retailer. */
export const ALIASES: { retailer: string; phrase: string; skuCode: string; hits: number }[] = [
  { retailer: 'r1', phrase: 'glucose', skuCode: 'SKU-BS-150', hits: 4 },
  { retailer: 'r1', phrase: 'neem', skuCode: 'SKU-NS-075', hits: 3 },
  { retailer: 'r1', phrase: 'lal ketchup', skuCode: 'SKU-KT-500', hits: 1 },
];
