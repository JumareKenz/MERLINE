'use client';

import { useMemo } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';

export const FIELD_ROLE_SLUG = 'field-interviewer';

/**
 * The signed-in user's roles and effective permissions, from /auth/me.
 *
 * Used to shape the UI — what navigation and actions to show — never to
 * enforce anything. Every action shown here is still authorized by the API,
 * and anything hidden here is also refused there.
 */
export function useSession() {
  const query = useCurrentUser();
  const profile = query.data?.data?.data;

  return useMemo(() => {
    const permissions = new Set(profile?.permissions ?? []);
    const roleSlugs = (profile?.roles ?? []).map((r) => r.slug);
    return {
      profile,
      isLoading: query.isLoading,
      isError: query.isError,
      /** Resolved once /auth/me has answered. Until then, nothing is hidden or shown on its basis. */
      isResolved: !!profile,
      can: (slug: string) => permissions.has(slug),
      canAny: (...slugs: string[]) => slugs.some((s) => permissions.has(s)),
      roleSlugs,
      /** Only the field-interviewer role: belongs in the field app, not the admin workspace. */
      isFieldOnly: roleSlugs.length > 0 && roleSlugs.every((s) => s === FIELD_ROLE_SLUG),
    };
  }, [profile, query.isLoading, query.isError]);
}
