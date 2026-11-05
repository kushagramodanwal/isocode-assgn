export type SchemeType = 'buy_n_get_m' | 'slab';

export interface SchemeRule {
  id: string;
  skuCode: string;
  type: SchemeType;
  n?: number | null; // For buy_n_get_m
  m?: number | null; // For buy_n_get_m
  minCases?: number | null; // For slab
  discountBps?: number | null; // Basis points (e.g. 300 = 3%)
  retailerId?: string | null; // null for general, or retailer-specific
  validFrom: Date | string;
  validTo: Date | string;
  active: boolean;
}

export interface CartLineInput {
  skuCode: string;
  casesOrdered: number;
  unitPricePaise: bigint;
  availableStockCases?: number; // Optional on-hand stock for freeGoodsStatus calculation
}

export interface SchemeLineResult {
  skuCode: string;
  orderedCases: number;
  billedCases: number;
  freeCases: number;
  deliveredCases: number;
  discountPaise: bigint;
  finalLineTotalPaise: bigint;
  freeGoodsStatus: 'ok' | 'pending_stock';
  appliedSchemeId: string | null;
  appliedSchemeType: SchemeType | null;
  explanation: string;
}

export interface SchemeEngineInput {
  orderDate: Date;
  retailerId: string;
  lines: CartLineInput[];
  schemes: SchemeRule[];
}

export interface SchemeEngineOutput {
  lines: SchemeLineResult[];
  subtotalPaise: bigint;
  totalDiscountPaise: bigint;
  totalPaise: bigint;
  totalFreeCases: number;
}
