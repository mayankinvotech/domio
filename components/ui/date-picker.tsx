'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

export type DatePickerProps = {
  id?: string;
  name?: string;
  value: string; // ISO format "YYYY-MM-DD"
  onChange: (isoValue: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

// Helper: parse ISO YYYY-MM-DD into local Date
function parseISO(iso: string): Date | null {
  if (!iso || typeof iso !== 'string') return null;
  const parts = iso.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const date = new Date(y, m, d);
  return isNaN(date.getTime()) ? null : date;
}

// Helper: format local Date into ISO "YYYY-MM-DD"
function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper: format ISO into "MM/DD/YYYY"
export function formatMMDDYYYY(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  if (!y || !m || !d) return '';
  return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
}

// Helper: parse "MM/DD/YYYY" into ISO "YYYY-MM-DD"
export function parseMMDDYYYY(str: string): string | null {
  const clean = str.trim();
  const parts = clean.split('/');
  if (parts.length !== 3) return null;
  const m = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2150) return null;

  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return formatISO(date);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DatePicker({
  id,
  name,
  value,
  onChange,
  min,
  max,
  placeholder = 'MM/DD/YYYY',
  required = false,
  disabled = false,
  className,
  ariaLabel,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(() => formatMMDDYYYY(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synced calendar view month & year
  const initialDate = useMemo(() => parseISO(value) || new Date(), [value]);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Keep display input in sync with external value changes
  useEffect(() => {
    setInputText(formatMMDDYYYY(value));
    const d = parseISO(value);
    if (d) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Handle outside click to close calendar
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Handle manual typed input
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setInputText(text);

    const iso = parseMMDDYYYY(text);
    if (iso) {
      onChange(iso);
      const parsed = parseISO(iso);
      if (parsed) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    }
  }

  function handleInputBlur() {
    // If invalid text was left, revert to current value
    const iso = parseMMDDYYYY(inputText);
    if (iso) {
      onChange(iso);
      setInputText(formatMMDDYYYY(iso));
    } else if (value) {
      setInputText(formatMMDDYYYY(value));
    } else {
      setInputText('');
    }
  }

  // Calendar month navigation
  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDate(day: number) {
    const selected = new Date(viewYear, viewMonth, day);
    const iso = formatISO(selected);
    onChange(iso);
    setInputText(formatMMDDYYYY(iso));
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function selectToday() {
    const today = new Date();
    const iso = formatISO(today);
    onChange(iso);
    setInputText(formatMMDDYYYY(iso));
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  }

  // Days grid computation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const selectedDate = useMemo(() => parseISO(value), [value]);
  const isSelectedDate = (day: number) =>
    selectedDate &&
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getDate() === day;

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  // Year choices for dropdown
  const yearOptions = useMemo(() => {
    const curYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = curYear - 5; y <= curYear + 15; y++) {
      years.push(y);
    }
    return years;
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input container with visible calendar icon button */}
      <div
        className={`flex items-center rounded-xl border border-zinc-200 bg-zinc-50 shadow-2xs transition-all focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/10 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className || ''}`}
      >
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-label={ariaLabel || 'Select date (MM/DD/YYYY)'}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 font-medium"
        />

        {/* Visible Calendar Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="mr-1.5 flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-95 cursor-pointer"
          title="Open calendar to choose date (MM/DD/YYYY)"
          aria-label="Open calendar"
        >
          <svg
            className="h-4 w-4 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="hidden sm:inline text-[11px] text-zinc-500">Pick</span>
        </button>
      </div>

      {/* Floating Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Header: Month / Year Controls */}
          <div className="flex items-center justify-between gap-1 pb-2.5 border-b border-zinc-100">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Previous month"
            >
              ‹
            </button>

            <div className="flex items-center gap-1">
              {/* Month Select */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs font-semibold text-zinc-800 outline-none cursor-pointer hover:bg-zinc-100"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Select */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs font-semibold text-zinc-800 outline-none cursor-pointer hover:bg-zinc-100"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          {/* Day Names Header */}
          <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {DAY_LABELS.map((label) => (
              <span key={label} className="py-1">
                {label}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Overflow days from previous month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const prevDayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <span
                  key={`prev-${i}`}
                  className="py-1.5 text-zinc-300 select-none text-[11px]"
                >
                  {prevDayNum}
                </span>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelectedDate(day);
              const todayFlag = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg mx-auto text-xs transition-all font-medium ${
                    selected
                      ? 'bg-zinc-900 text-white font-bold shadow-xs'
                      : todayFlag
                      ? 'border border-blue-500 bg-blue-50 text-blue-800 font-bold hover:bg-blue-100'
                      : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Controls: Today & Format Reminder */}
          <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[11px]">
            <span className="font-mono text-zinc-400">Format: MM/DD/YYYY</span>
            <button
              type="button"
              onClick={selectToday}
              className="rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700 transition hover:bg-zinc-200"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
