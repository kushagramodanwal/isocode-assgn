import "server-only";
import { db } from "@/lib/db";
import type { ExportOrder } from "@/domain/tally";

export async function exportOrdersForBatch(batchId: string): Promise<ExportOrder[]> {
  const orders = await db.order.findMany({
    where: { exportBatchId: batchId },
    orderBy: { number: "asc" },
    include: { retailer: true, lines: { include: { product: true } } },
  });
  return orders.map((o) => ({
    number: o.number,
    date: o.createdAt,
    partyLedger: `${o.retailer.shopName} (${o.retailer.code})`,
    source: o.source === "CAPTURE" ? `WhatsApp #${o.number}` : `App #${o.number}`,
    totalPaise: o.totalPaise,
    lines: o.lines.map((l) => ({
      sku: l.product.code,
      itemName: `${l.product.name} ${l.product.packLabel}`,
      cases: l.cases,
      freeCases: l.freeCases,
      casePricePaise: l.casePricePaise,
      grossPaise: l.grossPaise,
      discountPaise: l.discountPaise,
      taxablePaise: l.taxablePaise,
      gstRateBp: l.gstRateBp,
      gstPaise: l.gstPaise,
    })),
  }));
}
