import { randomInt } from 'node:crypto';

/**
 * Alphabet for booking codes.
 * Excludes visually ambiguous chars: 0, O, I, 1
 * 32 characters — power-of-two length simplifies uniform sampling.
 */
export const BOOKING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const BOOKING_CODE_LENGTH = 8;

/**
 * Pure function. Generates a random 8-character booking code from
 * BOOKING_CODE_ALPHABET using cryptographically secure randomness.
 */
export function generateBookingCode(): string {
  let code = '';
  for (let i = 0; i < BOOKING_CODE_LENGTH; i++) {
    code += BOOKING_CODE_ALPHABET[randomInt(0, BOOKING_CODE_ALPHABET.length)];
  }
  return code;
}
