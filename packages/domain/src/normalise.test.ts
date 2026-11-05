import { describe, expect, it } from 'vitest';
import { normaliseAliasKey, normalisePhrase } from './normalise.js';

describe('Normalisation Vocabulary (Rule 5.3)', () => {
  it('strips salutations like bhaiya and bhai', () => {
    expect(normalisePhrase('bhaiya 5 peti biscuit')).toBe('5 case biscuit');
    expect(normalisePhrase('bhai 2 peti sabun')).toBe('2 case sabun');
  });

  it('normalises peti and pati to case', () => {
    expect(normalisePhrase('5 peti')).toBe('5 case');
    expect(normalisePhrase('3 pati')).toBe('3 case');
  });

  it('normalises kilo and kg to 1kg size hint', () => {
    expect(normalisePhrase('washing powder 1 kilo')).toBe('washing powder 1 1kg');
    expect(normalisePhrase('detergent kg')).toBe('detergent 1kg');
  });

  it('ignores filler words wala and wali', () => {
    expect(normalisePhrase('chai patti 250 wala 1 peti')).toBe('chai patti 250 1 case');
  });

  it('preserves chhota for alias matching', () => {
    expect(normaliseAliasKey('biscuit chhota')).toBe('biscuit chhota');
  });
});
