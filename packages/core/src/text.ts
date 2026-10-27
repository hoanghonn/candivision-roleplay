/** Lowercase, punctuation stripped (letters with diacritics kept), whitespace folded. */
export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/['’ʼ`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const MIN_QUOTE = 12

/** True when `quote` (at least 12 characters once normalised) appears in `haystack`. */
export function quoteIn(haystack: string, quote: string): boolean {
  const q = normalize(quote)
  if (q.length < MIN_QUOTE) return false
  return normalize(haystack).includes(q)
}
