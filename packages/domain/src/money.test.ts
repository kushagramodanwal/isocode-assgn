import { describe, expect, it } from 'vitest';
import {
  calculateBpsDiscount,
  formatPaiseToRupees,
  paiseToString,
  parsePaise,
  rupeesToPaise,
} from './money.js';

describe('Money Utilities (Paise authority & formatting)', () => {
  it('converts rupees number and string to integer paise', () => {
    expect(rupeesToPaise(10)).toBe(1000n);
    expect(rupeesToPaise(10.5)).toBe(1050n);
    expect(rupeesToPaise('10.50')).toBe(1050n);
    expect(rupeesToPaise('8.10')).toBe(810n);
    expect(rupeesToPaise('0.05')).toBe(5n);
    expect(rupeesToPaise(0)).toBe(0n);
  });

  it('formats paise to rupees string correctly with and without currency symbol', () => {
    expect(formatPaiseToRupees(1050n)).toBe('10.50');
    expect(formatPaiseToRupees(1050n, { includeSymbol: true })).toBe('₹10.50');
    expect(formatPaiseToRupees(810n)).toBe('8.10');
    expect(formatPaiseToRupees(10000000n, { includeSymbol: true })).toBe('₹1,00,000.00');
  });

  it('serialises paise to string for JSON transport', () => {
    expect(paiseToString(123456n)).toBe('123456');
    expect(parsePaise('123456')).toBe(123456n);
  });

  it('calculates basis points discount with floor rounding', () => {
    // 50750 paise at 300 bps (3%) -> 1522.5 paise -> floor to 1522 paise
    expect(calculateBpsDiscount(50750n, 300)).toBe(1522n);
    expect(calculateBpsDiscount(10000n, 1000)).toBe(1000n); // 10%
    expect(calculateBpsDiscount(10000n, 0)).toBe(0n);
  });

  it('validates discount bps boundaries', () => {
    expect(() => calculateBpsDiscount(100n, -1)).toThrow();
    expect(() => calculateBpsDiscount(100n, 10001)).toThrow();
  });
});
