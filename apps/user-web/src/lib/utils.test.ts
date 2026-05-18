import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('skips falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('dedupes conflicting Tailwind utilities via tailwind-merge', () => {
    expect(cn('p-2 p-4')).toBe('p-4');
  });

  it('accepts conditional object syntax', () => {
    expect(cn('a', { b: true, c: false })).toBe('a b');
  });
});
