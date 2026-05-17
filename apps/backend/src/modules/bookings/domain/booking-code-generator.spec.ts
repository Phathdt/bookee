import { describe, expect, it } from 'vitest';

import {
  BOOKING_CODE_ALPHABET,
  BOOKING_CODE_LENGTH,
  generateBookingCode,
} from './booking-code-generator';

const BANNED_CHARS = new Set(['0', 'O', 'I', '1']);

describe('generateBookingCode', () => {
  it('returns a string of exactly 8 characters', () => {
    expect(generateBookingCode()).toHaveLength(BOOKING_CODE_LENGTH);
  });

  it('only contains characters from the allowed alphabet', () => {
    const alphabetSet = new Set(BOOKING_CODE_ALPHABET);
    for (let i = 0; i < 1000; i++) {
      const code = generateBookingCode();
      for (const ch of code) {
        expect(alphabetSet.has(ch), `Char '${ch}' not in alphabet`).toBe(true);
      }
    }
  });

  it('never produces banned characters (0, O, I, 1) across 10 000 iterations', () => {
    for (let i = 0; i < 10_000; i++) {
      const code = generateBookingCode();
      for (const ch of code) {
        expect(BANNED_CHARS.has(ch), `Banned char '${ch}' in code '${code}'`).toBe(false);
      }
    }
  });

  it('alphabet itself contains no banned characters', () => {
    for (const ch of BOOKING_CODE_ALPHABET) {
      expect(BANNED_CHARS.has(ch), `Banned char '${ch}' found in ALPHABET`).toBe(false);
    }
  });

  it('alphabet has exactly 32 characters', () => {
    expect(BOOKING_CODE_ALPHABET).toHaveLength(32);
  });

  it('generates different codes across calls (probabilistic)', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateBookingCode());
    }
    // Extremely unlikely to have all 100 identical
    expect(codes.size).toBeGreaterThan(1);
  });
});
