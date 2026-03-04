import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export function usePerformance(refetchInterval = 30_000) {
  return useQuery({
    queryKey: ['performance', refetchInterval],
    queryFn: () => api.performance.summary(refetchInterval),
    refetchInterval,
  });
}
