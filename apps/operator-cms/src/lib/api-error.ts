/**
 * Extract a human-readable message from an axios error response.
 * Backend returns { message: string } for 4xx and 5xx.
 */
export function getApiErrorMessage(err: unknown, fallback = 'An error occurred'): string {
  if (err == null) return fallback;
  const cast = err as { response?: { data?: { message?: unknown } }; message?: string };
  const msg = cast?.response?.data?.message ?? cast?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return (msg as string[]).join(', ');
  return fallback;
}

export function isConflictError(err: unknown): boolean {
  const cast = err as { response?: { status?: number } };
  return cast?.response?.status === 409;
}
