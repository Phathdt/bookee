import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: { target: './openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: './src/generated',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: './src/axios-instance.ts',
          name: 'axiosInstance',
        },
        // Let Orval default: GET -> useQuery, POST/PATCH/DELETE -> useMutation.
        query: {
          options: {
            staleTime: 30_000,
          },
        },
      },
    },
  },
  'api-zod': {
    input: { target: './openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: './src/generated',
      client: 'zod',
      fileExtension: '.zod.ts',
    },
  },
});
