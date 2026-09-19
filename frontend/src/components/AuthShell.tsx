import type { ReactNode } from 'react';

/** Zentrierte, ruhige Karte für Anmelde-Formulare (Apple-ID-Stil). */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-narrow animate-fade-up flex-col pt-4 sm:pt-12">
      <div className="mb-8 text-center">
        <h1 className="text-title1 sm:text-[2.25rem]">{title}</h1>
        {subtitle && <p className="mt-2.5 text-callout text-secondary">{subtitle}</p>}
      </div>
      <div className="card p-6 sm:p-8">{children}</div>
      {footer && <div className="mt-6 text-center text-subhead text-secondary">{footer}</div>}
    </div>
  );
}
