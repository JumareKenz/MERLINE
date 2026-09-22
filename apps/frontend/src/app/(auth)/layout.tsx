import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';

const TRUST_SIGNALS = [
  'Consent recorded before a single byte of audio is captured',
  'Every finding traces back to a real, verbatim transcript segment',
  'Tenant-isolated, permission-scoped, audited at every step',
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel — desktop only */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[460px] relative flex-col shrink-0 overflow-hidden"
        style={{ backgroundColor: 'hsl(var(--brand-navy))' }}
      >
        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, hsl(var(--brand-navy)) 0%, transparent 30%, transparent 70%, hsl(var(--brand-navy)) 100%)',
          }}
        />
        {/* Accent glow — lemon, restrained: a wash, not a fill */}
        <div
          className="absolute bottom-0 left-0 right-0 h-64 opacity-[0.12]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 100%, hsl(var(--brand-lemon)) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 p-9 pb-0">
          <Logo variant="full" theme="dark" height={24} />
        </div>

        {/* Value proposition */}
        <div className="relative z-10 flex-1 flex flex-col justify-end p-9 pb-11">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-5"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            Research Intelligence
          </p>
          <h2
            className="text-[22px] font-semibold leading-[1.45] tracking-tight mb-9"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            Evidence you can trace,<br />
            findings you can trust,<br />
            fieldwork you can verify.
          </h2>

          <div className="space-y-4">
            {TRUST_SIGNALS.map((signal) => (
              <div key={signal} className="flex items-start gap-3">
                <div
                  className="mt-[5px] h-1 w-4 rounded-full shrink-0"
                  style={{ backgroundColor: 'hsl(var(--brand-lemon))' }}
                />
                <p
                  className="text-[12.5px] leading-[1.55]"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  {signal}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="relative z-10 px-9 pb-7">
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
            © 2026 Merline. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12 lg:py-8">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex justify-center">
            <Logo variant="full" theme="auto" height={26} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
