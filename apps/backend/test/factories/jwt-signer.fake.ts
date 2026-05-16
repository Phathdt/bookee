import type { IJwtSigner } from '@/modules/auth/domain/interfaces/jwt-signer';
import type { JwtPayload } from '@/modules/auth/domain/jwt-payload';

/**
 * Trivial JWT signer for unit tests: encodes the payload as base64 JSON.
 * No crypto — service-layer tests only care about round-trip + `typ`.
 */
export function makeFakeJwtSigner(): IJwtSigner {
  return {
    async sign(payload) {
      return Buffer.from(JSON.stringify(payload)).toString('base64');
    },
    async verify(token) {
      return JSON.parse(Buffer.from(token, 'base64').toString()) as JwtPayload;
    },
  };
}
