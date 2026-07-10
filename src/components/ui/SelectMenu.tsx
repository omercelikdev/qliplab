import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

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
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
        className={triggerClassName}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-60" />
      </button>

      {open && rect && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ position: 'fixed', top: rect.top, left: rect.left, minWidth: rect.width, zIndex: 9999 }}
          className="max-h-[260px] overflow-y-auto p-1 rounded-xl bg-popover border border-popover-border shadow-[0_12px_40px_rgb(0_0_0/0.16)] dark:shadow-[0_12px_40px_rgb(0_0_0/0.55)]"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-start transition-colors cursor-pointer',
                  active
                    ? 'bg-accent/12 text-accent font-medium'
                    : 'text-foreground/80 hover:bg-foreground/[0.05] dark:hover:bg-white/[0.06]',
                )}
              >
                <span className="flex-1 truncate">{o.label}</span>
                {active && <Check className="w-3 h-3 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
