import { setApiBaseUrl } from '@bookee/api-client';
import { QueryClient } from '@tanstack/react-query';

import { hydrateAuth } from './auth-store';

// Configure shared api-client at module load.
setApiBaseUrl(import.meta.env.VITE_API_URL);
hydrateAuth();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
