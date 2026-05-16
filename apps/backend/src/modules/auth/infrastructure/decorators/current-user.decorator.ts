import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { JwtPayload } from '../../domain/jwt-payload';

/**
 * Pulls the validated JWT payload off the request, populated by JwtStrategy.
 *   getMe(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!req.user) throw new Error('CurrentUser used on a non-authenticated route');
    return req.user;
  },
);
