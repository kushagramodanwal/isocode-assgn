import { normaliseAliasKey, OrderStatus } from '@retailer/domain';
import { getMessageSender } from '../../platform/adapters/index.js';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../platform/errors.js';
import { prisma } from '../../platform/prisma.js';
import { validateStateTransition } from '../orders/order-states.js';

export class DeskService {
  private messageSender = getMessageSender();

  async listQueue(params: {
    status?: string;
    retailerId?: string;
    searchQuery?: string;
  }) {
    const { status, retailerId, searchQuery } = params;

    const where: any = {};
    if (status) {
      where.status = status;
    } else {
      // Default desk queue shows pending_desk and on_hold (Spec 4.7)
      where.status = { in: ['pending_desk', 'on_hold'] };
    }

    if (retailerId) {
      where.retailerId = retailerId;
    }

    if (searchQuery) {
      where.OR = [
        { orderNumber: { contains: searchQuery, mode: 'insensitive' } },
        { retailer: { name: { contains: searchQuery, mode: 'insensitive' } } },
        { retailer: { code: { contains: searchQuery, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { placedAt: 'desc' },
      include: {
        retailer: true,
        placedByUser: true,
        aiDraft: true,
        lines: {
          include: {
            sku: {
              include: { stock: true },
            },
          },
        },
      },
    });

    // Counts summary
    const counts = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {};
    for (const c of counts) {
      statusCounts[c.status] = c._count.id;
    }

    return { orders, statusCounts };
  }

  async getOrderDetail(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        retailer: true,
        placedByUser: true,
        aiDraft: true,
        events: { orderBy: { createdAt: 'desc' } },
        lines: {
          include: {
            sku: {
              include: { stock: true },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async updateOrderLine(params: {
    orderId: string;
    lineId: string;
    ifMatchVersion: number;
    newBilledCases: number;
    newSkuId?: string;
    createAlias?: boolean;
    aliasPhrase?: string;
    actorUserId: string;
  }) {
    const {
      orderId,
      lineId,
      ifMatchVersion,
      newBilledCases,
      newSkuId,
      createAlias,
      aliasPhrase,
      actorUserId,
    } = params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });

    if (!order) throw new NotFoundError('Order not found');

    // Optimistic locking (Spec 4.7): Stale version returns 409
    if (order.version !== ifMatchVersion) {
      throw new ConflictError(
        'Order has been modified by another user. Please reload the latest order details.'
      );
    }

    const line = order.lines.find((l) => l.id === lineId);
    if (!line) throw new NotFoundError('Order line not found');

    const targetSkuId = newSkuId || line.skuId;

    const updated = await prisma.$transaction(async (tx) => {
      // If line SKU changed or billed cases changed
      const price = await tx.price.findFirst({
        where: {
          skuId: targetSkuId,
          OR: [{ retailerId: null }, { retailerId: order.retailerId }],
        },
        orderBy: { validFrom: 'desc' },
      });

      const unitPrice = price?.pricePaise ?? line.unitPricePaise;
      const newLineTotal = BigInt(newBilledCases) * unitPrice;

      await tx.orderLine.update({
        where: { id: lineId },
        data: {
          skuId: targetSkuId,
          billedCases: newBilledCases,
          unitPricePaise: unitPrice,
          lineTotalPaise: newLineTotal,
        },
      });

      // Recalculate order total
      const allLines = await tx.orderLine.findMany({ where: { orderId } });
      const newTotal = allLines.reduce((acc, l) => acc + l.lineTotalPaise, 0n);

      const res = await tx.order.update({
        where: { id: orderId },
        data: {
          totalPaise: newTotal,
          version: { increment: 1 },
        },
        include: { lines: { include: { sku: true } } },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: order.status,
          actorUserId,
          note: `Desk updated line ${lineId} (cases: ${newBilledCases})`,
        },
      });

      // Create Alias if requested (Spec 5.7: desk correction becomes learning)
      if (createAlias && aliasPhrase) {
        const normalised = normaliseAliasKey(aliasPhrase);

        // Deactivate old alias for this phrase
        const existing = await tx.alias.findFirst({
          where: {
            retailerId: order.retailerId,
            phraseNormalised: normalised,
            active: true,
          },
        });

        const newAlias = await tx.alias.create({
          data: {
            retailerId: order.retailerId,
            phraseNormalised: normalised,
            skuId: targetSkuId,
            active: true,
          },
        });

        if (existing) {
          await tx.alias.update({
            where: { id: existing.id },
            data: {
              active: false,
              replacedById: newAlias.id,
            },
          });
        }
      }

      return res;
    });

    return updated;
  }

  /**
   * Concurrency-safe stock lock approval (Spec 4.3).
   */
  async approveOrder(orderId: string, actorUserId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: { sku: true },
          orderBy: { skuId: 'asc' }, // Order lines by skuId ascending
        },
      },
    });

    if (!order) throw new NotFoundError('Order not found');
    validateStateTransition(order.status as OrderStatus, 'approved');

    // Run stock lock transaction
    const approvedOrder = await prisma.$transaction(
      async (tx) => {
        // Step 1: Lock stock rows in ascending SKU ID order
        const skuIds = order.lines.map((l) => l.skuId).sort();

        // Raw SQL row lock for postgres: SELECT * FROM stock WHERE sku_id IN (...) ORDER BY sku_id ASC FOR UPDATE
        const lockedStocks: any[] = await tx.$queryRaw`
          SELECT "skuId", "onHandCases"
          FROM "stock"
          WHERE "skuId" = ANY(${skuIds}::text[])
          ORDER BY "skuId" ASC
          FOR UPDATE
        `;

        const stockMap = new Map<string, number>();
        for (const s of lockedStocks) {
          stockMap.set(s.skuId, s.onHandCases);
        }

        // Step 2 & 3: Check each line against onHandCases, including free cases
        const shortLines: Array<{ skuCode: string; required: number; available: number }> = [];

        for (const line of order.lines) {
          const required = line.billedCases + line.freeCases;
          const available = stockMap.get(line.skuId) ?? 0;

          if (available < required) {
            shortLines.push({
              skuCode: line.sku.code,
              required,
              available,
            });
          }
        }

        if (shortLines.length > 0) {
          throw new BusinessRuleError('Insufficient stock to approve order', {
            shortLines,
          });
        }

        // Step 4: Decrement stock
        for (const line of order.lines) {
          const totalCases = line.billedCases + line.freeCases;
          await tx.stock.update({
            where: { skuId: line.skuId },
            data: { onHandCases: { decrement: totalCases } },
          });
        }

        // Update order status to approved
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'approved',
            version: { increment: 1 },
          },
        });

