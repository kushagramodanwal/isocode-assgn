import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bot,
  CheckCircle,
  FileDown,
  Filter,
  Search,
  TableProperties,
} from 'lucide-react';
import { MockBadge, PaymentBadge, StatusChip } from '../../components/Badges';
import { Button } from '../../components/Button';
import { Money } from '../../components/Money';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import { useI18n } from '../../i18n';
import { apiRequest } from '../../lib/api';

export function DeskQueueScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery<{
    orders: any[];
    statusCounts: Record<string, number>;
  }>({
    queryKey: ['deskOrders', statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('q', search);
      return apiRequest(`/api/v1/desk/orders?${params.toString()}`);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main flex items-center gap-2">
            <TableProperties className="w-5 h-5 text-accent" />
            <span>{t.deskOrderQueue}</span>
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Review incoming orders, verify stock allocations, and export for Tally
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/desk/exports')}
            variant="outline"
            size="md"
          >
            <FileDown className="w-4 h-4 mr-2" />
            <span>{t.exportToTally}</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      {data?.statusCounts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setStatusFilter('')}
            className={`p-3 rounded-xl border text-left transition-colors ${
              statusFilter === '' ? 'bg-accent/10 border-accent' : 'bg-bg-surface border-border'
            }`}
          >
            <div className="text-[11px] font-semibold text-text-muted uppercase">Default Queue</div>
            <div className="text-xl font-bold text-text-main mt-0.5">
              {(data.statusCounts.pending_desk || 0) + (data.statusCounts.on_hold || 0)}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('pending_desk')}
            className={`p-3 rounded-xl border text-left transition-colors ${
              statusFilter === 'pending_desk' ? 'bg-blue-100/60 border-blue-400' : 'bg-bg-surface border-border'
            }`}
          >
            <div className="text-[11px] font-semibold text-blue-800 uppercase">Pending Review</div>
            <div className="text-xl font-bold text-blue-900 mt-0.5">
              {data.statusCounts.pending_desk || 0}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('on_hold')}
            className={`p-3 rounded-xl border text-left transition-colors ${
              statusFilter === 'on_hold' ? 'bg-amber-100/60 border-amber-400' : 'bg-bg-surface border-border'
            }`}
          >
            <div className="text-[11px] font-semibold text-amber-800 uppercase">Credit Holds</div>
            <div className="text-xl font-bold text-amber-900 mt-0.5">
              {data.statusCounts.on_hold || 0}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`p-3 rounded-xl border text-left transition-colors ${
              statusFilter === 'approved' ? 'bg-emerald-100/60 border-emerald-400' : 'bg-bg-surface border-border'
            }`}
          >
            <div className="text-[11px] font-semibold text-emerald-800 uppercase">Approved</div>
            <div className="text-xl font-bold text-emerald-900 mt-0.5">
              {data.statusCounts.approved || 0}
            </div>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-bg-surface p-3.5 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number or shop name..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-bg-base text-xs sm:text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 rounded-lg border border-border bg-bg-base text-xs font-semibold text-text-main focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">Pending & On Hold (Active Queue)</option>
            <option value="pending_desk">Pending Desk Only</option>
            <option value="on_hold">Credit Hold Only</option>
            <option value="approved">Approved Only</option>
            <option value="exported">Exported to Tally Only</option>
            <option value="payment_failed">Payment Failed Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {isLoading && (
        <div className="bg-bg-surface p-4 rounded-xl border border-border space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState message="Failed to load desk order queue" onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && data?.orders?.length === 0 && (
        <EmptyState
          title="Desk Queue is Clean"
          message="No orders currently match the selected filter."
        />
      )}

      {!isLoading && data?.orders && data.orders.length > 0 && (
        <div className="bg-bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bg-subtle border-b border-border text-text-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Retailer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.orders.map((order: any) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/desk/orders/${order.id}`)}
                    className="hover:bg-bg-subtle/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-accent">{order.orderNumber}</div>
                      <div className="text-[10px] text-text-muted">
                        {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-text-main flex items-center gap-1.5">
                        <span>{order.retailer?.name}</span>
                        {order.aiDraftId && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-bold">
                            <Bot className="w-3 h-3" />
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-text-muted">
                        {order.retailer?.code}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <StatusChip status={order.status} />
                    </td>

                    <td className="py-3 px-4">
                      <PaymentBadge mode={order.paymentMode} status={order.paymentStatus} />
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-text-main">
                      <Money paise={order.totalPaise} />
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/desk/orders/${order.id}`);
                        }}
                        className="p-1.5 text-accent hover:bg-accent-subtle rounded-lg transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
