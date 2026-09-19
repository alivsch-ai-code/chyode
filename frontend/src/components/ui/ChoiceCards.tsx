'use client';

import { IconCheck } from '@/components/ui/Icons';
import type { CatalogItem } from '@/lib/catalog';

interface BaseProps<K extends string> {
  items: CatalogItem<K>[];
  legend: string;
  className?: string;
}

type SingleProps<K extends string> = BaseProps<K> & {
  multiple?: false;
  value: K | null;
  onChange: (value: K) => void;
};

type MultiProps<K extends string> = BaseProps<K> & {
  multiple: true;
  value: K[];
  max: number;
  onChange: (value: K[]) => void;
  disabled?: boolean;
};

/** Karten-Auswahl (Radio- bzw. Checkbox-Gruppe) mit Icon, Titel und Kurzbeschreibung. */
export function ChoiceCards<K extends string>(props: SingleProps<K> | MultiProps<K>) {
  const { items, legend, className = '' } = props;

  const isSelected = (key: K) => (props.multiple ? props.value.includes(key) : props.value === key);
  const limitReached = props.multiple && props.value.length >= props.max;

  const toggle = (key: K) => {
    if (props.multiple) {
      if (props.disabled) return;
      if (props.value.includes(key)) props.onChange(props.value.filter((v) => v !== key));
      else if (!limitReached) props.onChange([...props.value, key]);
    } else {
      props.onChange(key);
    }
  };

  return (
    <div
      role={props.multiple ? 'group' : 'radiogroup'}
      aria-label={legend}
      className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${className}`}
    >
      {items.map((item) => {
        const selected = isSelected(item.key);
        const blocked = props.multiple && (props.disabled || (limitReached && !selected));
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            role={props.multiple ? 'checkbox' : 'radio'}
            aria-checked={selected}
            disabled={blocked}
            onClick={() => toggle(item.key)}
            className={`group relative flex items-start gap-3.5 rounded-control border px-4 py-3.5 text-left transition duration-150 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 ${
              selected ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-line bg-surface hover:border-tertiary'
            }`}
          >
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                selected ? 'bg-accent text-white dark:text-black' : 'bg-fill/12 text-secondary group-hover:text-label'
              }`}
            >
              <Icon size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-callout font-semibold">{item.label}</span>
              <span className="mt-0.5 block text-footnote text-secondary">{item.description}</span>
            </span>
            {selected && (
              <span className="absolute right-3 top-3 text-accent">
                <IconCheck size={16} strokeWidth={2.75} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
