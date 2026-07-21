'use client';

import { useQuery } from '@tanstack/react-query';
import { API } from '@/lib/api-client';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => API.auth.me(),
    staleTime: 5 * 60_000,
  });
}
