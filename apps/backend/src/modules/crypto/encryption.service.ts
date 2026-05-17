import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

/**
 * AES-256-GCM encryption service.
 * Stored format: `<iv_base64>:<authTag_base64>:<ciphertext_base64>`
 */
export class EncryptionService {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) {
      throw new Error(`Encryption key must be 32 bytes, got ${key.length}`);
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(blob: string): string {
    const parts = blob.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted blob format');
    }
    const [ivB64, authTagB64, ciphertextB64] = parts as [string, string, string];
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    if (iv.length !== IV_BYTES) throw new Error('Invalid IV length');
    if (authTag.length !== AUTH_TAG_BYTES) throw new Error('Invalid auth tag length');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  }

  maskIdCard(plain: string): string {
    if (plain.length <= 4) return '***' + plain;
    return '***' + plain.slice(-4);
  }
}
