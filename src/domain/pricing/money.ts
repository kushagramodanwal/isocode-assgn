/** Integer-paise helpers (A-04). Inputs must be non-negative safe integers. */

/** round-half-up(paise × bps / 10000), exact in integer arithmetic. */
export function applyBps(paise: number, bps: number): number {
  if (!Number.isSafeInteger(paise) || !Number.isSafeInteger(bps) || paise < 0 || bps < 0) {
    throw new RangeError(`applyBps expects non-negative integers, got ${paise}, ${bps}`);
  }
  return Math.floor((paise * bps + 5000) / 10000);
}

const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1234567 → "₹12,345.67" */
export function formatPaise(paise: number): string {
  const sign = paise < 0 ? '−' : '';
  return `${sign}₹${inr.format(Math.abs(paise) / 100)}`;
}

/** 1800 → "18%", 250 → "2.5%" */
export function formatBps(bps: number): string {
  return `${bps / 100}%`;
}
