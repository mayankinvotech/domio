import Link from 'next/link';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center font-medium rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed';

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs min-w-[64px]', // 32px — compact rows
  md: 'h-10 px-4 text-sm min-w-[80px]', // 40px — acceptable minimum
  lg: 'h-11 px-6 text-sm min-w-[96px]', // 44px — ideal touch target
};

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm',
  ghost: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900',
  danger: 'border border-red-500/40 text-red-400 hover:bg-red-500/10',
  outline: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(base, sizes[size], variants[variant], className);
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

// Same look as Button, but renders a Next.js <Link> for navigation actions.
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  href,
  children,
  ...props
}: CommonProps & { href: string } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'href'
  >) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
