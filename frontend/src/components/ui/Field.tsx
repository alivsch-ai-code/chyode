'use client';

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { IconCheck, IconChevronDown, IconEye, IconEyeOff } from '@/components/ui/Icons';

interface FieldMeta {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
}

const controlClasses =
  'block w-full rounded-control border bg-surface px-4 text-body text-label transition duration-150 ' +
  'placeholder:text-tertiary focus:outline-none focus:ring-4 disabled:opacity-50 ';

function stateClasses(hasError: boolean): string {
  return hasError
    ? 'border-danger focus:border-danger focus:ring-danger/20'
    : 'border-line hover:border-tertiary focus:border-accent focus:ring-accent/20';
}

function FieldShell({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: FieldMeta & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-subhead font-medium text-label">
        {label}
        {optional && <span className="ml-1.5 font-normal text-secondary">optional</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-footnote text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-footnote font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint: ReactNode, error?: string | null): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type InputProps = FieldMeta & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, optional, className = '', id, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        className={`${controlClasses} h-12 ${stateClasses(Boolean(error))} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});

type PasswordInputProps = FieldMeta & Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, hint, error, optional, className = '', id, autoComplete = 'current-password', ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          className={`${controlClasses} h-12 pr-12 ${stateClasses(Boolean(error))} ${className}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-control text-secondary transition hover:text-label"
        >
          {visible ? <IconEyeOff size={20} /> : <IconEye size={20} />}
        </button>
      </div>
    </FieldShell>
  );
});

/** Live-Checkliste für die Passwortregeln (Mindestlänge 10). */
export function PasswordRules({ password }: { password: string }) {
  const ok = password.length >= 10;
  return (
    <p
      className={`flex items-center gap-1.5 text-footnote transition-colors ${ok ? 'text-success' : 'text-secondary'}`}
      aria-live="polite"
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full ${ok ? 'bg-success/15' : 'bg-fill/15'}`}
        aria-hidden="true"
      >
        {ok && <IconCheck size={11} strokeWidth={3} />}
      </span>
      Mindestens 10 Zeichen{ok ? ' – sieht gut aus' : ''}
    </p>
  );
}

type TextareaProps = FieldMeta & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, optional, className = '', id, rows = 3, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        className={`${controlClasses} resize-y py-3 ${stateClasses(Boolean(error))} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});

type SelectProps = FieldMeta & SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, optional, className = '', id, children, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          className={`${controlClasses} h-12 appearance-none pr-11 ${stateClasses(Boolean(error))} ${className}`}
          {...rest}
        >
          {children}
        </select>
        <IconChevronDown
          size={18}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary"
        />
      </div>
    </FieldShell>
  );
});
