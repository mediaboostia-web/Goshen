'use client';

import { useEffect, useState } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/ChurchIcons';

interface DatePickerProps {
  // ISO date string ("yyyy-mm-dd"), matching the native <input type="date">
  // contract this component replaces.
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

const WEEKDAYS = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(value: string): Date | null {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const parsed = new Date(y, m - 1, d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Hand-built calendar matching the app's own look (rounded-xl, stone/emerald
// palette) instead of a native <input type="date">, whose popup is
// browser/OS chrome that cannot be styled — same reasoning as the custom
// Select component.
export function DatePicker({
  value,
  onChange,
  placeholder = 'Sélectionner une date',
  className = '',
  disabled,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());

  function openPicker() {
    setViewMonth(selected ?? new Date());
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  // Monday-first grid: JS getDay() is 0=Sunday, shift so Monday=0.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const monthLabel = viewMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <span className={`truncate ${selected ? 'text-stone-900' : 'text-stone-400'}`}>
          {selected
            ? selected.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })
            : placeholder}
        </span>
        <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 mt-1.5 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Mois précédent"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-stone-900 capitalize">{monthLabel}</span>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Mois suivant"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="flex h-7 items-center justify-center text-[10px] font-bold uppercase text-stone-400"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`blank-${i}`} />;
                const iso = toIso(day);
                const isSelected = selected && toIso(selected) === iso;
                const isToday = toIso(today) === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                    className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-800 text-white'
                        : isToday
                          ? 'border border-emerald-700 text-emerald-800'
                          : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex justify-between border-t border-stone-100 pt-2">
              <button
                type="button"
                onClick={() => {
                  const iso = toIso(today);
                  onChange(iso);
                  setViewMonth(today);
                  setOpen(false);
                }}
                className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                Aujourd&apos;hui
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
