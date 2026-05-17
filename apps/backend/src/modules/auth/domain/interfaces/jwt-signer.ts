import { JwtPayload } from '../jwt-payload';

export interface JwtSignOptions {
  expiresIn: string; // e.g. '1d', '7d'
}

/**
 * JWT signing port. Keeps auth.service.ts framework-agnostic (doesn't import
 * @nestjs/jwt). Implementation lives in infrastructure/jwt-signer.nest.ts.
 */
export abstract class IJwtSigner {
  abstract sign(payload: JwtPayload, options: JwtSignOptions): Promise<string>;
  abstract verify(token: string): Promise<JwtPayload>;
}
