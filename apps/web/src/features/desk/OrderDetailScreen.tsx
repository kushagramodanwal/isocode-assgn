import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Edit2,
  HelpCircle,
  Package,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { MockBadge, PaymentBadge, StatusChip, StockBadge } from '../../components/Badges';
import { Button } from '../../components/Button';
import { Money } from '../../components/Money';
import { ErrorState, Skeleton } from '../../components/States';
import { Stepper } from '../../components/Stepper';
import { useI18n } from '../../i18n';
import { apiRequest } from '../../lib/api';

export function OrderDetailScreen() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Line editing modal / state
  const [editingLine, setEditingLine] = useState<any | null>(null);
  const [editedCases, setEditedCases] = useState(1);
  const [createAlias, setCreateAlias] = useState(true);
  const [aliasPhrase, setAliasPhrase] = useState('');

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['deskOrderDetail', id],
    queryFn: () => apiRequest<any>(`/api/v1/desk/orders/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <ErrorState
        message={(error as any)?.message || 'Order not found'}
        onRetry={() => refetch()}
      />
    );
  }

  const handleApprove = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await apiRequest(`/api/v1/desk/orders/${id}/approve`, { method: 'POST' });
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Approval failed (check stock allocations)');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;

    setIsProcessing(true);
    setActionError(null);
    try {
      await apiRequest(`/api/v1/desk/orders/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject order');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReleaseHold = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await apiRequest(`/api/v1/desk/orders/${id}/release-hold`, { method: 'POST' });
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to release credit hold');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveLine = async () => {
    if (!editingLine) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      // Optimistic locking: pass current order.version in If-Match header (Spec 4.7)
      await apiRequest(`/api/v1/desk/orders/${id}/lines/${editingLine.id}`, {
        method: 'PATCH',
        headers: {
          'If-Match': order.version.toString(),
        },
        body: JSON.stringify({
          billedCases: editedCases,
          createAlias,
          aliasPhrase: createAlias ? aliasPhrase : undefined,
        }),
      });

      setEditingLine(null);
      refetch();
    } catch (err: any) {
      if (err.code === 'CONFLICT' || err.statusCode === 409) {
        setActionError('Order was modified by someone else. Please reload.');
      } else {
        setActionError(err.message || 'Failed to update line');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isPendingDesk = order.status === 'pending_desk';
  const isOnHold = order.status === 'on_hold';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/desk')}
            className="p-2 rounded-lg border border-border bg-bg-surface hover:bg-bg-subtle text-text-muted transition-colors touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-text-main">
                {order.orderNumber}
              </h1>
              <span className="text-xs text-text-muted font-mono bg-bg-subtle px-1.5 py-0.5 rounded">
                v{order.version}
              </span>
              <StatusChip status={order.status} />
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              Shop: <strong className="text-text-main">{order.retailer?.name}</strong> ({order.retailer?.code})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PaymentBadge mode={order.paymentMode} status={order.paymentStatus} />
          <MockBadge label="DESK VIEW" />
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-status-error font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Refund Required Notice (Spec 4.5 & 4.7) */}
      {order.refundStatus === 'required_mock' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Demo Refund Required</div>
            <p className="mt-0.5">
              This order was paid online via mock gateway and later rejected. In production, an automated refund would be triggered.
            </p>
          </div>
        </div>
      )}

      {/* AI Draft Message Comparison Card (Spec 4.7: Original message beside parsed lines) */}
      {order.aiDraft && (
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
          <div className="flex items-center gap-2 text-purple-900 font-bold">
            <Bot className="w-4 h-4 text-purple-700" />
            <span>AI Drafted Order: Original Shop Message</span>
          </div>
          <div className="p-3 rounded-lg bg-white/80 border border-purple-200/80 font-medium text-purple-950 italic">
            "{order.aiDraft.rawMessage}"
          </div>
        </div>
      )}

      {/* Order Lines Table */}
      <div className="bg-bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/80 flex items-center justify-between">
          <h3 className="font-bold text-sm text-text-main">Order Items & Stock Allocations</h3>
          <span className="text-xs text-text-muted">
            Click edit to change quantities or teach aliases
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-bg-subtle border-b border-border text-text-muted font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">SKU / Product</th>
                <th className="py-3 px-4">Stock on Hand</th>
                <th className="py-3 px-4 text-center">Billed Cases</th>
                <th className="py-3 px-4 text-center">Free Cases</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Line Total</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {order.lines.map((line: any) => {
                const stockOnHand = line.sku?.stock?.onHandCases ?? 0;
                const totalNeeded = line.billedCases + line.freeCases;
                const isShort = stockOnHand < totalNeeded;

                return (
                  <tr key={line.id} className="hover:bg-bg-subtle/40">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-accent">{line.sku?.code}</div>
                      <div className="font-bold text-text-main text-xs">{line.sku?.name}</div>
                      {line.schemeExplanation && (
                        <div className="text-[11px] text-amber-800 mt-0.5">
                          ⚡ {line.schemeExplanation}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`font-bold tabular-nums ${isShort ? 'text-status-error font-extrabold' : 'text-text-main'}`}>
                        {stockOnHand} cases
                      </span>
                      {isShort && (
                        <div className="text-[10px] text-status-error font-semibold">
                          Short by {totalNeeded - stockOnHand} cases
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-bold">{line.billedCases}</td>
                    <td className="py-3 px-4 text-center font-bold text-amber-700">
                      {line.freeCases > 0 ? `+${line.freeCases}` : '0'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Money paise={line.unitPricePaise} />
                    </td>

                    <td className="py-3 px-4 text-right font-bold">
                      <Money paise={line.lineTotalPaise} />
                    </td>

                    <td className="py-3 px-4 text-center">
                      {(isPendingDesk || isOnHold) && (
                        <button
                          onClick={() => {
                            setEditingLine(line);
                            setEditedCases(line.billedCases);
                            setAliasPhrase(line.sku?.code);
                          }}
                          className="px-2 py-1 rounded border border-border bg-bg-surface hover:bg-bg-subtle text-accent text-xs font-semibold flex items-center gap-1 mx-auto"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-bg-subtle border-t border-border flex justify-between items-center font-bold text-base text-text-main">
          <span>Total Order Value:</span>
          <Money paise={order.totalPaise} className="text-lg text-accent" />
        </div>
      </div>

      {/* Desk Actions Bar (Approve, Reject, Release Hold) */}
      <div className="bg-bg-surface p-4 rounded-xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-text-muted">
          Current status: <strong className="text-text-main">{order.status}</strong>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOnHold && (
            <Button
              onClick={handleReleaseHold}
              variant="outline"
              size="md"
              isLoading={isProcessing}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              <span>{t.releaseHold}</span>
            </Button>
          )}

          {(isPendingDesk || isOnHold) && (
            <Button
              onClick={handleReject}
              variant="danger"
              size="md"
              isLoading={isProcessing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              <span>{t.rejectOrder}</span>
            </Button>
          )}

          {isPendingDesk && (
            <Button
              onClick={handleApprove}
              variant="primary"
              size="md"
              isLoading={isProcessing}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              <span>{t.approveOrder}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Edit Line Modal with Alias Learning (Spec 5.7) */}
      {editingLine && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-text-main">Edit Order Line</h3>
            <p className="text-xs text-text-muted">
              Editing SKU: <strong className="text-text-main">{editingLine.sku?.name}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Billed Cases
              </label>
              <Stepper
                value={editedCases}
                onChange={setEditedCases}
                min={0}
                max={999}
              />
            </div>

            {/* Alias Learning Checkbox (Spec 5.7: Remember this for shop) */}
            <div className="p-3 rounded-lg bg-bg-subtle border border-border/80 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createAlias}
                  onChange={(e) => setCreateAlias(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-xs font-semibold text-text-main">
                  Remember this alias for {order.retailer?.name}
                </span>
              </label>

              {createAlias && (
                <div>
                  <input
                    type="text"
                    value={aliasPhrase}
                    onChange={(e) => setAliasPhrase(e.target.value)}
                    placeholder="e.g. chhota parle or biscuit chhota"
                    className="w-full px-3 py-1.5 rounded-lg border border-border text-xs text-text-main bg-white"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Future AI messages from this retailer containing this phrase will resolve without calling the model.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => setEditingLine(null)}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLine}
                variant="primary"
                size="sm"
                isLoading={isProcessing}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
