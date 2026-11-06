export type SchemeType = 'FREE_GOODS' | 'SLAB_DISCOUNT';

export interface SkuInfo {
  id: string;
  productId?: string;
  unitsPerCase: number;
  gstRateBps: number;
  stockCases: number;
}

export interface Scheme {
  id: string;
  skuId: string;
  type: SchemeType;
  params: unknown; // validated inside the engine
  validFrom: Date;
  validTo: Date;
  segment?: string | null;
  labelEn: string;
  labelHi: string;
}

export interface CartLineInput {
  skuId: string;
  qtyCases: number;
}

export interface PriceCartInput {
  lines: CartLineInput[];
  skus: Record<string, SkuInfo>;
  /** Retailer's unit (pack) price in paise, after tier and overrides. */
  prices: Record<string, number>;
  schemes: Scheme[];
  at: Date;
  retailer: { segment?: string | null; availableCreditPaise: number };
}

export type LineError =
  | { code: 'INSUFFICIENT_STOCK'; available: number; alternatives: string[] }
  | { code: 'UNKNOWN_SKU' }
  | { code: 'NO_PRICE' }
  | { code: 'INVALID_QTY' };

export type Warning = { code: 'FREE_GOODS_CAPPED'; skuId: string; wanted: number; given: number };

export interface AppliedScheme {
  id: string;
  type: SchemeType;
  params: FreeGoodsParams | SlabParams;
  labelEn: string;
  labelHi: string;
}

export interface PricedLine {
  skuId: string;
  qtyCases: number;
  unitPricePaise: number;
  unitsPerCase: number;
  casePricePaise: number;
  /** qty × case price, before discount. */
  grossPaise: number;
  discountPaise: number;
  /** gross − discount; GST base. */
  taxablePaise: number;
  gstRateBps: number;
  gstPaise: number;
  lineTotalPaise: number;
  freeCases: number;
  /** Scheme that is active for this SKU, whether or not its threshold is met. */
  activeScheme: AppliedScheme | null;
  /** Scheme whose benefit was actually earned on this line. */
  appliedScheme: AppliedScheme | null;
  errors: LineError[];
  /** False when the line has errors: it is priced for display but excluded from totals. */
  included: boolean;
}

export type Nudge =
  | { skuId: string; type: 'ADD_FOR_FREE'; addCases: number; freeCases: number; schemeId: string }
  | { skuId: string; type: 'ADD_FOR_DISCOUNT'; addCases: number; discountBps: number; schemeId: string };

export interface CartTotals {
  grossPaise: number;
  discountPaise: number;
  taxablePaise: number;
  gstPaise: number;
  totalPaise: number;
  paidCases: number;
  freeCases: number;
}

export interface PricedCart {
  lines: PricedLine[];
  freeGoods: { skuId: string; freeCases: number; schemeId: string }[];
  nudges: Nudge[];
  warnings: Warning[];
  totals: CartTotals;
  creditStatus: 'OK' | 'WILL_HOLD';
  availableCreditPaise: number;
  /** True when any line has an error; such a cart cannot be placed. */
  blocked: boolean;
}

export interface FreeGoodsParams {
  buy: number;
  get: number;
}
export interface SlabParams {
  minCases: number;
  discountBps: number;
}
