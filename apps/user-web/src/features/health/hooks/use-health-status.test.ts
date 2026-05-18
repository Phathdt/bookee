import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const refetch = vi.fn();
vi.mock('@bookee/api-client', () => ({
  useGetHealth: () => ({ data: { status: 'ok' }, isLoading: false, error: null, refetch }),
}));

import { useHealthStatus } from './use-health-status';

describe('useHealthStatus', () => {
  it('exposes data + refetch wrapper', () => {
    const { result } = renderHook(() => useHealthStatus());
    expect(result.current.data).toEqual({ status: 'ok' });
    result.current.refetch();
    expect(refetch).toHaveBeenCalled();
  });
});
