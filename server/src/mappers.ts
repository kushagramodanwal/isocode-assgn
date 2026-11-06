import type { Prisma } from "@prisma/client";
import type { Credit, OrderDto, OrderSummary } from "../../shared/api";
import type { CreditStatus } from "./services/credit";

export const orderSummaryInclude = { retailer: true, _count: { select: { lines: true } } } as const;
export type OrderForSummary = Prisma.OrderGetPayload<{ include: typeof orderSummaryInclude }>;

export function toOrderSummary(o: OrderForSummary): OrderSummary {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    source: o.source,
    createdAt: o.createdAt.toISOString(),
    totalPaise: o.totalPaise,
    lineCount: o._count.lines,
    retailer: { id: o.retailer.id, shopName: o.retailer.shopName, area: o.retailer.area },
  };
}

export const orderDetailInclude = {
  retailer: true,
  placedBy: true,
  capture: true,
  _count: { select: { lines: true } },
  lines: { include: { product: { include: { brand: true } } } },
} as const;
export type OrderForDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

export function toOrderDto(o: OrderForDetail): OrderDto {
  return {
    ...toOrderSummary(o),
    grossPaise: o.grossPaise,
    discountPaise: o.discountPaise,
    taxablePaise: o.taxablePaise,
    gstPaise: o.gstPaise,
    holdReason: o.holdReason,
    rejectReason: o.rejectReason,
    placedBy: o.placedBy.name,
    captureText: o.capture?.rawText ?? null,
    lines: o.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      code: l.product.code,
      name: l.product.name,
      nameHi: l.product.nameHi,
      brand: l.product.brand.name,
      image: l.product.image,
      packLabel: l.product.packLabel,
      cases: l.cases,
      freeCases: l.freeCases,
      casePricePaise: l.casePricePaise,
      discountPaise: l.discountPaise,
      gstRateBp: l.gstRateBp,
      totalPaise: l.totalPaise,
      schemeLabel: l.schemeLabel,
    })),
  };
}

export function toCredit(c: CreditStatus): Credit {
  return { ...c, outstandingAsOf: c.outstandingAsOf.toISOString() };
}
