import { type HealthResponseDto, useGetHealth } from '@bookee/api-client';

interface UseHealthStatusResult {
  data: HealthResponseDto | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

export function useHealthStatus(): UseHealthStatusResult {
  const { data, isLoading, error, refetch } = useGetHealth<HealthResponseDto>();
  return {
    data,
    isLoading,
    error,
    refetch: () => void refetch(),
  };
}
