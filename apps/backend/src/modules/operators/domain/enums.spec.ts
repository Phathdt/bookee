import { describe, expect, it } from 'vitest';

import { isOperatorStatus, OPERATOR_STATUSES } from './enums';

describe('isOperatorStatus', () => {
  it('accepts every known status', () => {
    for (const s of OPERATOR_STATUSES) {
      expect(isOperatorStatus(s)).toBe(true);
    }
  });

  it('rejects unknown strings', () => {
    expect(isOperatorStatus('archived')).toBe(false);
    expect(isOperatorStatus('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isOperatorStatus(undefined)).toBe(false);
    expect(isOperatorStatus(null)).toBe(false);
    expect(isOperatorStatus(0)).toBe(false);
  });
});
