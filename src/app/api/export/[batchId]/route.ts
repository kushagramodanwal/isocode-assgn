import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCsv, buildTallyXml } from "@/domain/tally";
import { exportOrdersForBatch } from "@/server/export";

export async function GET(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== "DESK") return new NextResponse("Forbidden", { status: 403 });
  const { batchId } = await params;
  const batch = await db.exportBatch.findUnique({ where: { id: batchId } });
  if (!batch) return new NextResponse("Not found", { status: 404 });
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xml";
  const orders = await exportOrdersForBatch(batchId);
  const stamp = new Date(batch.createdAt.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 16).replace(/[-:T]/g, ""); // IST
  const body = format === "csv" ? buildCsv(orders) : buildTallyXml(orders);
  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="tally-sales-orders-${stamp}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
