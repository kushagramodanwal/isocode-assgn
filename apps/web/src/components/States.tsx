import React from 'react';
import { AlertCircle, ArrowRight, PackageOpen } from 'lucide-react';
import { Button } from './Button';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-stone-200/80 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-bg-surface border border-border rounded-xl shadow-sm my-6">
      <div className="w-14 h-14 rounded-full bg-bg-subtle flex items-center justify-center mb-4 text-text-muted">
        <PackageOpen className="w-7 h-7 stroke-[1.5]" />
      </div>
      <h3 className="text-lg font-bold text-text-main mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm mb-6">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50/50 border border-red-200 rounded-xl my-6">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-status-error">
        <AlertCircle className="w-6 h-6 stroke-[2]" />
      </div>
      <h3 className="text-base font-bold text-red-900 mb-1">{title}</h3>
      <p className="text-sm text-red-700 max-w-sm mb-5">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm">
          Try Again
        </Button>
      )}
    </div>
  );
}
