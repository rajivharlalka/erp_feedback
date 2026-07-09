import { useQuery } from '@tanstack/react-query';
import { fetchNetwork } from '../lib/api';

export const AVAILABLE_MODES = ['tube'] as const;

const REFRESH_INTERVAL_MS = 45_000;

export function useNetworkData(modes: string[]) {
  return useQuery({
    queryKey: ['network', modes],
    queryFn: () => fetchNetwork(modes),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: REFRESH_INTERVAL_MS,
  });
}
