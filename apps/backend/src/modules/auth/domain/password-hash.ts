import { compare, hash } from 'bcryptjs';

/**
 * Password hashing value object. Wraps bcryptjs with explicit cost factor
 * (12 is current ITSec baseline for interactive web auth — adjust upward
 * as hardware improves). Constructor is private — use static factories.
 */
export class PasswordHash {
  private static readonly COST = 12;

  private constructor(public readonly value: string) {}

  /** Hash a plaintext password. */
  static async fromPlain(plain: string): Promise<PasswordHash> {
    if (plain.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const value = await hash(plain, PasswordHash.COST);
    return new PasswordHash(value);
  }

  /** Wrap an already-hashed value (e.g., loaded from DB). */
  static fromStored(stored: string): PasswordHash {
    return new PasswordHash(stored);
  }

  /** Constant-time comparison against plaintext. */
  async matches(plain: string): Promise<boolean> {
    return compare(plain, this.value);
  }
}
