/**
 * Request and response shapes for the REST API. Imported by the Express routes and the React app,
 * so a field renamed on one side is a type error on the other.
 * Dates travel as ISO strings; money as integer paise.
 */
import type { CartQuote } from "./pricing";
import type { CatalogueItem } from "./catalogue";
import type { Lang } from "./i18n";

export type Role = "RETAILER" | "DESK";
export type OrderStatus = "CONFIRMED" | "CREDIT_HOLD" | "EXPORTED" | "REJECTED";
export type OrderSource = "APP" | "CAPTURE";

export type ApiError = { error: string; message: string; details?: unknown };

export type Me = {
  id: string;
  name: string;
  role: Role;
  lang: Lang;
  retailer: { id: string; shopName: string; code: string; area: string } | null;
};

export type DemoAccount = { phone: string; who: string; role: string };
export type AppConfig = { demoMode: boolean; demoAccounts: DemoAccount[]; aiReader: string };

export type OtpRequestResult = { ok: true; demoCode?: string } | { ok: false; reason: "rate_limited" | "too_soon"; retryInSeconds: number };

export type Credit = {
  limitPaise: number;
  outstandingPaise: number;
  openOrdersPaise: number;
  availablePaise: number;
  outstandingAsOf: string;
};

export type CatalogueResponse = {
  items: CatalogueItem[];
  frequent: string[];
  lastOrder: { number: number; lines: { productId: string; cases: number }[] } | null;
};

export type OrderLineDto = {
  id: string;
  productId: string;
  code: string;
  name: string;
  nameHi: string;
  brand: string;
  image: string;
  packLabel: string;
  cases: number;
  freeCases: number;
  casePricePaise: number;
  discountPaise: number;
  gstRateBp: number;
  totalPaise: number;
  schemeLabel: string | null;
};

export type OrderSummary = {
  id: string;
  number: number;
  status: OrderStatus;
  source: OrderSource;
  createdAt: string;
  totalPaise: number;
  lineCount: number;
  retailer: { id: string; shopName: string; area: string };
};

export type OrderDto = OrderSummary & {
  grossPaise: number;
  discountPaise: number;
  taxablePaise: number;
  gstPaise: number;
  holdReason: string | null;
  rejectReason: string | null;
  placedBy: string;
  captureText: string | null;
  lines: OrderLineDto[];
};

export type PlaceOrderRequest = { items: { productId: string; cases: number }[]; idempotencyKey: string; expectedTotalPaise: number };
export type PlaceOrderResult =
  | { ok: true; orderId: string; number: number; status: "CONFIRMED" | "CREDIT_HOLD" }
  | { ok: false; error: "changed" | "blocked" | "empty"; quote?: CartQuote };

export type CaptureUnit = "CASE" | "PIECE" | "UNKNOWN";

export type CaptureLineDto = {
  id: string;
  rawText: string;
  qty: number | null;
  unit: CaptureUnit;
  productId: string | null;
  confidence: number;
  matchedBy: string;
  alternatives: { productId: string; score: number }[];
};

export type CaptureView = {
  id: string;
  status: "NEEDS_REVIEW" | "CONFIRMED" | "DISCARDED";
  orderId: string | null;
  rawText: string;
  parser: string;
  parserNote: string | null;
  channel: "WHATSAPP_TEXT" | "APP_TEXT";
  createdAt: string;
  createdBy: string;
  retailer: { id: string; shopName: string; code: string; area: string };
  lines: CaptureLineDto[];
  catalogue: CatalogueItem[];
};

export type CaptureSummary = {
  id: string;
  createdAt: string;
  rawText: string;
  channel: "WHATSAPP_TEXT" | "APP_TEXT";
  retailer: { shopName: string; area: string };
  lineCount: number;
  needsAttention: number;
};

export type ReviewedLineDto = {
  lineId: string;
  removed: boolean;
  productId: string | null;
  cases: number | null;
  unitConfirmed: boolean;
  checked: boolean;
  substituted: boolean;
};

export type ConfirmProblem = { lineId: string; problem: "no_product" | "no_qty" | "unit" | "unchecked" | "unknown_product" };
export type ConfirmResult =
  | { ok: true; orderId: string; learned: number }
  | { ok: false; message: string; problems?: ConfirmProblem[] };

export type DeskCaptureContext = {
  capture: CaptureView;
  credit: Credit;
  recent: { id: string; number: number; status: OrderStatus; createdAt: string }[];
  aliases: { id: string; phrase: string; product: string }[];
};

export type DeskSummary = {
  captures: CaptureSummary[];
  holds: (OrderSummary & { holdReason: string | null })[];
  ready: { count: number; totalPaise: number };
  quietCount: number;
};

export type QuietRetailer = {
  id: string; code: string; shopName: string; ownerName: string; phone: string; area: string; route: string;
  lastOrderAt: string | null; daysQuiet: number | null; ordersLast60: number; avgOrderPaise: number;
};

export type ExportPage = {
  ready: OrderSummary[];
  batches: { id: string; createdAt: string; createdBy: string; orderCount: number; totalPaise: number }[];
};

export type LoadingRoute = {
  route: string;
  shops: number;
  skus: { code: string; name: string; paid: number; free: number }[];
};

export type AuditEntry = { id: string; action: string; actor: string; createdAt: string };
export type DeskOrderContext = { order: OrderDto; credit: Credit; history: AuditEntry[] };
