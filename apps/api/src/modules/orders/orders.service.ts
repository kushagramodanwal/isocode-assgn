import {
  calculateSchemes,
  formatPaiseToRupees,
  OrderStatus,
  PaymentMode,
  SchemeRule,
} from '@retailer/domain';
import { getMessageSender, getPaymentGateway } from '../../platform/adapters/index.js';
import { BusinessRuleError, NotFoundError } from '../../platform/errors.js';
import { logger } from '../../platform/logger.js';
import { prisma } from '../../platform/prisma.js';
import { validateStateTransition } from './order-states.js';

export interface PlaceOrderInput {
  userId: string;
  retailerId: string;
  idempotencyKey: string;
  lines: Array<{ skuCode: string; cases: number }>;
  paymentMode: PaymentMode;
  demoPaymentOutcome?: 'succeeds' | 'fails';
  aiDraftId?: string;
}

export class OrdersService {
  private messageSender = getMessageSender();
  private paymentGateway = getPaymentGateway();

  /**
   * Evaluates cart lines with authoritative server-side prices and schemes.
   */
  async previewCart(retailerId: string, lines: Array<{ skuCode: string; cases: number }>) {
    const now = new Date();

    const skuCodes = lines.map((l) => l.skuCode);
    const skus = await prisma.sku.findMany({
      where: { code: { in: skuCodes }, active: true },
      include: {
        stock: true,
        prices: {
          where: {
            validFrom: { lte: now },
            validTo: { gte: now },
            OR: [{ retailerId: null }, { retailerId }],
          },
          orderBy: { validFrom: 'desc' },
        },
        schemes: {
          where: {
            active: true,
            validFrom: { lte: now },
            validTo: { gte: now },
            OR: [{ retailerId: null }, { retailerId }],
          },
        },
      },
    });

    const candidateSchemes: SchemeRule[] = [];
    const engineLines = lines.map((line) => {
      const sku = skus.find((s) => s.code === line.skuCode);
      if (!sku) {
        throw new NotFoundError(`SKU not found in catalogue: ${line.skuCode}`);
      }

      // Retailer price wins when valid, else list price
      let price = sku.prices.find((p) => p.retailerId === retailerId);
      if (!price) {
        price = sku.prices.find((p) => p.retailerId === null);
      }

      if (!price) {
        throw new BusinessRuleError(`No active price available for SKU ${line.skuCode}`);
      }

      for (const sch of sku.schemes) {
        candidateSchemes.push({
          id: sch.id,
          skuCode: sku.code,
          type: sch.type as any,
          n: sch.n,
          m: sch.m,
          minCases: sch.minCases,
          discountBps: sch.discountBps,
          retailerId: sch.retailerId,
          validFrom: sch.validFrom,
          validTo: sch.validTo,
          active: sch.active,
        });
      }

      return {
        skuCode: sku.code,
        casesOrdered: line.cases,
        unitPricePaise: price.pricePaise,
        availableStockCases: sku.stock?.onHandCases,
        gstInclusive: price.gstInclusive,
        skuId: sku.id,
        name: sku.name,
      };
    });

    const calculation = calculateSchemes({
      orderDate: now,
      retailerId,
      lines: engineLines,
      schemes: candidateSchemes,
    });

    // Compute retailer credit exposure (Spec 4.4)
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
    });
    if (!retailer) throw new NotFoundError('Retailer not found');

    const exposureOrders = await prisma.order.findMany({
      where: {
        retailerId,
        status: { in: ['pending_desk', 'on_hold', 'approved'] },
        exportedBatchId: null,
        paymentMode: 'credit_account', // Online paid orders do not count toward exposure
      },
      select: { totalPaise: true },
    });

    const openExposurePaise = exposureOrders.reduce(
      (sum, o) => sum + o.totalPaise,
      0n
    );

    return {
      calculation,
      creditLimitPaise: retailer.creditLimitPaise,
      openExposurePaise,
      availableCreditPaise:
        retailer.creditLimitPaise > openExposurePaise
          ? retailer.creditLimitPaise - openExposurePaise
          : 0n,
    };
  }

  /**
   * Places an order with idempotency, pricing authority, scheme evaluation, and credit/payment rules.
   */
  async placeOrder(input: PlaceOrderInput) {
    const {
      userId,
      retailerId,
      idempotencyKey,
      lines,
      paymentMode,
      demoPaymentOutcome,
      aiDraftId,
    } = input;

    // Rule 7 & 8: Check for idempotent replay
    const existingOrder = await prisma.order.findUnique({
      where: {
        placedByUserId_idempotencyKey: {
          placedByUserId: userId,
          idempotencyKey,
        },
      },
      include: {
        lines: { include: { sku: true } },
        events: true,
      },
    });

    if (existingOrder) {
      logger.info(`Idempotent hit for order placement with key ${idempotencyKey}`);
      return { order: existingOrder, isReplay: true };
    }

    const preview = await this.previewCart(retailerId, lines);
    const { calculation, creditLimitPaise, openExposurePaise } = preview;

    let initialStatus: OrderStatus = 'pending_desk';
    let holdReason: string | null = null;
    let paymentStatus: 'not_required' | 'pending' | 'succeeded' | 'failed' =
      'not_required';
    let paymentReference: string | null = null;

    if (paymentMode === 'credit_account') {
      const newTotalExposure = openExposurePaise + calculation.totalPaise;
      if (newTotalExposure > creditLimitPaise) {
        initialStatus = 'on_hold';
        const excess = newTotalExposure - creditLimitPaise;
        holdReason = `Exceeds credit limit by ${formatPaiseToRupees(excess, { includeSymbol: true })}`;
      }
    } else if (paymentMode === 'online_mock') {
      const tempRef = `ORDER_${Date.now()}`;
      const payResult = await this.paymentGateway.processPayment({
        orderNumber: tempRef,
        amountPaise: calculation.totalPaise,
        idempotencyReference: idempotencyKey,
        demoPaymentOutcome,
      });

      paymentReference = payResult.paymentReference;

      if (payResult.success) {
        initialStatus = 'pending_desk';
        paymentStatus = 'succeeded';
      } else {
        initialStatus = 'payment_failed';
        paymentStatus = 'failed';
        holdReason = payResult.error || 'Payment failed';
      }
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          retailerId,
          placedByUserId: userId,
          status: initialStatus,
          version: 1,
          totalPaise: calculation.totalPaise,
          holdReason,
          paymentMode,
          paymentStatus,
          paymentReference,
          idempotencyKey,
          aiDraftId: aiDraftId || null,
        },
      });

      // Fetch SKU IDs
      const skuCodes = lines.map((l) => l.skuCode);
      const skus = await tx.sku.findMany({
        where: { code: { in: skuCodes } },
        include: {
          prices: {
            where: {
              OR: [{ retailerId: null }, { retailerId }],
            },
            orderBy: { validFrom: 'desc' },
          },
        },
      });

      for (const lineRes of calculation.lines) {
        const sku = skus.find((s) => s.code === lineRes.skuCode)!;
        const price =
          sku.prices.find((p) => p.retailerId === retailerId) ||
          sku.prices.find((p) => p.retailerId === null)!;

        await tx.orderLine.create({
          data: {
            orderId: createdOrder.id,
            skuId: sku.id,
            billedCases: lineRes.billedCases,
            freeCases: lineRes.freeCases,
            unitPricePaise: price.pricePaise,
            gstInclusive: price.gstInclusive,
            discountPaise: lineRes.discountPaise,
            lineTotalPaise: lineRes.finalLineTotalPaise,
            schemeExplanation: lineRes.explanation,
          },
        });
      }

      await tx.orderEvent.create({
        data: {
          orderId: createdOrder.id,
          fromStatus: 'new',
          toStatus: initialStatus,
          actorUserId: userId,
          note: holdReason || `Order placed via ${paymentMode}`,
        },
      });

      return tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          lines: { include: { sku: true } },
          events: true,
        },
      });
    });

    // Notify via MessageSender (Spec 4.9)
    let template = 'order_placed';
    if (initialStatus === 'on_hold') template = 'order_on_hold';
    else if (initialStatus === 'payment_failed') template = 'payment_failed';

    await this.messageSender.send({
      userId,
      channel: 'sms_mock',
      template,
      body: `Order ${orderNumber} placed. Status: ${initialStatus}. Total: ${formatPaiseToRupees(calculation.totalPaise, { includeSymbol: true })}`,
    });

    return { order: order!, isReplay: false };
  }

  /**
   * Retailer-scoped query: returns 404 (Rule 3) if belongs to another retailer.
   */
  async findOrderForRetailer(orderId: string, retailerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lines: { include: { sku: true } },
        events: { orderBy: { createdAt: 'desc' } },
        retailer: true,
      },
    });

    if (!order || order.retailerId !== retailerId) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  async listOrdersForRetailer(retailerId: string, cursor?: string, limit = 20) {
    const orders = await prisma.order.findMany({
      where: { retailerId },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { placedAt: 'desc' },
      include: {
        lines: { include: { sku: true } },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (orders.length > limit) {
      const nextItem = orders.pop();
      nextCursor = nextItem?.id;
    }

    return { orders, nextCursor };
  }

  async cancelOrder(orderId: string, retailerId: string, userId: string) {
    const order = await this.findOrderForRetailer(orderId, retailerId);

    // Cancel allowed only before approval
    validateStateTransition(order.status as OrderStatus, 'cancelled');

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          version: { increment: 1 },
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: 'cancelled',
          actorUserId: userId,
          note: 'Cancelled by retailer',
        },
      });

      return res;
    });

    await this.messageSender.send({
      userId,
      channel: 'sms_mock',
      template: 'order_cancelled',
      body: `Order ${order.orderNumber} has been cancelled.`,
    });

    return updated;
  }

  async retryPayment(
    orderId: string,
    retailerId: string,
    userId: string,
    newPaymentMode: PaymentMode,
    demoPaymentOutcome?: 'succeeds' | 'fails'
  ) {
    const order = await this.findOrderForRetailer(orderId, retailerId);

    if (order.status !== 'payment_failed') {
      throw new BusinessRuleError('Can only retry payment on failed payment orders');
    }

    let nextStatus: OrderStatus = 'pending_desk';
    let newPaymentStatus: 'not_required' | 'succeeded' | 'failed' = 'not_required';
    let paymentReference: string | null = order.paymentReference;
    let holdReason: string | null = null;

    if (newPaymentMode === 'credit_account') {
      // Re-evaluate credit limit
      const retailer = await prisma.retailer.findUnique({ where: { id: retailerId } });
      const exposureOrders = await prisma.order.findMany({
        where: {
          retailerId,
          status: { in: ['pending_desk', 'on_hold', 'approved'] },
          exportedBatchId: null,
          paymentMode: 'credit_account',
          id: { not: orderId },
        },
        select: { totalPaise: true },
      });
      const openExp = exposureOrders.reduce((acc, o) => acc + o.totalPaise, 0n);

      if (openExp + order.totalPaise > (retailer?.creditLimitPaise ?? 0n)) {
        nextStatus = 'on_hold';
        holdReason = 'Exceeds credit limit';
      }
    } else {
      const payResult = await this.paymentGateway.processPayment({
        orderNumber: order.orderNumber,
        amountPaise: order.totalPaise,
        idempotencyReference: `RETRY_${order.id}_${Date.now()}`,
        demoPaymentOutcome,
      });

      paymentReference = payResult.paymentReference;
      if (payResult.success) {
        nextStatus = 'pending_desk';
        newPaymentStatus = 'succeeded';
      } else {
        nextStatus = 'payment_failed';
        newPaymentStatus = 'failed';
        holdReason = payResult.error || 'Retry payment failed';
      }
    }

    validateStateTransition(order.status as OrderStatus, nextStatus);

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          paymentMode: newPaymentMode,
          paymentStatus: newPaymentStatus,
          paymentReference,
          holdReason,
          version: { increment: 1 },
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: nextStatus,
          actorUserId: userId,
          note: `Payment retried via ${newPaymentMode}. Result: ${nextStatus}`,
        },
      });

      return res;
    });

    return updated;
  }
}
