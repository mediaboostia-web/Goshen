'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDownIcon } from '@/components/icons/ChurchIcons';

export interface SelectOption {
  value: string;
  label: string;
  // Optional secondary line rendered under the label in the open list
  // (e.g. a role badge, a city) — never shown on the closed trigger.
  meta?: ReactNode;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
  // 'default' — bordered form field (income/expense/settings forms).
  // 'ghost' — no border/background on the trigger, compact text + chevron,
  // for inline contexts like the app header (branch/church switchers).
  variant?: 'default' | 'ghost';
  // Where the open list aligns relative to the trigger; 'right' avoids
  // overflowing past the viewport edge for triggers near the right side
  // of the screen (e.g. the header).
  align?: 'left' | 'right';
  // Adds a filter input at the top of the open list — for long option
  // lists (e.g. the ~190-country picker) where scrolling to find one by
  // mouse isn't practical. Filters by substring match anywhere in the
  // label, so it still finds "Gabon" when the label starts with a flag
  // emoji (unlike a native <select>'s prefix-only type-ahead).
  searchable?: boolean;
  searchPlaceholder?: string;
}

// Hand-built dropdown matching the app's own look (rounded-xl, stone/emerald
// palette) instead of a native <select>, whose open-list rendering is
// browser/OS chrome that cannot be styled and clashes with the rest of the
// design — same reasoning as the city autocomplete in onboarding/page.tsx.
export function Select({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner…',
  className = '',
  disabled,
  'aria-label': ariaLabel,
  variant = 'default',
  align = 'left',
  searchable = false,
  searchPlaceholder = 'Rechercher…',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const visibleOptions = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const triggerClass =
    variant === 'ghost'
      ? 'flex items-center gap-1.5 text-xs font-semibold text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
      : 'w-full flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
      >
        <span className={`truncate ${selected ? 'text-stone-900' : 'text-stone-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-30 mt-1.5 min-w-[14rem] max-h-60 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg py-1 ${
              variant === 'ghost' ? 'w-max' : 'w-full'
            } ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            {searchable && (
              <div className="sticky top-0 bg-white p-1.5 border-b border-stone-100">
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-700 focus:outline-hidden"
                />
              </div>
            )}
            {visibleOptions.length === 0 && (
              <p className="px-3 py-2 text-xs text-stone-400">Aucune option disponible</p>
            )}
            {visibleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${
                  opt.value === value
                    ? 'bg-emerald-50 text-emerald-900 font-bold'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="truncate">{opt.label}</div>
                {opt.meta}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
