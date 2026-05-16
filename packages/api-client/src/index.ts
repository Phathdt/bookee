/**
 * Public entry for @bookee/api-client.
 *
 * Re-exports React Query hooks + axios functions from generated tag modules.
 * For Zod schemas, import from '@bookee/api-client/zod' instead.
 *
 * DO NOT manually edit anything inside src/generated/ — regenerate by
 * running `bun run codegen` after the backend exports a new openapi.yaml.
 */

export * from './generated/health/health';
export * from './generated/bookeeAPI.schemas';

export { axiosInstance, AXIOS_INSTANCE, setAuthToken, setApiBaseUrl } from './axios-instance';
export type { ErrorType, BodyType } from './axios-instance';
