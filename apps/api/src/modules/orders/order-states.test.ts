import { OrderStatus } from '@retailer/domain';
import { describe, expect, it } from 'vitest';
import { ALLOWED_TRANSITIONS, validateStateTransition } from './order-states.js';

describe('Order State Transition Table (Spec 4.6 & 11)', () => {
  it('allows payment_pending -> pending_desk on gateway success', () => {
    expect(() => validateStateTransition('payment_pending', 'pending_desk')).not.toThrow();
  });

  it('allows payment_pending -> payment_failed on gateway failure', () => {
    expect(() => validateStateTransition('payment_pending', 'payment_failed')).not.toThrow();
  });

  it('allows payment_failed -> pending_desk or on_hold on retry', () => {
    expect(() => validateStateTransition('payment_failed', 'pending_desk')).not.toThrow();
    expect(() => validateStateTransition('payment_failed', 'on_hold')).not.toThrow();
  });

  it('allows pending_desk -> approved only', () => {
    expect(() => validateStateTransition('pending_desk', 'approved')).not.toThrow();
  });

  it('allows on_hold -> pending_desk (release hold)', () => {
    expect(() => validateStateTransition('on_hold', 'pending_desk')).not.toThrow();
  });

  it('allows approved -> exported', () => {
    expect(() => validateStateTransition('approved', 'exported')).not.toThrow();
  });

  it('allows cancellation from payment_failed, pending_desk, and on_hold', () => {
    expect(() => validateStateTransition('payment_failed', 'cancelled')).not.toThrow();
    expect(() => validateStateTransition('pending_desk', 'cancelled')).not.toThrow();
    expect(() => validateStateTransition('on_hold', 'cancelled')).not.toThrow();
  });

  it('forbids invalid transitions', () => {
    // Approved cannot be cancelled directly
    expect(() => validateStateTransition('approved', 'cancelled')).toThrow(
      /Illegal order state transition/
    );

    // Exported is terminal
    expect(() => validateStateTransition('exported', 'approved')).toThrow();
    expect(() => validateStateTransition('exported', 'cancelled')).toThrow();

    // Rejected is terminal
    expect(() => validateStateTransition('rejected', 'approved')).toThrow();

    // on_hold cannot be approved without release
    expect(() => validateStateTransition('on_hold', 'approved')).toThrow();
  });
});
