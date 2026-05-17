import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const DEFAULT_BASE_URL = '/api';
const DEFAULT_TIMEOUT_MS = 30_000;

let storedToken: string | null = null;
let cachedInstance: AxiosInstance | null = null;

/** Set or clear the bearer token used for all subsequent requests. */
export function setAuthToken(token: string | null): void {
  storedToken = token;
}

/**
 * Resolve API base URL from consumer-injected globals at runtime.
 * Vite consumers set this via `import.meta.env.VITE_API_URL` then forward
 * to `setApiBaseUrl()` during app bootstrap. Falls back to '/api' so
 * proxied dev setups work out of the box.
 */
let apiBaseUrl: string | undefined;
export function setApiBaseUrl(url: string | undefined): void {
  apiBaseUrl = url;
  cachedInstance = null;
}

function getInstance(): AxiosInstance {
  if (cachedInstance) return cachedInstance;
  const instance = axios.create({
    baseURL: apiBaseUrl ?? DEFAULT_BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
  });
  instance.interceptors.request.use((config) => {
    if (storedToken) {
      config.headers.Authorization = `Bearer ${storedToken}`;
    }
    return config;
  });
  cachedInstance = instance;
  return instance;
}

/** Lazy-initialized axios instance for advanced consumers. */
export const AXIOS_INSTANCE = new Proxy({} as AxiosInstance, {
  get(_target, prop) {
    return Reflect.get(getInstance(), prop);
  },
});

/**
 * Mutator used by Orval-generated code. Unwraps response envelopes that
 * follow the shape `{ data: T, traceId?, error? }`. Falls through unchanged
 * if the response is already a plain T.
 */
export const axiosInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return getInstance()(config).then(({ data }) => {
    if (data && typeof data === 'object' && 'data' in data) {
      return (data as { data: T }).data;
    }
    return data as T;
  });
};

export type ErrorType<Error> = Error;
export type BodyType<BodyData> = BodyData;
