import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { FieldShell } from '@/components/field/field-shell';

/**
 * field.jrecc.org — the field-worker app (rewritten here by middleware.ts;
 * also reachable at /field on the main domain). Its own manifest and icon,
 * so it installs as a separate "Merline Field" app, and its own shell.
 */
export const metadata: Metadata = {
  title: { template: '%s · Merline Field', default: 'Merline Field' },
  manifest: '/field.webmanifest',
  appleWebApp: { capable: true, title: 'Field', statusBarStyle: 'black-translucent' },
  icons: { apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }] },
};

export const viewport: Viewport = {
  themeColor: '#012C76',
};

export default function FieldLayout({ children }: { children: ReactNode }) {
  return <FieldShell>{children}</FieldShell>;
}
