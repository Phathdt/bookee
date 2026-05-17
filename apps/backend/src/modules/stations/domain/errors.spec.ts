import { describe, expect, it } from 'vitest';

import { StationInUseError, StationNotFoundError, StationValidationError } from './errors';

describe('stations domain errors', () => {
  it('StationNotFoundError defaults', () => {
    const e = new StationNotFoundError();
    expect(e.kind).toBe('not_found');
    expect(e.message).toBe('Station not found');
    expect(e.name).toBe('StationNotFoundError');
  });

  it('StationNotFoundError custom message', () => {
    expect(new StationNotFoundError('gone').message).toBe('gone');
  });

  it('StationInUseError defaults', () => {
    const e = new StationInUseError();
    expect(e.kind).toBe('in_use');
    expect(e.message).toBe('Station is referenced by existing routes');
    expect(e.name).toBe('StationInUseError');
  });

  it('StationInUseError custom message', () => {
    expect(new StationInUseError('used').message).toBe('used');
  });

  it('StationValidationError tags kind=invalid', () => {
    const e = new StationValidationError('bad');
    expect(e.kind).toBe('invalid');
    expect(e.message).toBe('bad');
    expect(e.name).toBe('StationValidationError');
  });
});
