import { Logo } from '@/components/brand/logo';
import { FieldLoginForm } from '@/components/auth/field-login-form';

/**
 * Field sign-in — a different product from the admin login, on purpose:
 * full-height navy, one short code, thumb-sized controls, and nothing that
 * links into research management.
 */
export default function FieldLoginPage() {
  return (
    <div className="pt-safe pb-safe flex min-h-[100dvh] flex-col bg-navy text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        <header className="flex items-center gap-2.5 pt-8">
          <Logo variant="mark" theme="dark" height={32} />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">
            Merline <span className="text-lemon">Field</span>
          </span>
        </header>

        <div className="pt-14">
          <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.025em]">Record today’s interviews.</h1>
          <p className="mt-3 text-[17px] leading-relaxed text-white/80">
            Works without a signal. Recordings stay on your phone until they upload safely.
          </p>
        </div>

        <div className="mt-10 rounded-3xl bg-field-card p-6 text-foreground shadow-float">
          <FieldLoginForm />
        </div>

        <p className="mt-auto py-8 text-center text-[14px] text-white/75">No code? Ask your research lead for a field access code.</p>
      </div>
    </div>
  );
}
