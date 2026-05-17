import { describe, expect, it } from 'vitest';

import { SeatLayoutInUseError, SeatLayoutNotFoundError, SeatLayoutValidationError } from './errors';

describe('seat-layouts domain errors', () => {
  it('SeatLayoutNotFoundError defaults', () => {
    const e = new SeatLayoutNotFoundError();
    expect(e.kind).toBe('not_found');
    expect(e.message).toBe('Seat layout not found');
    expect(e.name).toBe('SeatLayoutNotFoundError');
  });

  it('SeatLayoutNotFoundError custom message', () => {
    expect(new SeatLayoutNotFoundError('gone').message).toBe('gone');
  });

  it('SeatLayoutInUseError defaults', () => {
    const e = new SeatLayoutInUseError();
    expect(e.kind).toBe('in_use');
    expect(e.message).toBe('Seat layout is referenced by existing vehicles');
    expect(e.name).toBe('SeatLayoutInUseError');
  });

  it('SeatLayoutInUseError custom message', () => {
    expect(new SeatLayoutInUseError('used').message).toBe('used');
  });

  it('SeatLayoutValidationError carries message', () => {
    const e = new SeatLayoutValidationError('rows must be > 0');
    expect(e.kind).toBe('invalid');
    expect(e.message).toBe('rows must be > 0');
    expect(e.name).toBe('SeatLayoutValidationError');
  });
});
