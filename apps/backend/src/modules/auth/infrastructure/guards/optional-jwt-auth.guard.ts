import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but does NOT reject when no token is present.
 * If a valid Bearer token is provided, req.user is populated as normal.
 * If no token (or an invalid token), req.user stays undefined.
 * Use for routes that accept both authenticated and guest requests.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // Override to swallow auth errors — guest access is valid
  handleRequest<T>(_err: unknown, user: T): T {
    return user; // undefined for guests — that's fine
  }
}
