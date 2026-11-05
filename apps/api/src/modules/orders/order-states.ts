import { OrderStatus } from '@retailer/domain';
import { BusinessRuleError } from '../../platform/errors.js';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  payment_pending: ['pending_desk', 'payment_failed', 'cancelled'],
  payment_failed: ['pending_desk', 'on_hold', 'cancelled'],
  pending_desk: ['approved', 'rejected', 'cancelled'],
  on_hold: ['pending_desk', 'rejected', 'cancelled'],
  approved: ['exported'],
  exported: [],
  rejected: [],
  cancelled: [],
};

export function validateStateTransition(from: OrderStatus, to: OrderStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new BusinessRuleError(
      `Illegal order state transition from '${from}' to '${to}'`
    );
  }
}
