'use client';

import { useQuery } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['auth', 'me', token ? 'session' : 'anonymous'],
    queryFn: () => API.auth.me(),
    // Signed out, this would 401 and trigger the global "session expired"
    // handling on the login page itself.
    enabled: !!token,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
