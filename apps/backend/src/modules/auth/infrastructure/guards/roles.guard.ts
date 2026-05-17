import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JwtPayload } from '../../domain/jwt-payload';
import { Roles } from '../decorators/roles.decorator';

/**
 * Checks the JWT payload (already validated by JwtAuthGuard) carries one of
 * the roles declared by the @Roles() decorator on the route handler.
 * Apply AFTER JwtAuthGuard so req.user is populated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const role = req.user?.role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException(`Requires role: ${required.join(' or ')}`);
    }
    return true;
  }
}
