import { JwtService } from '@nestjs/jwt';

import { IJwtSigner, JwtSignOptions } from '../domain/interfaces/jwt-signer';
import { JwtPayload } from '../domain/jwt-payload';

/**
 * @nestjs/jwt-backed implementation of IJwtSigner. Plain class — wired via
 * useFactory in auth.module.ts. Keeps the @nestjs/jwt dep contained in this
 * file so the application layer stays framework-agnostic.
 */
export class JwtSignerNest extends IJwtSigner {
  constructor(private readonly jwt: JwtService) {
    super();
  }

  sign(payload: JwtPayload, options: JwtSignOptions): Promise<string> {
    // @nestjs/jwt 11 narrows expiresIn to its own StringValue template literal
    // type; our port keeps the friendlier `string`, so cast at the boundary.
    return this.jwt.signAsync(payload, {
      expiresIn: options.expiresIn as unknown as number,
    });
  }

  verify(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token);
  }
}
