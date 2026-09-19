'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Segmented Control (Radiogruppe) im iOS-Stil mit Pfeiltasten-Bedienung. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (index: number, delta: number) => {
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      move(index, 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(index, -1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex w-full rounded-full bg-fill/15 p-1 sm:w-auto ${className}`}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`flex-1 rounded-full px-4 py-2 text-subhead font-medium transition duration-200 sm:flex-none ${
              active ? 'bg-surface text-label shadow-[0_1px_3px_rgb(0_0_0/0.15)]' : 'text-secondary hover:text-label'
            }`}
          >
            {option.label}
            {option.hint && <span className="ml-1.5 hidden text-footnote font-normal text-tertiary md:inline">{option.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/** Horizontal scrollbare Tab-Leiste (Pill-Stil) mit Tastaturbedienung. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  idPrefix,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  idPrefix: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next >= 0) {
      event.preventDefault();
      onChange(tabs[next].value);
      refs.current[next]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Trip-Bereiche"
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab, index) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={`${idPrefix}-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${tab.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-subhead font-medium transition duration-200 ${
              active ? 'bg-label text-canvas' : 'text-secondary hover:bg-fill/12 hover:text-label'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
