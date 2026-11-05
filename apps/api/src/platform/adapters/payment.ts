import { logger } from '../logger.js';

export interface ProcessPaymentOptions {
  orderNumber: string;
  amountPaise: bigint;
  idempotencyReference: string;
  demoPaymentOutcome?: 'succeeds' | 'fails';
}

export interface ProcessPaymentResult {
  success: boolean;
  paymentReference: string;
  status: 'succeeded' | 'failed';
  error?: string;
  isIdempotentReplay?: boolean;
}

export interface PaymentGateway {
  processPayment(options: ProcessPaymentOptions): Promise<ProcessPaymentResult>;
}

export class MockPaymentGateway implements PaymentGateway {
  // Store processed mock transactions in memory for idempotent re-calls
  private static mockHistory = new Map<string, ProcessPaymentResult>();

  async processPayment(options: ProcessPaymentOptions): Promise<ProcessPaymentResult> {
    const { orderNumber, idempotencyReference, demoPaymentOutcome } = options;

    logger.info(`[MockPaymentGateway] Processing payment for order ${orderNumber}`, {
      reference: idempotencyReference,
      outcomeSwitch: demoPaymentOutcome,
    });

    if (MockPaymentGateway.mockHistory.has(idempotencyReference)) {
      const existing = MockPaymentGateway.mockHistory.get(idempotencyReference)!;
      logger.info(`[MockPaymentGateway] Idempotent hit for reference ${idempotencyReference}`);
      return { ...existing, isIdempotentReplay: true };
    }

    // Default to success unless explicitly requested to fail in demo
    const isSuccess = demoPaymentOutcome !== 'fails';
    const mockRef = `MOCK_TXN_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const result: ProcessPaymentResult = isSuccess
      ? {
          success: true,
          status: 'succeeded',
          paymentReference: mockRef,
        }
      : {
          success: false,
          status: 'failed',
          paymentReference: mockRef,
          error: 'Demo payment rejected by simulated payment switch',
        };

    MockPaymentGateway.mockHistory.set(idempotencyReference, result);
    return result;
  }
}
