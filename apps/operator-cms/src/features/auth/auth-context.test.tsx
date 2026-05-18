import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAuthContext } from './auth-context';

describe('useAuthContext', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuthContext());
    }).toThrow('useAuthContext must be used inside AuthProvider');
  });
});
