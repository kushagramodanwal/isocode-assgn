/**
 * Fictional retailers and staff. Names, shops and phone numbers are invented.
 * Phone numbers use the 90000 000xx series so they can never reach a real person by accident.
 * Areas are Jabalpur localities, used only to group van routes.
 */
export type SeedRetailer = {
  code: string;
  shopName: string;
  ownerName: string;
  area: string;
  route: string;
  phone: string;
  creditLimit: number; // rupees
  outstanding: number; // rupees, as synced from Tally
  /** Days since last order; drives the "no order in 14 days" list. null = order often. */
  quietDays: number | null;
  lang: "en" | "hi";
};

const ROUTE_A = "Route A · Napier Town – Wright Town";
const ROUTE_B = "Route B · Adhartal – Ranjhi";
const ROUTE_C = "Route C · Garha – Gwarighat";
const ROUTE_D = "Route D · Sadar – Civil Lines";

export const RETAILERS: SeedRetailer[] = [
  { code: "JBP-R-0001", shopName: "Sharma General Store", ownerName: "Ramesh Sharma", area: "Napier Town", route: ROUTE_A, phone: "9000000001", creditLimit: 150000, outstanding: 42000, quietDays: null, lang: "hi" },
  { code: "JBP-R-0002", shopName: "Gupta Kirana", ownerName: "Sunita Gupta", area: "Wright Town", route: ROUTE_A, phone: "9000000002", creditLimit: 60000, outstanding: 57500, quietDays: null, lang: "en" },
  { code: "JBP-R-0003", shopName: "Jain Provision", ownerName: "Abhay Jain", area: "Napier Town", route: ROUTE_A, phone: "9000000003", creditLimit: 200000, outstanding: 88000, quietDays: null, lang: "en" },
  { code: "JBP-R-0004", shopName: "Patel Daily Needs", ownerName: "Kiran Patel", area: "Wright Town", route: ROUTE_A, phone: "9000000004", creditLimit: 80000, outstanding: 12000, quietDays: 19, lang: "hi" },
  { code: "JBP-R-0005", shopName: "Shree Ganesh Traders", ownerName: "Mohan Yadav", area: "Madan Mahal", route: ROUTE_A, phone: "9000000005", creditLimit: 100000, outstanding: 30500, quietDays: null, lang: "hi" },
  { code: "JBP-R-0006", shopName: "Ansari Store", ownerName: "Salim Ansari", area: "Adhartal", route: ROUTE_B, phone: "9000000006", creditLimit: 75000, outstanding: 21000, quietDays: null, lang: "hi" },
  { code: "JBP-R-0007", shopName: "Maa Durga Kirana", ownerName: "Pooja Thakur", area: "Ranjhi", route: ROUTE_B, phone: "9000000007", creditLimit: 50000, outstanding: 8000, quietDays: 26, lang: "hi" },
  { code: "JBP-R-0008", shopName: "Verma Brothers", ownerName: "Anil Verma", area: "Adhartal", route: ROUTE_B, phone: "9000000008", creditLimit: 120000, outstanding: 64000, quietDays: null, lang: "en" },
  { code: "JBP-R-0009", shopName: "New Bharat Stores", ownerName: "Deepak Soni", area: "Ranjhi", route: ROUTE_B, phone: "9000000009", creditLimit: 90000, outstanding: 15500, quietDays: 15, lang: "hi" },
  { code: "JBP-R-0010", shopName: "Agrawal Mart", ownerName: "Neha Agrawal", area: "Vijay Nagar", route: ROUTE_B, phone: "9000000010", creditLimit: 250000, outstanding: 110000, quietDays: null, lang: "en" },
  { code: "JBP-R-0011", shopName: "Kushwaha Kirana", ownerName: "Rajesh Kushwaha", area: "Garha", route: ROUTE_C, phone: "9000000011", creditLimit: 40000, outstanding: 9000, quietDays: null, lang: "hi" },
  { code: "JBP-R-0012", shopName: "Sai Ram Provision", ownerName: "Lata Mishra", area: "Gwarighat", route: ROUTE_C, phone: "9000000012", creditLimit: 70000, outstanding: 33000, quietDays: 41, lang: "hi" },
  { code: "JBP-R-0013", shopName: "Tiwari Store", ownerName: "Vinod Tiwari", area: "Garha", route: ROUTE_C, phone: "9000000013", creditLimit: 60000, outstanding: 18000, quietDays: null, lang: "hi" },
  { code: "JBP-R-0014", shopName: "Rajput General", ownerName: "Sanjay Rajput", area: "Gwarighat", route: ROUTE_C, phone: "9000000014", creditLimit: 85000, outstanding: 47000, quietDays: null, lang: "en" },
  { code: "JBP-R-0015", shopName: "Choudhary Kirana", ownerName: "Meera Choudhary", area: "Sadar", route: ROUTE_D, phone: "9000000015", creditLimit: 110000, outstanding: 26000, quietDays: 17, lang: "hi" },
  { code: "JBP-R-0016", shopName: "Civil Lines Super Store", ownerName: "Arvind Khanna", area: "Civil Lines", route: ROUTE_D, phone: "9000000016", creditLimit: 300000, outstanding: 145000, quietDays: null, lang: "en" },
  { code: "JBP-R-0017", shopName: "Saxena Provision", ownerName: "Ritu Saxena", area: "Sadar", route: ROUTE_D, phone: "9000000017", creditLimit: 65000, outstanding: 12500, quietDays: null, lang: "en" },
  { code: "JBP-R-0018", shopName: "Laxmi Traders", ownerName: "Prakash Dubey", area: "Civil Lines", route: ROUTE_D, phone: "9000000018", creditLimit: 95000, outstanding: 51000, quietDays: 22, lang: "hi" },
];

export const DESK_USERS = [
  { phone: "9000000100", name: "Order Desk · Anjali" },
  { phone: "9000000101", name: "Order Desk · Imran" },
];

/** Special prices: one retailer on a negotiated rate, to show prices really are per retailer. */
export const SPECIAL_PRICES: { retailer: string; sku: string; unitPrice: number }[] = [
  { retailer: "JBP-R-0016", sku: "SKU-DT-1KG", unitPrice: 99.0 },
  { retailer: "JBP-R-0016", sku: "SKU-BS-075", unitPrice: 7.95 },
  { retailer: "JBP-R-0010", sku: "SKU-SL-1KG", unitPrice: 18.0 },
];

/** WhatsApp messages waiting for the desk. The first is the brief's sample, verbatim. */
export const INCOMING_MESSAGES: { retailer: string; text: string; minutesAgo: number }[] = [
  { retailer: "JBP-R-0001", text: "bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti", minutesAgo: 12 },
  { retailer: "JBP-R-0006", text: "भैया 3 पेटी नमक, 2 पेटी हल्दी और 10 dabba noodles bhej dena", minutesAgo: 34 },
  { retailer: "JBP-R-0008", text: "Sir pls send\n1) cream biscuit 4 case\n2) neem sabun 6 peti\n3) phenyl 2\n4) lal wala sabun 3 peti", minutesAgo: 51 },
  { retailer: "JBP-R-0013", text: "poha 3 peti, ketchup 24 pkt, bartan sabun 2 peti, biscuit 5", minutesAgo: 95 },
];

/** A correction the desk made last week, already learned as an alias. */
export const LEARNED_ALIASES: { retailer: string; phrase: string; sku: string }[] = [
  { retailer: "JBP-R-0008", phrase: "lal sabun", sku: "SKU-SP-100" },
];
