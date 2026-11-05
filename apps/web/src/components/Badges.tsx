import React from 'react';
import { useI18n } from '../i18n';

export function StockBadge({ band, onHand }: { band: 'in_stock' | 'low' | 'out'; onHand?: number }) {
  const { t } = useI18n();

  if (band === 'out') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-status-error border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-status-error mr-1.5" />
        {t.stockBandOut}
      </span>
    );
  }

  if (band === 'low') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-status-warning border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-status-warning mr-1.5" />
        {t.stockBandLow} {onHand !== undefined ? `(${onHand})` : ''}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-status-success border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-status-success mr-1.5" />
      {t.stockBandInStock}
    </span>
  );
}

export function SchemeBadge({ description }: { description: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
      ⚡ {description}
    </span>
  );
}

export function ConfidenceBadge({
  confidence,
}: {
  confidence: 'high' | 'medium' | 'needs_clarification' | 'unresolved';
}) {
  const badges = {
    high: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', label: 'High Confidence' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'Alternative SKU' },
    needs_clarification: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', label: 'Unit Unclear' },
    unresolved: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'Unresolved' },
  };

  const b = badges[confidence];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${b.bg} ${b.text} ${b.border}`}>
      {b.label}
    </span>
  );
}

export function PaymentBadge({ mode, status }: { mode: string; status: string }) {
  const isCredit = mode === 'credit_account';
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700 border border-stone-300">
        {isCredit ? 'Credit Account' : 'Demo Online'}
      </span>
      {status === 'failed' && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
          Payment Failed
        </span>
      )}
      {status === 'succeeded' && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
          Paid (Demo)
        </span>
      )}
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    pending_desk: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800', label: 'Pending Desk' },
    on_hold: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', label: 'Credit Hold' },
    approved: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800', label: 'Approved' },
    exported: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800', label: 'Exported (Tally)' },
    payment_failed: { bg: 'bg-red-100 border-red-300', text: 'text-red-800', label: 'Payment Failed' },
    rejected: { bg: 'bg-stone-200 border-stone-400', text: 'text-stone-700', label: 'Rejected' },
    cancelled: { bg: 'bg-stone-100 border-stone-300', text: 'text-stone-500', label: 'Cancelled' },
  };

  const style = styles[status] || { bg: 'bg-stone-100 border-stone-300', text: 'text-stone-700', label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

export function MockBadge({ label = 'MOCK' }: { label?: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-stone-200 text-stone-700 border border-stone-400">
      {label}
    </span>
  );
}