        await tx.orderEvent.create({
          data: {
            orderId,
            fromStatus: order.status,
            toStatus: 'approved',
            actorUserId,
            note: 'Approved by order desk with stock allocated',
          },
        });

        return updated;
      },
      { timeout: 10000 }
    );

    // Notify retailer
    await this.messageSender.send({
      userId: order.placedByUserId,
      channel: 'sms_mock',
      template: 'order_approved',
      body: `Order ${order.orderNumber} has been approved for dispatch.`,
    });

    return approvedOrder;
  }

  async rejectOrder(orderId: string, actorUserId: string, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundError('Order not found');
    validateStateTransition(order.status as OrderStatus, 'rejected');

    // Check if paid online: requires mock refund (Spec 4.5 & 4.7)
    let refundStatus = order.refundStatus;
    if (order.paymentMode === 'online_mock' && order.paymentStatus === 'succeeded') {
      refundStatus = 'required_mock';
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'rejected',
          refundStatus,
          holdReason: reason || 'Rejected by desk',
          version: { increment: 1 },
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: 'rejected',
          actorUserId,
          note: reason || 'Rejected by desk staff',
        },
      });

      return res;
    });

    await this.messageSender.send({
      userId: order.placedByUserId,
      channel: 'sms_mock',
      template: 'order_rejected',
      body: `Order ${order.orderNumber} was rejected: ${reason || 'Contact distributor desk'}.`,
    });

    return updated;
  }

  async releaseCreditHold(orderId: string, actorUserId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== 'on_hold') {
      throw new BusinessRuleError('Can only release hold on orders currently in on_hold status');
    }

    validateStateTransition('on_hold', 'pending_desk');

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'pending_desk',
          holdReason: null,
          version: { increment: 1 },
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          fromStatus: 'on_hold',
          toStatus: 'pending_desk',
          actorUserId,
          note: 'Credit hold released by desk',
        },
      });

      return res;
    });

    return updated;
  }
}
