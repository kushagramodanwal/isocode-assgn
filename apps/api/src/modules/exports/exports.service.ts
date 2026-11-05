import { getMessageSender, getTallyExporter, TallyOrderLineExport } from '../../platform/adapters/index.js';
import { BusinessRuleError, NotFoundError } from '../../platform/errors.js';
import { prisma } from '../../platform/prisma.js';

// Cache generated CSVs in memory by batchId for file download
const csvFileCache = new Map<string, string>();

export class ExportsService {
  private tallyExporter = getTallyExporter();
  private messageSender = getMessageSender();

  async exportOrdersToCsv(orderIds: string[], actorUserId: string) {
    if (!orderIds || orderIds.length === 0) {
      throw new BusinessRuleError('At least one order ID must be provided');
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        retailer: true,
        lines: { include: { sku: true } },
      },
    });

    if (orders.length === 0) {
      throw new NotFoundError('No matching orders found');
    }

    // Check if all orders are already exported in the same batch (idempotent re-run)
    const allAlreadyExported = orders.every((o) => o.status === 'exported' && o.exportedBatchId);
    if (allAlreadyExported && orders.length > 0) {
      const existingBatchId = orders[0].exportedBatchId!;
      const existingBatch = await prisma.exportBatch.findUnique({
        where: { id: existingBatchId },
      });
      return {
        batch: existingBatch,
        isNoOp: true,
        message: 'All selected orders were already exported in this batch (idempotent no-op)',
      };
    }

    const exportLines: TallyOrderLineExport[] = [];
    const eligibleOrderIds: string[] = [];
    const excluded: Array<{ orderId: string; orderNumber: string; reason: string }> = [];
    let totalExportPaise = 0n;

    for (const order of orders) {
      // Must be approved before export (Spec 4.6 & 4.10)
      if (order.status !== 'approved') {
        excluded.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: `Order is in status '${order.status}', must be 'approved' to export`,
        });
        continue;
      }

      if (!order.retailer.code) {
        excluded.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: 'Retailer code is missing',
        });
        continue;
      }

      eligibleOrderIds.push(order.id);
      totalExportPaise += order.totalPaise;

      for (const line of order.lines) {
        exportLines.push({
          orderNumber: order.orderNumber,
          orderDate: order.placedAt,
          retailerCode: order.retailer.code,
          retailerName: order.retailer.name,
          skuCode: line.sku.code,
          billedCases: line.billedCases,
          freeCases: line.freeCases,
          unitPricePaise: line.unitPricePaise,
          lineDiscountPaise: line.discountPaise,
          gstInclusive: line.gstInclusive,
          lineTotalPaise: line.lineTotalPaise,
          orderTotalPaise: order.totalPaise,
        });
      }
    }

    if (exportLines.length === 0) {
      throw new BusinessRuleError('No eligible orders available to export', { excluded });
    }

    const { csvContent, fileSha256, rowCount } = await this.tallyExporter.exportToCsv(exportLines);

    // Save batch in transaction
    const batch = await prisma.$transaction(async (tx) => {
      const createdBatch = await tx.exportBatch.create({
        data: {
          fileSha256,
          orderCount: eligibleOrderIds.length,
          totalPaise: totalExportPaise,
          excluded: excluded as any,
          createdByUserId: actorUserId,
        },
      });

      // Update eligible orders
      await tx.order.updateMany({
        where: { id: { in: eligibleOrderIds } },
        data: {
          status: 'exported',
          exportedBatchId: createdBatch.id,
        },
      });

      for (const orderId of eligibleOrderIds) {
        await tx.orderEvent.create({
          data: {
            orderId,
            fromStatus: 'approved',
            toStatus: 'exported',
            actorUserId,
            note: `Exported to Tally CSV batch ${createdBatch.id}`,
          },
        });
      }

      return createdBatch;
    });

    // Store CSV in memory for download
    csvFileCache.set(batch.id, csvContent);

    // Write notification
    await this.messageSender.send({
      userId: actorUserId,
      channel: 'in_app',
      template: 'export_created',
      body: `Export batch ${batch.id} generated with ${eligibleOrderIds.length} orders. SHA256: ${fileSha256.slice(0, 8)}...`,
    });

    return {
      batch,
      isNoOp: false,
      excluded,
      rowCount,
    };
  }

  async getBatch(batchId: string) {
    const batch = await prisma.exportBatch.findUnique({
      where: { id: batchId },
      include: { orders: { include: { retailer: true } } },
    });
    if (!batch) throw new NotFoundError('Export batch not found');
    return batch;
  }

  async getBatchFile(batchId: string): Promise<string> {
    const cached = csvFileCache.get(batchId);
    if (cached) return cached;

    // Regenerate from database if not in memory
    const batch = await this.getBatch(batchId);
    const exportLines: TallyOrderLineExport[] = [];

    const orders = await prisma.order.findMany({
      where: { exportedBatchId: batchId },
      include: { retailer: true, lines: { include: { sku: true } } },
    });

    for (const order of orders) {
      for (const line of order.lines) {
        exportLines.push({
          orderNumber: order.orderNumber,
          orderDate: order.placedAt,
          retailerCode: order.retailer.code,
          retailerName: order.retailer.name,
          skuCode: line.sku.code,
          billedCases: line.billedCases,
          freeCases: line.freeCases,
          unitPricePaise: line.unitPricePaise,
          lineDiscountPaise: line.discountPaise,
          gstInclusive: line.gstInclusive,
          lineTotalPaise: line.lineTotalPaise,
          orderTotalPaise: order.totalPaise,
        });
      }
    }

    const { csvContent } = await this.tallyExporter.exportToCsv(exportLines);
    csvFileCache.set(batchId, csvContent);
    return csvContent;
  }

  async listBatches() {
    return prisma.exportBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
