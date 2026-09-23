import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';

/** The traceability chain the product guarantees, drawn as structure — not copy. */
const CHAIN = [
  { label: 'Consent', detail: 'Scope recorded before any audio' },
  { label: 'Recording', detail: 'Checksum-verified, private storage' },
  { label: 'Transcript segment', detail: 'Timestamped, speaker-labelled' },
  { label: 'Quotation', detail: 'Verbatim, linked to its segment' },
  { label: 'Finding', detail: 'Approved only with evidence' },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[460px] shrink-0 flex-col justify-between overflow-hidden bg-navy p-10 text-white lg:flex xl:w-[520px]">
        <Logo variant="full" theme="dark" height={28} />

        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lemon">Research intelligence</p>
          <h2 className="mt-4 text-[28px] font-semibold leading-[1.25] tracking-[-0.02em]">
            Every finding traces back to what a participant actually said.
          </h2>

          <ol className="mt-10 space-y-0" aria-label="The evidence chain">
            {CHAIN.map((step, i) => (
              <li key={step.label} className="relative flex gap-4 pb-5 last:pb-0">
                {i < CHAIN.length - 1 && <span aria-hidden className="absolute left-[11px] top-7 h-[calc(100%-20px)] w-px bg-white/20" />}
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold ${
                    i === CHAIN.length - 1 ? 'border-lemon bg-lemon text-lemon-foreground' : 'border-white/30 text-white/85'
                  }`}
                >
                  {i + 1}
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-white">{step.label}</span>
                  <span className="block text-[13px] text-white/75">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-[12px] text-white/65">© 2026 Merline</p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-10 lg:hidden">
            <Logo variant="full" theme="auto" height={28} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
