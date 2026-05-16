import { describe, expect, it } from 'vitest';

import { PasswordHash } from './password-hash';

describe('PasswordHash', () => {
  it('hashes and matches the same plaintext', async () => {
    const hash = await PasswordHash.fromPlain('correct-horse');
    expect(hash.value).not.toBe('correct-horse');
    expect(await hash.matches('correct-horse')).toBe(true);
  });

  it('rejects wrong plaintext', async () => {
    const hash = await PasswordHash.fromPlain('correct-horse');
    expect(await hash.matches('wrong-pass')).toBe(false);
  });

  it('rejects passwords shorter than 8 chars', async () => {
    await expect(PasswordHash.fromPlain('short')).rejects.toThrow(/at least 8/);
  });

  it('wraps stored hashes without rehashing', () => {
    const wrapped = PasswordHash.fromStored('$2a$12$abc');
    expect(wrapped.value).toBe('$2a$12$abc');
  });
});
