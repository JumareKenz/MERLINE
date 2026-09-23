import { readFileSync } from 'fs';
import { join } from 'path';

/** Brand tokens (docs/BRAND.md) shared by every export. */
export const BRAND = {
  navy: '012C76',
  navyDeep: '0A1B3F',
  lemon: 'C9EC73',
  lemonInk: '3D4A12', // lemon-family text on light surfaces (lemon-800)
  ink: '0B1220',
  muted: '5B6475',
  line: 'E3E8F0',
  surface: 'F6F8FB',
  warning: '8A5A00',
  warningBg: 'FFF6E0',
  infoBg: 'EEF3FD',
};

/** Assets live in apps/backend-nestjs/assets (outside dist). */
export function assetPath(...parts: string[]): string {
  return join(__dirname, '..', '..', '..', 'assets', ...parts);
}

const cache = new Map<string, Buffer>();
export function asset(...parts: string[]): Buffer {
  const key = parts.join('/');
  let buf = cache.get(key);
  if (!buf) {
    buf = readFileSync(assetPath(...parts));
    cache.set(key, buf);
  }
  return buf;
}

export function slugify(text: string): string {
  return (
    text
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'report'
  );
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
