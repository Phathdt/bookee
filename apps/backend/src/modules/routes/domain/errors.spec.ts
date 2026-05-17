import { describe, expect, it } from 'vitest';

import {
  RouteForbiddenError,
  RouteImmutableFieldError,
  RouteNotFoundError,
  RouteValidationError,
} from './errors';

describe('routes domain errors', () => {
  it('RouteNotFoundError defaults', () => {
    const e = new RouteNotFoundError();
    expect(e.name).toBe('RouteNotFoundError');
    expect(e.kind).toBe('not_found');
    expect(e.message).toBe('Route not found');
  });

  it('RouteNotFoundError custom message', () => {
    expect(new RouteNotFoundError('x').message).toBe('x');
  });

  it('RouteForbiddenError defaults', () => {
    const e = new RouteForbiddenError();
    expect(e.name).toBe('RouteForbiddenError');
    expect(e.kind).toBe('forbidden');
    expect(e.message).toBe('Route belongs to another operator');
  });

  it('RouteForbiddenError custom message', () => {
    expect(new RouteForbiddenError('x').message).toBe('x');
  });

  it('RouteValidationError carries message', () => {
    const e = new RouteValidationError('bad');
    expect(e.name).toBe('RouteValidationError');
    expect(e.kind).toBe('invalid');
    expect(e.message).toBe('bad');
  });

  it('RouteImmutableFieldError includes field name', () => {
    const e = new RouteImmutableFieldError('fromStationId');
    expect(e.name).toBe('RouteImmutableFieldError');
    expect(e.kind).toBe('immutable');
    expect(e.message).toContain('fromStationId');
  });
});
