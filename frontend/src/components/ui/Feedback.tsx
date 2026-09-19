import type { HTMLAttributes, ReactNode } from 'react';
import { IconAlert, IconCheck, IconInfo } from '@/components/ui/Icons';
import { initials } from '@/lib/format';

export function Spinner({ size = 20, label }: { size?: number; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} aria-label={label} className="inline-flex">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        aria-hidden="true"
        style={{ animationDuration: '0.8s' }}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Skeleton({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`animate-pulse rounded-control bg-fill/15 ${className}`} {...rest} />;
}

/** Vollflächiger Ladezustand für Seiten. */
export function PageLoading({ label = 'Wird geladen …' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-secondary" role="status" aria-live="polite">
      <Spinner size={24} />
      <span className="ml-3 text-callout">{label}</span>
    </div>
  );
}

type AlertTone = 'info' | 'success' | 'error' | 'warning';

const alertTones: Record<AlertTone, { wrap: string; icon: ReactNode }> = {
  info: { wrap: 'bg-accent/10 text-label', icon: <IconInfo size={20} className="text-accent" /> },
  success: { wrap: 'bg-success/10 text-label', icon: <IconCheck size={20} className="text-success" /> },
  error: { wrap: 'bg-danger/10 text-label', icon: <IconAlert size={20} className="text-danger" /> },
  warning: { wrap: 'bg-warning/10 text-label', icon: <IconAlert size={20} className="text-warning" /> },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className = '',
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { wrap, icon } = alertTones[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-control px-4 py-3 text-subhead ${wrap} ${className}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 text-secondary' : ''}>{children}</div>}
      </div>
    </div>
  );
}

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-fill/15 text-secondary',
  accent: 'bg-accent/12 text-accent',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/12 text-danger',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-footnote font-medium ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, size = 36 }: { name: string | null | undefined; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent/12 font-semibold text-accent"
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) }}
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fill/12 text-secondary">
          {icon}
        </span>
      )}
      <h3 className="text-title3">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-callout text-secondary">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 overflow-hidden rounded-full bg-fill/15"
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
    </div>
  );
}
