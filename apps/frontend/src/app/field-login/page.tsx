import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';
import { FieldLoginForm } from '@/components/auth/field-login-form';

export const metadata: Metadata = {
  title: 'Field Sign In',
  description: 'Sign in to your Merline field workspace',
};

/**
 * PHASE 2 — deliberately not the admin split-panel login. Full-bleed navy
 * hero + a single white card, stacked vertically — the shape of a phone
 * screen, not a desktop dashboard. See src/app/(auth)/layout.tsx for the
 * admin equivalent.
 */
export default function FieldLoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="flex flex-col items-center justify-center gap-4 px-6 pt-16 pb-14 shrink-0"
        style={{ backgroundColor: 'hsl(var(--brand-navy))' }}
      >
        <Logo variant="mark" theme="dark" height={52} />
        <div className="text-center">
          <p
            className="text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: 'hsl(var(--brand-lemon))' }}
          >
            Field Workspace
          </p>
          <h1 className="text-[19px] font-semibold text-white mt-1">Merline Field</h1>
        </div>
      </div>

      <div className="flex-1 flex justify-center px-5 -mt-8">
        <div className="w-full max-w-[400px] rounded-2xl bg-background-elevated shadow-4 border border-border-subtle p-6">
          <FieldLoginForm />
        </div>
      </div>

      <p className="text-center text-[11px] text-foreground-tertiary py-6">
        © 2026 Merline. Field access only — need an admin account?{' '}
        <a href="https://merline.jrecc.org/login" className="text-foreground-link hover:underline">
          Sign in there instead
        </a>
        .
      </p>
    </div>
  );
}
