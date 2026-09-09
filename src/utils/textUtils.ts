/**
 * Utility functions for text formatting and normalization
 */

/**
 * Normalizes vertical or newline-broken book titles and author names from OCR into clean, single-line horizontal text.
 * - Strips any newlines (\r, \n)
 * - Removes artificial spaces inserted between consecutive Japanese characters (common in vertical spine OCR)
 * - Ensures single horizontal text layout
 */
export function normalizeHorizontalText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();

  // Strip code ticks, quotes, or markdown artifacts
  cleaned = cleaned.replace(/^[`"'\s]+|[`"'\s]+$/g, '');

  // If there are newline characters:
  // If newline sits between Japanese characters (Kanji, Hiragana, Katakana),
  // they are part of a vertical spine and should be joined directly without spaces.
  cleaned = cleaned.replace(/([一-龠ぁ-んァ-ヶ々〆ヶ])\r?\n+([一-龠ぁ-んァ-ヶ々〆ヶ])/g, '$1$2');

  // Any remaining newlines replace with a space
  cleaned = cleaned.replace(/[\r\n]+/g, ' ');

  // Remove artificial spaces between consecutive Japanese characters
  // (Gemini OCR frequently outputs spaced characters for vertical Japanese spines: e.g. "銀 河 鉄 道 の 夜")
  cleaned = cleaned.replace(/([一-龠ぁ-んァ-ヶ々〆ヶ])\s+([一-龠ぁ-んァ-ヶ々〆ヶ])/g, '$1$2');
  cleaned = cleaned.replace(/([一-龠ぁ-んァ-ヶ々〆ヶ])\s+([一-龠ぁ-んァ-ヶ々〆ヶ])/g, '$1$2'); // second pass for multi-character sequences

  // Collapse remaining multi-spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  return cleaned.trim();
}

/**
 * Standard CSS style object ensuring horizontal text orientation
 */
export const horizontalTextStyle = {
  writingMode: 'horizontal-tb' as const,
  textOrientation: 'mixed' as const,
};
