import { setApiBaseUrl } from '@bookee/api-client';
import { QueryClient } from '@tanstack/react-query';

// Configure shared api-client with this app's base URL at module load.
setApiBaseUrl(import.meta.env.VITE_API_URL);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
