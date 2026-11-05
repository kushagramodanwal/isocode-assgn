import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckSquare,
  Download,
  FileCheck,
  FileDown,
  FileSpreadsheet,
  History,
  Info,
  Square,
} from 'lucide-react';
import { MockBadge } from '../../components/Badges';
import { Button } from '../../components/Button';
import { Money } from '../../components/Money';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import { apiRequest } from '../../lib/api';

export function DeskExportScreen() {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Fetch approved orders ready to export
  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery<{ orders: any[] }>({
    queryKey: ['approvedOrdersForExport'],
    queryFn: () => apiRequest('/api/v1/desk/orders?status=approved'),
  });

  // Fetch export batches history
  const { data: batchesData, refetch: refetchBatches } = useQuery<any[]>({
    queryKey: ['exportBatches'],
    queryFn: () => apiRequest('/api/v1/desk/exports'),
  });

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!ordersData?.orders) return;
    if (selectedOrderIds.length === ordersData.orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(ordersData.orders.map((o) => o.id));
    }
  };

  const handleExport = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const res = await apiRequest<any>('/api/v1/desk/exports/csv', {
        method: 'POST',
        body: JSON.stringify({ orderIds: selectedOrderIds }),
      });

      setExportResult(res);
      setSelectedOrderIds([]);
      refetchOrders();
      refetchBatches();
    } catch (err: any) {
      setExportError(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const approvedOrders = ordersData?.orders || [];

  return (
    <div className="space-y-6">
      {/* Header with Assumption A6 Notice */}
      <div className="bg-bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-accent" />
            <h1 className="text-xl font-bold text-text-main">Tally CSV Export Desk</h1>
          </div>
          <MockBadge label="TALLY EXPORTER" />
        </div>

        {/* Spec 4.10 & 14.1 Assumption A6 Label */}
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Assumption A6: </span>
            <span>
              The export is a documented CSV format. Direct import into Tally is subject to client format confirmation.
            </span>
          </div>
        </div>
      </div>

      {exportError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-status-error font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Export Result Card */}
      {exportResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <FileCheck className="w-5 h-5 text-status-success" />
              <span>Export Batch Generated Successfully!</span>
            </div>
            <a
              href={`/api/v1/desk/exports/${exportResult.batch?.id}/file`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors touch-target"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-emerald-900 pt-1 border-t border-emerald-200">
            <div>Batch ID: <strong className="font-mono">{exportResult.batch?.id?.slice(0, 8)}</strong></div>
            <div>Orders Included: <strong>{exportResult.batch?.orderCount}</strong></div>
            <div>File SHA256: <strong className="font-mono text-[10px]">{exportResult.batch?.fileSha256?.slice(0, 16)}...</strong></div>
          </div>
        </div>
      )}

      {/* Approved Orders List Ready to Export */}
      <div className="bg-bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-text-main"
            >
              {selectedOrderIds.length > 0 && selectedOrderIds.length === approvedOrders.length ? (
                <CheckSquare className="w-4 h-4 text-accent" />
              ) : (
                <Square className="w-4 h-4 text-text-muted" />
              )}
              <span>Select All ({approvedOrders.length})</span>
            </button>
            <span className="text-xs text-text-muted">
              {selectedOrderIds.length} orders selected
            </span>
          </div>

          <Button
            onClick={handleExport}
            disabled={selectedOrderIds.length === 0}
            variant="primary"
            size="sm"
            isLoading={isExporting}
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            <span>Export Selected ({selectedOrderIds.length})</span>
          </Button>
        </div>

        {ordersLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-10 w-full" />
            ))}
          </div>
        ) : approvedOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">
            No approved orders currently waiting for export.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {approvedOrders.map((order: any) => {
              const isSelected = selectedOrderIds.includes(order.id);
              return (
                <div
                  key={order.id}
                  onClick={() => toggleSelectOrder(order.id)}
                  className={`p-3.5 px-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-bg-subtle/50 transition-colors ${
                    isSelected ? 'bg-accent/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOrder(order.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <span className="font-mono font-bold text-xs text-accent">
                        {order.orderNumber}
                      </span>
                      <div className="text-xs font-medium text-text-main">
                        {order.retailer?.name} ({order.retailer?.code})
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <Money paise={order.totalPaise} className="text-sm font-bold" />
                    <div className="text-[10px] text-text-muted">
                      {order.lines?.length || 0} line items
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export Batch History */}
      <div className="bg-bg-surface p-5 rounded-xl border border-border shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <History className="w-4 h-4 text-accent" />
          <h3 className="font-bold text-sm text-text-main">Export Batches History</h3>
        </div>

        {batchesData && batchesData.length > 0 ? (
          <div className="space-y-2">
            {batchesData.map((batch: any) => (
              <div
                key={batch.id}
                className="p-3 rounded-lg bg-bg-subtle border border-border flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-mono font-bold text-text-main">
                    Batch #{batch.id.slice(0, 8)}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    {new Date(batch.createdAt).toLocaleString('en-IN')} · {batch.orderCount} orders · SHA-256: {batch.fileSha256?.slice(0, 12)}...
                  </div>
                </div>

                <a
                  href={`/api/v1/desk/exports/${batch.id}/file`}
                  download
                  className="px-2.5 py-1.5 rounded bg-white hover:bg-stone-50 border border-border text-accent font-semibold flex items-center gap-1.5 touch-target"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">No export batches generated yet.</p>
        )}
      </div>
    </div>
  );
}
