import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'mark';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  height?: number;
  /** Secondary label after the wordmark, e.g. "Field". */
  product?: string;
}

/**
 * The research-intelligence mark, from derivatives of the untouched master
 * (public/brand/master.png; regenerate with scripts/brand-assets.sh).
 *
 * The component picks the smallest derivative that is still sharp at 2x for
 * the requested height, so a 24px header logo costs ~5 KB, not the 894 KB
 * full-size file it used to load. Images are `unoptimized` on purpose: the
 * files are already sized, which keeps them cacheable by the service worker
 * for offline use and avoids per-request resizing on the server.
 *
 *   light — navy mark, for light surfaces
 *   dark  — white mark with the lemon accent, for navy/dark surfaces
 *   auto  — follows the color scheme
 */
const SIZES = [32, 64, 128, 256, 512] as const;

function srcFor(theme: 'light' | 'dark', px: number) {
  const size = SIZES.find((s) => s >= px) ?? 512;
  return theme === 'dark' ? `/brand/mark-dark-${size}.png` : `/brand/mark-${size}.png`;
}

function Mark({ theme, height, priority }: { theme: 'light' | 'dark'; height: number; priority?: boolean }) {
  return (
    <Image
      src={srcFor(theme, height * 2)}
      alt=""
      aria-hidden
      width={height}
      height={height}
      unoptimized
      priority={priority}
      className="object-contain"
      style={{ width: height, height }}
    />
  );
}

export function Logo({ variant = 'full', theme = 'auto', className, height, product }: LogoProps) {
  const h = height ?? (variant === 'mark' ? 32 : 28);

  const mark =
    theme === 'auto' ? (
      <>
        <span className="contents dark:hidden">
          <Mark theme="light" height={h} priority />
        </span>
        <span className="hidden dark:contents">
          <Mark theme="dark" height={h} />
        </span>
      </>
    ) : (
      <Mark theme={theme} height={h} priority />
    );

  if (variant === 'mark') {
    return (
      <span role="img" aria-label="Merline" className={cn('inline-flex shrink-0', className)}>
        {mark}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {mark}
      <span
        className={cn(
          'font-display font-semibold tracking-[-0.02em]',
          theme === 'dark' ? 'text-white' : 'text-foreground',
        )}
        style={{ fontSize: Math.round(h * 0.64) }}
      >
        Merline
        {product && (
          <span
            className={cn(
              'ml-1.5 font-sans font-medium tracking-normal',
              theme === 'dark' ? 'text-lemon' : 'text-foreground-tertiary',
            )}
          >
            {product}
          </span>
        )}
      </span>
    </span>
  );
}
