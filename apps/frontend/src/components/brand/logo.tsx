import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'mark';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  height?: number;
}

export function Logo({ variant = 'full', theme = 'auto', className, height }: LogoProps) {
  if (variant === 'mark') {
    const h = height ?? 36;
    return (
      <Image
        src="/brand/logo-mark.png"
        alt="Merline"
        height={h}
        width={h}
        className={cn('object-contain', className)}
        priority
      />
    );
  }

  const h = height ?? 40;

  if (theme === 'light') {
    return (
      <Image
        src="/brand/logo-full-light.png"
        alt="Merline — MERL Intelligence Platform"
        height={h}
        width={Math.round(h * 3.52)}
        className={cn('object-contain', className)}
        priority
      />
    );
  }

  if (theme === 'dark') {
    return (
      <Image
        src="/brand/logo-full-dark.png"
        alt="Merline — MERL Intelligence Platform"
        height={h}
        width={Math.round(h * 3.54)}
        className={cn('object-contain', className)}
        priority
      />
    );
  }

  // auto: light image shown in light mode, dark image in dark mode
  return (
    <>
      <Image
        src="/brand/logo-full-light.png"
        alt="Merline — MERL Intelligence Platform"
        height={h}
        width={Math.round(h * 3.52)}
        className={cn('object-contain dark:hidden', className)}
        priority
      />
      <Image
        src="/brand/logo-full-dark.png"
        alt="Merline — MERL Intelligence Platform"
        height={h}
        width={Math.round(h * 3.54)}
        className={cn('object-contain hidden dark:block', className)}
        priority
      />
    </>
  );
}
