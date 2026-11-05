/**
 * Money utilities for handling integer paise throughout the application.
 * Never use floating point math for currency calculations.
 */

export type Paise = bigint;

/**
 * Converts a rupees string or number to integer paise (BigInt).
 * e.g., "10.50" -> 1050n, 10 -> 1000n
 */
export function rupeesToPaise(rupees: number | string): bigint {
  if (typeof rupees === 'number') {
    if (isNaN(rupees) || !isFinite(rupees)) {
      throw new Error(`Invalid rupees value: ${rupees}`);
    }
    // Convert to string to avoid float precision issues before parsing
    const parts = rupees.toFixed(2).split('.');
    const whole = BigInt(parts[0]);
    const fraction = BigInt(parts[1] || '0');
    return whole * 100n + fraction;
  }

  const trimmed = rupees.trim();
  const match = trimmed.match(/^(-?\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error(`Invalid rupees string format: ${rupees}`);
  }
  const whole = BigInt(match[1]);
  const fractionStr = (match[2] || '').padEnd(2, '0').slice(0, 2);
  const fraction = BigInt(fractionStr);
  return whole >= 0n ? whole * 100n + fraction : whole * 100n - fraction;
}

/**
 * Converts integer paise to a formatted rupee string (e.g., 1050n -> "10.50" or "₹10.50").
 */
export function formatPaiseToRupees(
  paise: bigint | number | string,
  options: { includeSymbol?: boolean; locale?: string } = {}
): string {
  const p = BigInt(paise);
  const isNegative = p < 0n;
  const abs = isNegative ? -p : p;
  const whole = abs / 100n;
  const fraction = (abs % 100n).toString().padStart(2, '0');

  // Format integer portion with Indian numbering system (lakhs/crores) if en-IN
  const wholeStr = whole.toLocaleString(options.locale || 'en-IN');
  const formatted = `${isNegative ? '-' : ''}${wholeStr}.${fraction}`;

  return options.includeSymbol ? `₹${formatted}` : formatted;
}

/**
 * Converts integer paise to a plain string representation suitable for JSON transmission.
 * e.g. 1500n -> "1500"
 */
export function paiseToString(paise: bigint | number | string): string {
  return BigInt(paise).toString();
}

/**
 * Safely parses a string or number into BigInt paise.
 */
export function parsePaise(val: string | number | bigint): bigint {
  return BigInt(val);
}

/**
 * Calculates a discount in integer paise from basis points (bps, 1% = 100 bps).
 * Floor rounding down as per spec rule 4.2: floor(lineAmountPaise * discountBps / 10000).
 */
export function calculateBpsDiscount(amountPaise: bigint, discountBps: number): bigint {
  if (discountBps < 0 || discountBps > 10000) {
    throw new Error(`Discount basis points must be between 0 and 10000, got ${discountBps}`);
  }
  return (amountPaise * BigInt(discountBps)) / 10000n;
}
