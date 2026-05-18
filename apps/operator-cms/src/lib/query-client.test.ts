import { describe, expect, it, vi } from 'vitest';

vi.mock('@bookee/api-client', () => ({
  setApiBaseUrl: vi.fn(),
  setAuthToken: vi.fn(),
}));

import { setApiBaseUrl } from '@bookee/api-client';

import { queryClient } from './query-client';

describe('queryClient', () => {
  it('configures shared defaults', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.staleTime).toBe(30_000);
    expect(opts.queries?.retry).toBe(1);
    expect(opts.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('sets api base url at module load', () => {
    expect(setApiBaseUrl).toHaveBeenCalled();
  });
});
