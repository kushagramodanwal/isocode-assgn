import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  Clock,
  CreditCard,
  FileText,
  RotateCcw,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { MockBadge, PaymentBadge, StatusChip } from '../../components/Badges';
import { Button } from '../../components/Button';
import { Money } from '../../components/Money';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import { useI18n } from '../../i18n';
import { apiRequest } from '../../lib/api';

export function OrderHistoryScreen() {
  const { t } = useI18n();
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  const {
    data: ordersData,
    isLoading: ordersLoading,
    isError: ordersError,
    refetch: refetchOrders,
  } = useQuery<{ orders: any[] }>({
    queryKey: ['retailerOrders'],
    queryFn: () => apiRequest('/api/v1/orders'),
  });

  const { data: notifData } = useQuery<{ notifications: any[] }>({
    queryKey: ['retailerNotifications'],
    queryFn: () => apiRequest('/api/v1/notifications'),
  });

  const handleRetryPayment = async (orderId: string, newMode: 'credit_account' | 'online_mock') => {
    try {
      await apiRequest(`/api/v1/orders/${orderId}/retry-payment`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMode: newMode,
          demoPaymentOutcome: 'succeeds',
        }),
      });
      setRetryingOrderId(null);
      refetchOrders();
    } catch (err: any) {
      alert(err.message || 'Payment retry failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-main">{t.retailerNavOrders}</h1>
        <MockBadge label="RETAILER VIEW" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Orders List */}
        <div className="lg:col-span-2 space-y-4">
          {ordersLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-bg-surface p-4 rounded-xl border border-border space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
          )}

          {ordersError && (
            <ErrorState message="Failed to load your orders" onRetry={() => refetchOrders()} />
          )}

          {!ordersLoading && !ordersError && ordersData?.orders?.length === 0 && (
            <EmptyState
              title="No Orders Placed Yet"
              message="Your orders history is empty. Start shopping from the catalogue."
            />
          )}

          {!ordersLoading && ordersData?.orders && ordersData.orders.map((order) => (
            <div
              key={order.id}
              className="bg-bg-surface p-5 rounded-xl border border-border shadow-xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div>
                  <span className="font-bold font-mono text-sm text-text-main">
                    {order.orderNumber}
                  </span>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    Placed: {new Date(order.placedAt).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusChip status={order.status} />
                  <PaymentBadge mode={order.paymentMode} status={order.paymentStatus} />
                </div>
              </div>

              {/* Order Lines summary */}
              <div className="text-xs text-text-muted space-y-1">
                {(order.lines || []).map((line: any) => (
                  <div key={line.id} className="flex justify-between">
                    <span>
                      {line.sku.name} × {line.billedCases} cases
                      {line.freeCases > 0 && (
                        <span className="text-amber-700 font-bold ml-1">
                          (+{line.freeCases} Free)
                        </span>
                      )}
                    </span>
                    <Money paise={line.lineTotalPaise} />
                  </div>
                ))}
              </div>

              {/* Hold Reason Banner */}
              {order.holdReason && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Order Note: </span>
                    <span>{order.holdReason}</span>
                  </div>
                </div>
              )}

              {/* Retry Payment Action on Failed Orders (Spec 4.5 & 10.5) */}
              {order.status === 'payment_failed' && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-status-error" />
                    <span>Payment failed. Choose another payment mode to continue order:</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      onClick={() => handleRetryPayment(order.id, 'credit_account')}
                      variant="primary"
                      size="sm"
                    >
                      <Wallet className="w-3.5 h-3.5 mr-1.5" />
                      Switch to Credit Account
                    </Button>

                    <Button
                      onClick={() => handleRetryPayment(order.id, 'online_mock')}
                      variant="outline"
                      size="sm"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                      Retry Online Payment (Demo)
                    </Button>
                  </div>
                </div>
              )}

              {/* Total footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-sm font-bold">
                <span className="text-text-muted">Total:</span>
                <Money paise={order.totalPaise} className="text-base text-accent" />
              </div>
            </div>
          ))}
        </div>

        {/* Right 1 Col: Updates & Notifications Panel (Spec 4.9 & 10.5) */}
        <div className="space-y-3">
          <div className="bg-bg-surface p-4 rounded-xl border border-border shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-main">
                  Updates & SMS Log
                </h3>
              </div>
              <MockBadge label="DEMO MSG" />
            </div>

            <div className="space-y-3">
              {!notifData?.notifications || notifData.notifications.length === 0 ? (
                <p className="text-xs text-text-muted">No notifications logged yet.</p>
              ) : (
                notifData.notifications.map((notif: any) => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-lg bg-bg-subtle border border-border text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span className="font-bold text-accent uppercase">{notif.template}</span>
                      <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-text-main font-medium leading-relaxed">{notif.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
