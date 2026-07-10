import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'destructive';

interface RowActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * The small icon button that appears on a list row's trailing edge on hover —
 * shared by history, snippet and vault rows so they feel like one product.
 *
 * Idle it is a quiet glyph; on hover it fills a soft pill and the icon darkens
 * to full strength, giving the press a tactile target. `destructive` turns the
 * pill a decisive red only on hover rather than sitting permanently alarmed.
 *
 * The icon inherits the button's colour (`currentColor`), so pass a bare
 * `<Icon className="w-3.5 h-3.5" />`; give it an explicit colour only to mark a
 * toggled-on state (e.g. an active pin in accent).
 */
export const RowActionButton = forwardRef<HTMLButtonElement, RowActionButtonProps>(
  ({ variant = 'default', className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'shrink-0 w-6 h-6 flex items-center justify-center rounded-md cursor-pointer outline-none',
        'text-foreground/45 transition-[background-color,color,transform] duration-100 ease-out',
        'active:scale-90 focus-visible:ring-2 focus-visible:ring-accent',
        variant === 'default' &&
          'hover:bg-foreground/[0.07] hover:text-foreground dark:hover:bg-white/[0.10]',
        variant === 'destructive' && 'hover:bg-destructive hover:text-white',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

RowActionButton.displayName = 'RowActionButton';
