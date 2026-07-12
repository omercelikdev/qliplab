import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

/** Next option index for a type-ahead buffer, searching after `from` and
 *  wrapping. Returns -1 when nothing matches so the caller can no-op. */
export function typeaheadIndex(options: SelectOption[], buffer: string, from: number): number {
  if (!buffer) return -1;
  const needle = buffer.toLowerCase();
  const n = options.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (options[idx].label.toLowerCase().startsWith(needle)) return idx;
  }
  // Also allow matching the current item (e.g. repeated first letter stays put).
  if (options[from]?.label.toLowerCase().startsWith(needle)) return from;
  return -1;
}

/**
 * A dropdown that matches the app's own accent instead of the OS.
 *
 * A native <select> paints its open popup with the macOS system accent (blue by
 * default), which clashes with QlipLab's orange. This renders the list itself,
 * so the selected row is the app accent, styled like the item menu (elevated
 * popover, clean hovers). Portaled to the body so the filter bar's overflow
 * clip can't cut it off.
 */
export function SelectMenu({
  value,
  options,
  onChange,
  ariaLabel,
  triggerClassName,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const typeahead = useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({ buffer: '', timer: null });

  const selected = options.find((o) => o.value === value) ?? options[0];

  // On open, highlight the current value so arrow keys start from the selection.
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, value, options]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open) return;
    optionRefs.current.get(activeIndex)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const width = Math.max(r.width, 160);
    // Right-align the menu under the trigger, clamped onto the viewport.
    let left = r.right - width;
    if (left < 4) left = 4;
    if (left + width > window.innerWidth - 4) left = window.innerWidth - width - 4;
    setRect({ top: r.bottom + 4, left, width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(options.length - 1);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const opt = options[activeIndex];
        if (opt) { onChange(opt.value); setOpen(false); triggerRef.current?.focus(); }
        return;
      }
      // Type-ahead: printable single characters jump to the next matching label.
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const ta = typeahead.current;
        ta.buffer += e.key;
        if (ta.timer) clearTimeout(ta.timer);
        ta.timer = setTimeout(() => { ta.buffer = ''; ta.timer = null; }, 600);
        const idx = typeaheadIndex(options, ta.buffer, activeIndex);
        if (idx >= 0) setActiveIndex(idx);
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, options, activeIndex, onChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={triggerClassName}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-60" />
      </button>

      {open && rect && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-activedescendant={options[activeIndex] ? `selectmenu-opt-${options[activeIndex].value}` : undefined}
          style={{ position: 'fixed', top: rect.top, left: rect.left, minWidth: rect.width, zIndex: 9999 }}
          className="max-h-[260px] overflow-y-auto p-1 rounded-xl bg-popover border border-popover-border shadow-[0_12px_40px_rgb(0_0_0/0.16)] dark:shadow-[0_12px_40px_rgb(0_0_0/0.55)]"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            const isActive = i === activeIndex;
            return (
              <button
                key={o.value}
                id={`selectmenu-opt-${o.value}`}
                ref={(el) => { if (el) optionRefs.current.set(i, el); else optionRefs.current.delete(i); }}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(o.value); setOpen(false); }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-start transition-colors cursor-pointer',
                  isSelected
                    ? 'text-accent font-medium'
                    : 'text-foreground/80',
                  isActive
                    ? (isSelected ? 'bg-accent/20' : 'bg-foreground/[0.05] dark:bg-white/[0.06]')
                    : (isSelected ? 'bg-accent/12' : ''),
                )}
              >
                <span className="flex-1 truncate">{o.label}</span>
                {isSelected && <Check className="w-3 h-3 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
