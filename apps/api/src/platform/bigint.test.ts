import { describe, expect, it } from 'vitest';
import { serializeBigInts } from './bigint.js';

describe('BigInt Serialization Helper', () => {
  it('converts BigInt primitive to string', () => {
    expect(serializeBigInts(1050n)).toBe('1050');
  });

  it('converts BigInt fields inside an object', () => {
    const input = {
      orderNumber: 'ORD-123',
      totalPaise: 48000n,
      version: 1,
      nested: {
        amountPaise: 2400n,
      },
    };

    const output = serializeBigInts(input);
    expect(output).toEqual({
      orderNumber: 'ORD-123',
      totalPaise: '48000',
      version: 1,
      nested: {
        amountPaise: '2400',
      },
    });

    // Verify it is JSON serializable without throwing
    expect(() => JSON.stringify(output)).not.toThrow();
  });

  it('handles arrays with BigInts', () => {
    const list = [{ paise: 100n }, { paise: 200n }];
    expect(serializeBigInts(list)).toEqual([{ paise: '100' }, { paise: '200' }]);
  });

  it('preserves dates and nulls', () => {
    const now = new Date();
    const res = serializeBigInts({ date: now, empty: null });
    expect(res.date).toBe(now);
    expect(res.empty).toBeNull();
  });
});
