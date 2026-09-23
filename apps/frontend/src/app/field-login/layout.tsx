import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sign in · Merline Field',
  description: 'Sign in to your Merline field workspace',
  manifest: '/field.webmanifest',
  appleWebApp: { capable: true, title: 'Field', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = { themeColor: '#012C76' };

export default function FieldLoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
