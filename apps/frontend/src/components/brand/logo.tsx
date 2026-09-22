import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'mark';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  height?: number;
}

/**
 * PHASE 2 — rebrand.
 *
 * The mark is two PNGs derived from one master (see public/brand/master.png,
 * the untouched upload): navy-on-transparent for light surfaces, white +
 * lemon-on-transparent for dark/navy surfaces — the raw navy mark is nearly
 * invisible on a navy background, confirmed by compositing it before this
 * component existed. See docs/BRAND.md for the derivation commands.
 *
 * `variant="full"` no longer ships a flattened wordmark image. Real text in
 * the display face is crisper at every size, needs no light/dark pair of its
 * own (`currentColor`-adjacent via the foreground token instead), and is
 * actually selectable/readable by assistive tech rather than an image of text.
 */
function Mark({ theme, height }: { theme: 'light' | 'dark' | 'auto'; height: number }) {
  if (theme === 'light') {
    return (
      <Image
        src="/brand/mark-light.png"
        alt=""
        height={height}
        width={height}
        className="object-contain"
        priority
      />
    );
  }

  if (theme === 'dark') {
    return (
      <Image
        src="/brand/mark-dark.png"
        alt=""
        height={height}
        width={height}
        className="object-contain"
        priority
      />
    );
  }

  return (
    <>
      <Image
        src="/brand/mark-light.png"
        alt=""
        height={height}
        width={height}
        className="object-contain dark:hidden"
        priority
      />
      <Image
        src="/brand/mark-dark.png"
        alt=""
        height={height}
        width={height}
        className="object-contain hidden dark:block"
        priority
      />
    </>
  );
}

export function Logo({ variant = 'full', theme = 'auto', className, height }: LogoProps) {
  if (variant === 'mark') {
    return (
      <span className={cn('inline-flex shrink-0', className)}>
        <Mark theme={theme} height={height ?? 32} />
      </span>
    );
  }

  const h = height ?? 28;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Mark theme={theme} height={h} />
      <span
        className="font-display font-semibold tracking-tight text-foreground"
        style={{ fontSize: h * 0.62 }}
      >
        Merline
      </span>
    </span>
  );
}
