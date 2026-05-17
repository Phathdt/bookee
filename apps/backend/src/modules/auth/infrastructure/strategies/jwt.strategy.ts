import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { isUserRole } from '../../domain/enums';
import { JwtPayload } from '../../domain/jwt-payload';

/**
 * Validates Bearer access tokens. Rejects refresh tokens (they only travel
 * to /auth/refresh) and tokens with unknown roles.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Refresh tokens cannot be used to authenticate requests');
    }
    if (!isUserRole(payload.role)) {
      throw new UnauthorizedException('Unknown role in token');
    }
    return payload;
  }
}
