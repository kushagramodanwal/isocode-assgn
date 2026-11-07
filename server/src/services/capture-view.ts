import { db } from "../db";
import { catalogueFor } from "./catalogue";
import type { CatalogueItem } from "../../../shared/catalogue";
import type { CaptureView } from "../../../shared/api";


/** Capture plus the retailer's own catalogue (their prices), for the review screen. */
export async function loadCapture(id: string, retailerScope: string | null): Promise<CaptureView | null> {
  const capture = await db.capture.findFirst({
    where: { id, ...(retailerScope ? { retailerId: retailerScope } : {}) },
    include: { lines: { orderBy: { position: "asc" } }, retailer: true, createdBy: { select: { name: true, role: true } }, media: { select: { captureId: true } } },
  });
  if (!capture) return null;
  const catalogue: CatalogueItem[] = await catalogueFor(capture.retailerId);
  return {
    id: capture.id,
    status: capture.status,
    orderId: capture.orderId,
    rawText: capture.rawText,
    parser: capture.parser,
    parserNote: capture.parserNote,
    channel: capture.channel,
    source: capture.source,
    hasMedia: !!capture.media,
    createdAt: capture.createdAt.toISOString(),
    createdBy: capture.createdBy.name,
    retailer: { id: capture.retailer.id, shopName: capture.retailer.shopName, code: capture.retailer.code, area: capture.retailer.area },
    lines: capture.lines.map((l) => ({
      id: l.id,
      rawText: l.rawText,
      phrase: l.phrase,
      qty: l.qty,
      unit: l.unit,
      productId: l.productId,
      confidence: l.confidence,
      matchedBy: l.matchedBy,
      alternatives: (Array.isArray(l.alternatives) ? l.alternatives : []).flatMap((a) =>
        a && typeof a === "object" && !Array.isArray(a) && typeof a.productId === "string" ? [{ productId: a.productId, score: Number(a.score) || 0 }] : [],
      ),
    })),
    catalogue,
  };
}
