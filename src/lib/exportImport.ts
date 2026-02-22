import { getDatabase } from '@/lib/database';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import type { ClipboardHistoryRow, SnippetRow, SnippetCategoryRow, VaultItemRow } from '@/types/database';

export interface ExportData {
  version: string;
  exportedAt: string;
  history?: ClipboardHistoryRow[];
  snippets?: SnippetRow[];
  snippetCategories?: SnippetCategoryRow[];
  vault?: VaultItemRow[];
}

export type ExportSection = 'history' | 'snippets' | 'vault';

export async function exportData(sections: ExportSection[]): Promise<boolean> {
  const db = getDatabase();
  const data: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
  };

  if (sections.includes('history')) {
    data.history = await db.select<ClipboardHistoryRow[]>(
      'SELECT * FROM clipboard_history ORDER BY created_at DESC'
    );
  }

  if (sections.includes('snippets')) {
    data.snippets = await db.select<SnippetRow[]>(
      'SELECT * FROM snippets ORDER BY sort_order'
    );
    data.snippetCategories = await db.select<SnippetCategoryRow[]>(
      'SELECT * FROM snippet_categories ORDER BY sort_order'
    );
  }

  if (sections.includes('vault')) {
    data.vault = await db.select<VaultItemRow[]>(
      'SELECT * FROM vault_items ORDER BY sort_order'
    );
  }

  const filePath = await save({
    defaultPath: `qliplab-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!filePath) return false;

  await writeTextFile(filePath, JSON.stringify(data, null, 2));
  return true;
}

export async function importData(): Promise<{ imported: ExportSection[]; counts: Record<string, number> } | null> {
  const filePath = await open({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    multiple: false,
  });

  if (!filePath) return null;

  const content = await readTextFile(filePath as string);
  const data: ExportData = JSON.parse(content);

  if (!data.version) {
    throw new Error('Invalid backup file: missing version field');
  }

  const db = getDatabase();
  const imported: ExportSection[] = [];
  const counts: Record<string, number> = {};

  if (data.history && data.history.length > 0) {
    let count = 0;
    for (const row of data.history) {
      try {
        await db.execute(
          `INSERT OR IGNORE INTO clipboard_history (id, content, html_content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.content, row.html_content, row.content_type, row.detected_format, row.source_app, row.is_pinned, row.is_sensitive, row.created_at, row.updated_at]
        );
        count++;
      } catch {
        // Skip duplicates
      }
    }
    imported.push('history');
    counts.history = count;
  }

  if (data.snippetCategories && data.snippetCategories.length > 0) {
    for (const row of data.snippetCategories) {
      try {
        await db.execute(
          `INSERT OR IGNORE INTO snippet_categories (id, name, icon, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [row.id, row.name, row.icon, row.sort_order, row.created_at]
        );
      } catch {
        // Skip duplicates
      }
    }
  }

  if (data.snippets && data.snippets.length > 0) {
    let count = 0;
    for (const row of data.snippets) {
      try {
        await db.execute(
          `INSERT OR IGNORE INTO snippets (id, title, content, trigger, category_id, syntax, is_pinned, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.title, row.content, row.trigger, row.category_id, row.syntax, row.is_pinned, row.sort_order, row.created_at, row.updated_at]
        );
        count++;
      } catch {
        // Skip duplicates
      }
    }
    imported.push('snippets');
    counts.snippets = count;
  }

  if (data.vault && data.vault.length > 0) {
    let count = 0;
    for (const row of data.vault) {
      try {
        await db.execute(
          `INSERT OR IGNORE INTO vault_items (id, type, title, encrypted_data, trigger, icon, is_pinned, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.type, row.title, row.encrypted_data, row.trigger, row.icon, row.is_pinned, row.sort_order, row.created_at, row.updated_at]
        );
        count++;
      } catch {
        // Skip duplicates
      }
    }
    imported.push('vault');
    counts.vault = count;
  }

  return { imported, counts };
}
