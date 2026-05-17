import { describe, expect, it } from 'vitest';

import { normalizeVietnamese } from './normalize-vietnamese';

describe('normalizeVietnamese', () => {
  it.each([
    ['Đà Lạt', 'da lat'],
    ['Cần Thơ', 'can tho'],
    ['Bến xe Miền Đông', 'ben xe mien dong'],
    ['HỒ CHÍ MINH', 'ho chi minh'],
    ['  ĐỖ', 'do'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeVietnamese(input)).toBe(expected);
  });

  it('is idempotent', () => {
    const once = normalizeVietnamese('Đà Lạt');
    expect(normalizeVietnamese(once)).toBe(once);
  });
});
