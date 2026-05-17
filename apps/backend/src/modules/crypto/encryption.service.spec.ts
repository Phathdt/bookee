import { describe, expect, it } from 'vitest';

import { EncryptionService } from './encryption.service';

function makeService(): EncryptionService {
  // 32-byte key — deterministic for tests
  const key = Buffer.alloc(32, 0x42);
  return new EncryptionService(key);
}

describe('EncryptionService', () => {
  describe('constructor', () => {
    it('throws when key is not 32 bytes', () => {
      expect(() => new EncryptionService(Buffer.alloc(16))).toThrow('32 bytes');
    });
  });

  describe('encrypt / decrypt roundtrip', () => {
    it('returns original plaintext after decrypt', () => {
      const svc = makeService();
      const plain = '123456789012';
      const blob = svc.encrypt(plain);
      expect(svc.decrypt(blob)).toBe(plain);
    });

    it('produces different ciphertext on each call (random IV)', () => {
      const svc = makeService();
      const a = svc.encrypt('same-input');
      const b = svc.encrypt('same-input');
      expect(a).not.toBe(b);
    });

    it('blob contains three colon-separated parts', () => {
      const svc = makeService();
      const blob = svc.encrypt('test');
      expect(blob.split(':').length).toBe(3);
    });
  });

  describe('decrypt', () => {
    it('throws on tampered ciphertext', () => {
      const svc = makeService();
      const blob = svc.encrypt('sensitive-data');
      const parts = blob.split(':');
      // Flip last char of ciphertext segment
      const tampered = parts[2]!.slice(0, -1) + (parts[2]!.slice(-1) === 'A' ? 'B' : 'A');
      expect(() => svc.decrypt(`${parts[0]}:${parts[1]}:${tampered}`)).toThrow();
    });

    it('throws on tampered auth tag', () => {
      const svc = makeService();
      const blob = svc.encrypt('value');
      const parts = blob.split(':');
      const tamperedTag = Buffer.alloc(16, 0xff).toString('base64');
      expect(() => svc.decrypt(`${parts[0]}:${tamperedTag}:${parts[2]}`)).toThrow();
    });

    it('throws on malformed blob (missing segments)', () => {
      const svc = makeService();
      expect(() => svc.decrypt('onlyone')).toThrow('Invalid encrypted blob format');
      expect(() => svc.decrypt('two:parts')).toThrow('Invalid encrypted blob format');
    });
  });

  describe('maskIdCard', () => {
    it('shows last 4 chars prefixed with ***', () => {
      const svc = makeService();
      expect(svc.maskIdCard('123456789012')).toBe('***9012');
    });

    it('handles short idCard (≤4 chars)', () => {
      const svc = makeService();
      expect(svc.maskIdCard('123')).toBe('***123');
    });

    it('works with exactly 4 chars', () => {
      const svc = makeService();
      expect(svc.maskIdCard('ABCD')).toBe('***ABCD');
    });
  });
});
