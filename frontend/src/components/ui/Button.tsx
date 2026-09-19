import Link from 'next/link';
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Feedback';

export type ButtonVariant = 'primary' | 'tinted' | 'plain' | 'link' | 'danger' | 'danger-solid';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium ' +
  'transition duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong dark:text-black',
  tinted: 'bg-accent/10 text-accent hover:bg-accent/15',
  plain: 'bg-fill/15 text-label hover:bg-fill/25',
  link: 'rounded-md px-0 text-accent hover:underline active:scale-100',
  danger: 'bg-danger/10 text-danger hover:bg-danger/15',
  'danger-solid': 'bg-danger text-white hover:opacity-90 dark:text-black',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-subhead',
  md: 'h-11 px-5 text-callout',
  lg: 'h-[3.25rem] px-7 text-body',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  const sizeClass = variant === 'link' ? 'text-callout' : sizes[size];
  return [base, variants[variant], sizeClass, extra].filter(Boolean).join(' ');
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, fullWidth, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, `${fullWidth ? 'w-full' : ''} ${className ?? ''}`.trim())}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  );
});

type LinkButtonProps = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

/** Link im Look eines Buttons (interne Navigation über next/link). */
export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  className,
  children,
  loading: _loading,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={buttonClasses(variant, size, `${fullWidth ? 'w-full' : ''} ${className ?? ''}`.trim())}
      {...rest}
    >
      {icon}
      {children}
    </Link>
  );
}
