/**
 * Hinglish / FMCG order message normalisation vocabulary (Rule 5.3).
 *
 * Explicit rules:
 * - peti, pati, case -> unit case
 * - kilo, kg -> 1 kg
 * - wala, wali -> ignored (filler)
 * - bhaiya, bhai -> ignored (salutation)
 * - chhota -> size hint preserved for alias resolution
 */

export interface NormalisedToken {
  original: string;
  normalised: string;
  isFiller: boolean;
  unitHint?: 'case' | 'piece';
  sizeHint?: string;
}

export function normalisePhrase(input: string): string {
  if (!input) return '';

  // Clean punctuation, extra spaces, lowercase
  const cleaned = input
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/gi, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  const outWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Salutation / fillers to ignore
    if (['bhaiya', 'bhai', 'wala', 'wali', 'ji', 'sahab'].includes(word)) {
      continue;
    }

    // Units
    if (['peti', 'pati', 'case', 'cases'].includes(word)) {
      outWords.push('case');
      continue;
    }

    // Size indicators
    if (['kilo', 'kg'].includes(word)) {
      // If previous word wasn't already a number, or if standard 1 kilo
      outWords.push('1kg');
      continue;
    }

    outWords.push(word);
  }

  return outWords.join(' ');
}

/**
 * Normalises an alias lookup phrase for strict matching.
 */
export function normaliseAliasKey(phrase: string): string {
  return normalisePhrase(phrase).replace(/\s+/g, ' ').trim();
}
