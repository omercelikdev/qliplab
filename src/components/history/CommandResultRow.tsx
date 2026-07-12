import { useTranslation } from 'react-i18next';
import { Calculator, ArrowRightLeft, CornerDownLeft } from 'lucide-react';
import type { CommandResult } from '@/lib/commandBar';

/**
 * The inline answer shown at the top of the history list when the search query
 * is really a calculation or conversion. Clicking (or Enter) pastes the value.
 */
export function CommandResultRow({ result, onPaste }: { result: CommandResult; onPaste: () => void }) {
  const { t } = useTranslation();
  const Icon = result.kind === 'math' ? Calculator : ArrowRightLeft;

  return (
    <div className="ps-3 pe-1.5 pt-1.5">
      <button
        onClick={onPaste}
        className="group w-full flex items-center gap-2 h-9 px-2.5 rounded-md border border-accent/30 bg-accent/[0.06] hover:bg-accent/[0.1] transition-colors cursor-pointer text-start focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="flex-1 min-w-0 truncate font-mono text-sm font-medium text-foreground">
          {result.value}
        </span>
        {result.detail && (
          <span className="text-[10px] text-foreground/45 shrink-0">{result.detail}</span>
        )}
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
          <kbd className="inline-flex items-center justify-center h-[18px] px-1 bg-surface border border-border/50 rounded-[3px]">
            <CornerDownLeft className="w-2.5 h-2.5" />
          </kbd>
          {t('commandBar.paste')}
        </span>
      </button>
    </div>
  );
}
