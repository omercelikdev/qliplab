import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import { useVaultStore } from '@/stores/vaultStore';
import { countHistoryItems, countSnippetMatches } from '@/lib/database';

/**
 * "Also in: Snippets 3 · Vault 1" — a thin bar that surfaces matches for the
 * current query in the *other* tabs, so the user doesn't have to remember
 * where they saved something. Clicking a chip switches tab while carrying the
 * search across (goToTabWithSearch). Vault only counts when unlocked, and by
 * title only, since its contents are encrypted.
 */
export function CrossTabSearchHints() {
  const { t } = useTranslation();
  const activeTab = useAppStore((s) => s.activeTab);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const goToTabWithSearch = useAppStore((s) => s.goToTabWithSearch);
  const vaultItems = useVaultStore((s) => s.items);
  const vaultLocked = useVaultStore((s) => s.isLocked);
  const [historyCount, setHistoryCount] = useState(0);
  const [snippetCount, setSnippetCount] = useState(0);

  const q = searchQuery.trim();

  useEffect(() => {
    if (q.length < 2) { setHistoryCount(0); setSnippetCount(0); return; }
    let cancelled = false;
    Promise.all([
      countHistoryItems({ formatFilter: 'all', searchQuery: q }),
      countSnippetMatches(q),
    ])
      .then(([h, s]) => { if (!cancelled) { setHistoryCount(h); setSnippetCount(s); } })
      .catch(() => { /* leave counts at 0 */ });
    return () => { cancelled = true; };
  }, [q]);

  const vaultCount = useMemo(() => {
    if (vaultLocked || q.length < 2) return 0;
    const lower = q.toLowerCase();
    return vaultItems.filter((i) => i.title.toLowerCase().includes(lower)).length;
  }, [vaultItems, vaultLocked, q]);

  const chips = [
    { tab: 'history' as const, count: historyCount, label: t('search.history') },
    { tab: 'snippets' as const, count: snippetCount, label: t('search.snippets') },
    { tab: 'vault' as const, count: vaultCount, label: t('search.vault') },
  ].filter((c) => c.tab !== activeTab && c.count > 0);

  if (q.length < 2 || chips.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 shrink-0 overflow-x-auto text-[10px]">
      <span className="text-muted-foreground shrink-0">{t('search.alsoIn')}</span>
      {chips.map((c) => (
        <button
          key={c.tab}
          onClick={() => goToTabWithSearch(c.tab)}
          className="flex items-center gap-1 ps-1.5 pe-1.5 py-0.5 rounded-full border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          {c.label}
          <span className="text-accent font-semibold tabular-nums">{c.count}</span>
        </button>
      ))}
    </div>
  );
}
