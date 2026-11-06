/**
 * Tally export. Pure. Produces a Tally Prime XML import of Sales Order vouchers, plus a CSV
 * for people who prefer a spreadsheet. Ledger names must match the client's Tally masters,
 * so they live in one place (assumption A-14, verify with the client's accountant).
 */
export const TALLY_LEDGERS = {
  company: "Company A",
  salesPrefix: "Sales GST", // e.g. "Sales GST 18%"
  cgst: "Output CGST",
  sgst: "Output SGST",
  discount: "Scheme Discount",
};

export type ExportLine = {
  sku: string;
  itemName: string; // Tally stock item name
  cases: number;
  freeCases: number;
  casePricePaise: number;
  grossPaise: number;
  discountPaise: number;
  taxablePaise: number;
  gstRateBp: number;
  gstPaise: number;
};

export type ExportOrder = {
  number: number;
  date: Date;
  partyLedger: string; // retailer's Tally ledger, e.g. "Sharma Kirana (JBP-R-0001)"
  source: string;
  lines: ExportLine[];
  totalPaise: number;
};

export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

/** Tally amounts: rupees with 2 decimals. Sign convention: debit (party) negative, credits positive. */
function amt(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function tallyDate(d: Date): string {
  // Dates are in India time regardless of server timezone.
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10).replace(/-/g, "");
}

export function voucherNumber(n: number): string {
  return `SO-${String(n).padStart(6, "0")}`;
}

/** CGST and SGST split per rate. Odd paise go to SGST so the halves always add up. */
export function gstSplit(lines: ExportLine[]): { rateBp: number; cgstPaise: number; sgstPaise: number }[] {
  const byRate = new Map<number, number>();
  for (const l of lines) byRate.set(l.gstRateBp, (byRate.get(l.gstRateBp) ?? 0) + l.gstPaise);
  return [...byRate.entries()]
    .filter(([, g]) => g > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([rateBp, g]) => ({ rateBp, cgstPaise: Math.floor(g / 2), sgstPaise: g - Math.floor(g / 2) }));
}

function voucherXml(o: ExportOrder): string {
  const L = TALLY_LEDGERS;
  const inv = o.lines
    .map((l) => {
      const actual = l.cases + l.freeCases;
      return `
      <ALLINVENTORYENTRIES.LIST>
        <STOCKITEMNAME>${escapeXml(l.itemName)}</STOCKITEMNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <RATE>${amt(l.casePricePaise)}/case</RATE>
        <ACTUALQTY> ${actual} case</ACTUALQTY>
        <BILLEDQTY> ${l.cases} case</BILLEDQTY>
        <AMOUNT>${amt(l.taxablePaise)}</AMOUNT>
        <ACCOUNTINGALLOCATIONS.LIST>
          <LEDGERNAME>${escapeXml(`${L.salesPrefix} ${l.gstRateBp / 100}%`)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${amt(l.taxablePaise)}</AMOUNT>
        </ACCOUNTINGALLOCATIONS.LIST>
      </ALLINVENTORYENTRIES.LIST>`;
    })
    .join("");
  const tax = gstSplit(o.lines)
    .map(
      (g) => `
      <LEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXml(`${L.cgst} ${g.rateBp / 200}%`)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${amt(g.cgstPaise)}</AMOUNT>
      </LEDGERENTRIES.LIST>
      <LEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXml(`${L.sgst} ${g.rateBp / 200}%`)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${amt(g.sgstPaise)}</AMOUNT>
      </LEDGERENTRIES.LIST>`,
    )
    .join("");
  return `
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
    <VOUCHER VCHTYPE="Sales Order" ACTION="Create">
      <DATE>${tallyDate(o.date)}</DATE>
      <VOUCHERTYPENAME>Sales Order</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${voucherNumber(o.number)}</VOUCHERNUMBER>
      <REFERENCE>${escapeXml(o.source)}</REFERENCE>
      <PARTYLEDGERNAME>${escapeXml(o.partyLedger)}</PARTYLEDGERNAME>
      <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
      <LEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXml(o.partyLedger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>${amt(-o.totalPaise)}</AMOUNT>
      </LEDGERENTRIES.LIST>${inv}${tax}
    </VOUCHER>
  </TALLYMESSAGE>`;
}

export function buildTallyXml(orders: ExportOrder[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
 <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES><SVCURRENTCOMPANY>${escapeXml(TALLY_LEDGERS.company)}</SVCURRENTCOMPANY></STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>${orders.map(voucherXml).join("")}
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>
`;
}

function csvCell(v: string | number): string {
  const s = String(v);
  // Neutralise spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildCsv(orders: ExportOrder[]): string {
  const head = ["voucher", "date", "party", "sku", "item", "billed_cases", "free_cases", "case_rate", "gross", "discount", "taxable", "gst_rate", "gst", "line_total"];
  const rows = orders.flatMap((o) =>
    o.lines.map((l) => [
      voucherNumber(o.number), tallyDate(o.date), o.partyLedger, l.sku, l.itemName, l.cases, l.freeCases,
      amt(l.casePricePaise), amt(l.grossPaise), amt(l.discountPaise), amt(l.taxablePaise), `${l.gstRateBp / 100}%`,
      amt(l.gstPaise), amt(l.taxablePaise + l.gstPaise),
    ]),
  );
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}
