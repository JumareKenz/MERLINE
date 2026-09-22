import type { ReactNode } from 'react';
import { FieldHeader } from '@/components/layout/field-header';

/**
 * PHASE 2 — the field-worker app, served at field.jrecc.org (rewritten here
 * transparently by middleware.ts; also reachable at merline.jrecc.org/field
 * for testing). Deliberately excludes Sidebar/admin nav: only participants,
 * consent, and interview recording — the field-interviewer role's actual
 * permission set (see auth/permission-catalogue.ts on the backend).
 */
export default function FieldLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <FieldHeader />
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">{children}</main>
    </div>
  );
}
