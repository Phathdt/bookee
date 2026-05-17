import { Module } from '@nestjs/common';

import { EncryptionService } from './encryption.service';

@Module({
  providers: [
    {
      provide: EncryptionService,
      useFactory: (): EncryptionService => {
        const raw = process.env.ENCRYPTION_KEY;
        if (!raw) {
          throw new Error('ENCRYPTION_KEY env var is not set');
        }
        // Accept 64-char hex string (32 bytes) or 44-char base64 (32 bytes)
        let key: Buffer;
        if (/^[0-9a-fA-F]{64}$/.test(raw)) {
          key = Buffer.from(raw, 'hex');
        } else {
          key = Buffer.from(raw, 'base64');
        }
        if (key.length !== 32) {
          throw new Error(`ENCRYPTION_KEY must decode to 32 bytes; decoded ${key.length} bytes`);
        }
        return new EncryptionService(key);
      },
    },
  ],
  exports: [EncryptionService],
})
export class CryptoModule {}
