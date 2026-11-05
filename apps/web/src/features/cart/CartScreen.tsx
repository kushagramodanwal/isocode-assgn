import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Gift,
  HelpCircle,
  Percent,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { MockBadge } from '../../components/Badges';
import { Button } from '../../components/Button';
import { Money } from '../../components/Money';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import { Stepper } from '../../components/Stepper';
import { useI18n } from '../../i18n';
import { apiRequest } from '../../lib/api';
import { useCart } from './CartContext';

export function CartScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { items, updateQuantity, clearCart } = useCart();

  const [paymentMode, setPaymentMode] = useState<'credit_account' | 'online_mock'>('credit_account');
  const [demoOutcome, setDemoOutcome] = useState<'succeeds' | 'fails'>('succeeds');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Authoritative server-side scheme and pricing preview (Spec 4.1 & 4.2)
  const cartLinesPayload = items.map((i) => ({ skuCode: i.skuCode, cases: i.cases }));

  const { data: previewData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['cartPreview', cartLinesPayload],
    queryFn: () =>
      apiRequest<any>('/api/v1/cart/preview', {
        method: 'POST',
        body: JSON.stringify({ lines: cartLinesPayload }),
      }),
    enabled: items.length > 0,
  });

  if (items.length === 0) {
    return (
      <EmptyState
        title={t.yourCart}
        message={t.emptyCart}
        actionLabel={t.browseCatalogue}
        onAction={() => navigate('/catalogue')}
      />
    );
  }

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const idempotencyKey = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const order = await apiRequest<any>('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          lines: cartLinesPayload,
          paymentMode,
          demoPaymentOutcome: paymentMode === 'online_mock' ? demoOutcome : undefined,
        }),
      });

      clearCart();
      navigate('/orders');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calc = previewData?.calculation;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-main">{t.yourCart}</h1>
        <button
          onClick={clearCart}
          className="text-xs text-status-error hover:underline flex items-center gap-1 font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Cart</span>
        </button>
      </div>

      {submitError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-status-error font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Cart Items List */}
      <div className="bg-bg-surface rounded-xl border border-border divide-y divide-border/60 shadow-xs">
        {items.map((item) => {
          const lineCalc = calc?.lines?.find((l: any) => l.skuCode === item.skuCode);
          return (
            <div key={item.skuCode} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-xs font-semibold text-accent uppercase tracking-wider">
                  {item.brand}
                </div>
                <div className="text-sm font-bold text-text-main">{item.name}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  SKU: <span className="font-mono">{item.skuCode}</span>
                </div>

                {/* Scheme explanation */}
                {lineCalc && (
                  <div className="mt-2 text-xs font-medium text-amber-900 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-md inline-block">
                    ⚡ {lineCalc.explanation}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                <Stepper
                  value={item.cases}
                  onChange={(qty) => updateQuantity(item.skuCode, qty)}
                  min={0}
                />

                <div className="text-right min-w-[90px]">
                  <div className="text-sm font-bold text-text-main">
                    <Money paise={lineCalc ? lineCalc.finalLineTotalPaise : item.unitPricePaise} />
                  </div>
                  {lineCalc && lineCalc.discountPaise > 0 && (
                    <div className="text-[11px] text-status-success font-medium">
                      Saved <Money paise={lineCalc.discountPaise} />
                    </div>
                  )}
                  {lineCalc && lineCalc.freeCases > 0 && (
                    <div className="text-[11px] text-amber-700 font-bold">
                      +{lineCalc.freeCases} Free Cases
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Server Calculation Breakdown */}
      {isLoading ? (
        <div className="bg-bg-surface p-4 rounded-xl border border-border space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : calc ? (
        <div className="bg-bg-surface p-5 rounded-xl border border-border shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Price & Scheme Breakdown (Authoritative Server Preview)
          </h3>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>{t.cartSubtotal}</span>
              <Money paise={calc.subtotalPaise} showSymbol={true} />
            </div>

            {calc.totalDiscountPaise > 0 && (
              <div className="flex justify-between text-status-success font-medium">
                <span>{t.schemeDiscount}</span>
                <span>-<Money paise={calc.totalDiscountPaise} /></span>
              </div>
            )}

            {calc.totalFreeCases > 0 && (
              <div className="flex justify-between text-amber-700 font-medium">
                <span>{t.freeCasesAwarded}</span>
                <span>+{calc.totalFreeCases} Cases</span>
              </div>
            )}

            <div className="flex justify-between text-base font-bold text-text-main pt-2 border-t border-border">
              <span>{t.orderTotal}</span>
              <Money paise={calc.totalPaise} className="text-lg text-accent" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Credit & Payment Selection (Spec 4.4 & 4.5) */}
      <div className="bg-bg-surface p-5 rounded-xl border border-border shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
          <span>{t.selectPaymentMode}</span>
          <MockBadge label="DEMO SWITCH" />
        </h3>

        {/* Credit Exposure status */}
        {previewData && (
          <div className="p-3.5 rounded-lg bg-bg-subtle border border-border text-xs space-y-1 text-text-muted">
            <div className="flex justify-between">
              <span>{t.creditLimit}:</span>
              <Money paise={previewData.creditLimitPaise} />
            </div>
            <div className="flex justify-between">
              <span>{t.openExposure}:</span>
              <Money paise={previewData.openExposurePaise} />
            </div>
            <div className="flex justify-between font-bold text-text-main pt-1 border-t border-border/50">
              <span>{t.availableCredit}:</span>
              <Money paise={previewData.availableCreditPaise} className="text-accent" />
            </div>
          </div>
        )}

        {/* Payment Mode Radio Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-colors ${
              paymentMode === 'credit_account'
                ? 'border-accent bg-accent/5'
                : 'border-border bg-bg-surface hover:bg-bg-subtle/50'
            }`}
          >
            <input
              type="radio"
              name="paymentMode"
              checked={paymentMode === 'credit_account'}
              onChange={() => setPaymentMode('credit_account')}
              className="mt-1"
            />
            <div>
              <div className="font-bold text-sm text-text-main flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-accent" />
                <span>{t.payOnCredit}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Settled on regular distributor credit cycle. Over-limit orders held for desk review.
              </p>
            </div>
          </label>

          <label
            className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-colors ${
              paymentMode === 'online_mock'
                ? 'border-accent bg-accent/5'
                : 'border-border bg-bg-surface hover:bg-bg-subtle/50'
            }`}
          >
            <input
              type="radio"
              name="paymentMode"
              checked={paymentMode === 'online_mock'}
              onChange={() => setPaymentMode('online_mock')}
              className="mt-1"
            />
            <div>
              <div className="font-bold text-sm text-text-main flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-accent" />
                <span>{t.payOnlineMock}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Simulated UPI / Netbanking gateway. Zero actual funds moved.
              </p>
            </div>
          </label>
        </div>

        {/* Demo outcome switch (Spec 4.5: Visible and labelled "Demo payment, no money moves") */}
        {paymentMode === 'online_mock' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>{t.demoOutcomeLabel}</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-green-900 cursor-pointer">
                <input
                  type="radio"
                  name="demoOutcome"
                  checked={demoOutcome === 'succeeds'}
                  onChange={() => setDemoOutcome('succeeds')}
                />
                <span>{t.demoOutcomeSucceeds}</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs font-semibold text-red-900 cursor-pointer">
                <input
                  type="radio"
                  name="demoOutcome"
                  checked={demoOutcome === 'fails'}
                  onChange={() => setDemoOutcome('fails')}
                />
                <span>{t.demoOutcomeFails}</span>
              </label>
            </div>
          </div>
        )}

        <Button
          onClick={handlePlaceOrder}
          variant="primary"
          size="lg"
          className="w-full text-base font-bold shadow-md"
          isLoading={isSubmitting}
        >
          <span>{isSubmitting ? t.placingOrder : t.placeOrder}</span>
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
