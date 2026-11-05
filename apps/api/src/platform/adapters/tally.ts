import crypto from 'crypto';
import { formatPaiseToRupees } from '@retailer/domain';

export interface TallyOrderLineExport {
  orderNumber: string;
  orderDate: Date;
  retailerCode: string;
  retailerName: string;
  skuCode: string;
  billedCases: number;
  freeCases: number;
  unitPricePaise: bigint;
  lineDiscountPaise: bigint;
  gstInclusive: boolean;
  lineTotalPaise: bigint;
  orderTotalPaise: bigint;
}

export interface TallyExportResult {
  csvContent: string;
  fileSha256: string;
  rowCount: number;
}

export interface TallyExporter {
  exportToCsv(lines: TallyOrderLineExport[]): Promise<TallyExportResult>;
}

export class MockTallyExporter implements TallyExporter {
  async exportToCsv(lines: TallyOrderLineExport[]): Promise<TallyExportResult> {
    const headers = [
      'order_number',
      'order_date',
      'retailer_code',
      'retailer_name',
      'sku_code',
      'billed_cases',
      'free_cases',
      'unit_price_rupees',
      'line_discount_rupees',
      'gst_inclusive',
      'line_total_rupees',
      'order_total_rupees',
    ];

    const rows = lines.map((line) => {
      return [
        `"${line.orderNumber}"`,
        `"${line.orderDate.toISOString().split('T')[0]}"`,
        `"${line.retailerCode}"`,
        `"${line.retailerName.replace(/"/g, '""')}"`,
        `"${line.skuCode}"`,
        line.billedCases,
        line.freeCases,
        formatPaiseToRupees(line.unitPricePaise),
        formatPaiseToRupees(line.lineDiscountPaise),
        line.gstInclusive ? 'YES' : 'NO',
        formatPaiseToRupees(line.lineTotalPaise),
        formatPaiseToRupees(line.orderTotalPaise),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const fileSha256 = crypto.createHash('sha256').update(csvContent, 'utf8').digest('hex');

    return {
      csvContent,
      fileSha256,
      rowCount: lines.length,
    };
  }
}
