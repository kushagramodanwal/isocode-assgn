import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { EmptyState, ErrorState, Skeleton } from './States';

describe('UI States (Spec 10.2 & 11 Mandatory Tests)', () => {
  it('renders Loading Skeleton state', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);
    expect(container.firstChild).toBeTruthy();
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('renders Empty state with message and next action', () => {
    let actionTriggered = false;
    render(
      <EmptyState
        title="No Orders Yet"
        message="Browse the catalogue to place an order."
        actionLabel="Browse Catalogue"
        onAction={() => {
          actionTriggered = true;
        }}
      />
    );

    expect(screen.getByText('No Orders Yet')).toBeDefined();
    expect(screen.getByText('Browse the catalogue to place an order.')).toBeDefined();
    const button = screen.getByText('Browse Catalogue');
    button.click();
    expect(actionTriggered).toBe(true);
  });

  it('renders Error state in plain words with retry button', () => {
    let retryTriggered = false;
    render(
      <ErrorState
        title="Failed to load orders"
        message="Please check your network and try again."
        onRetry={() => {
          retryTriggered = true;
        }}
      />
    );

    expect(screen.getByText('Failed to load orders')).toBeDefined();
    expect(screen.getByText('Please check your network and try again.')).toBeDefined();
    const retryBtn = screen.getByText('Try Again');
    retryBtn.click();
    expect(retryTriggered).toBe(true);
  });
});
