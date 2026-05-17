/**
 * Strip Vietnamese diacritics so "đà lạt" matches "Da Lat" and vice-versa.
 *
 * Uses NFD decomposition + combining-mark stripping, then a manual swap
 * for `đ`/`Đ` (these don't decompose to plain `d` under NFD).
 */
export function normalizeVietnamese(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
