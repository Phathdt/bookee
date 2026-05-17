import { describe, expect, it } from 'vitest';

import {
  VehicleForbiddenError,
  VehicleInUseError,
  VehicleNotFoundError,
  VehiclePlateConflictError,
  VehicleValidationError,
} from './errors';

describe('vehicles domain errors', () => {
  it('VehicleNotFoundError defaults', () => {
    const e = new VehicleNotFoundError();
    expect(e.kind).toBe('not_found');
    expect(e.message).toBe('Vehicle not found');
    expect(e.name).toBe('VehicleNotFoundError');
  });

  it('VehicleNotFoundError custom message', () => {
    expect(new VehicleNotFoundError('gone').message).toBe('gone');
  });

  it('VehicleForbiddenError defaults', () => {
    const e = new VehicleForbiddenError();
    expect(e.kind).toBe('forbidden');
    expect(e.message).toBe('Vehicle belongs to another operator');
    expect(e.name).toBe('VehicleForbiddenError');
  });

  it('VehicleForbiddenError custom message', () => {
    expect(new VehicleForbiddenError('x').message).toBe('x');
  });

  it('VehicleValidationError carries message', () => {
    const e = new VehicleValidationError('bad seats');
    expect(e.kind).toBe('invalid');
    expect(e.message).toBe('bad seats');
    expect(e.name).toBe('VehicleValidationError');
  });

  it('VehiclePlateConflictError defaults', () => {
    const e = new VehiclePlateConflictError();
    expect(e.kind).toBe('plate_conflict');
    expect(e.message).toBe('A vehicle with this plate number already exists');
    expect(e.name).toBe('VehiclePlateConflictError');
  });

  it('VehiclePlateConflictError custom message', () => {
    expect(new VehiclePlateConflictError('dup').message).toBe('dup');
  });

  it('VehicleInUseError defaults', () => {
    const e = new VehicleInUseError();
    expect(e.kind).toBe('in_use');
    expect(e.message).toBe('Vehicle is referenced by active trips');
    expect(e.name).toBe('VehicleInUseError');
  });

  it('VehicleInUseError custom message', () => {
    expect(new VehicleInUseError('busy').message).toBe('busy');
  });
});
