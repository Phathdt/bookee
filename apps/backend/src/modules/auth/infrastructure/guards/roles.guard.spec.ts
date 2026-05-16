import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import type { UserRole } from '../../domain/enums';
import type { JwtPayload } from '../../domain/jwt-payload';

import { RolesGuard } from './roles.guard';

function makeContext(user: JwtPayload | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }) as never,
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function makeReflector(required?: readonly UserRole[]): Reflector {
  return {
    getAllAndOverride: vi.fn().mockReturnValue(required),
  } as unknown as Reflector;
}

const customer: JwtPayload = { sub: 1, role: 'customer', operatorId: null, typ: 'access' };

describe('RolesGuard', () => {
  it('passes through when no @Roles() declared', () => {
    const guard = new RolesGuard(makeReflector(undefined));
    expect(guard.canActivate(makeContext(customer))).toBe(true);
  });

  it('passes through when @Roles() is empty', () => {
    const guard = new RolesGuard(makeReflector([]));
    expect(guard.canActivate(makeContext(customer))).toBe(true);
  });

  it('admits user with matching role', () => {
    const guard = new RolesGuard(makeReflector(['admin', 'customer']));
    expect(guard.canActivate(makeContext(customer))).toBe(true);
  });

  it('rejects user with non-matching role', () => {
    const guard = new RolesGuard(makeReflector(['admin']));
    expect(() => guard.canActivate(makeContext(customer))).toThrow(ForbiddenException);
  });

  it('rejects when no user is on the request', () => {
    const guard = new RolesGuard(makeReflector(['admin']));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
