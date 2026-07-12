import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function initDatabase() {
  try {
    db = await Database.load('sqlite:qliplab.db');
  } catch (e) {
    console.error('[qliplab] Database load failed, attempting fresh init:', e);
    // If DB is corrupted, try to create a fresh one
    // The old file will be inaccessible but data is lost — better than app not starting
    try {
      db = await Database.load('sqlite:qliplab_recovery.db');
      console.warn('[qliplab] Using recovery database — previous data may be lost');
    } catch {
      throw new Error('Database initialization failed completely');
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS clipboard_history (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      content_type TEXT NOT NULL,
      detected_format TEXT,
      source_app TEXT,
      is_pinned INTEGER DEFAULT 0,
      is_sensitive INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_created_at ON clipboard_history(created_at DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_pinned_created ON clipboard_history(is_pinned DESC, created_at DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_detected_format ON clipboard_history(detected_format)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_content_type ON clipboard_history(content_type)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_source_app ON clipboard_history(source_app)`);

  // Migration: add html_content column for rich text support
  try {
    await db.execute(`ALTER TABLE clipboard_history ADD COLUMN html_content TEXT`);
  } catch {
    // Column already exists
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category_id TEXT,
      syntax TEXT,
      is_pinned INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Migration: rename is_favorite → is_pinned in snippets
  try {
    await db.execute(`ALTER TABLE snippets ADD COLUMN is_pinned INTEGER DEFAULT 0`);
    await db.execute(`UPDATE snippets SET is_pinned = is_favorite`);
  } catch {
    // Column already exists
  }

  // Migration: add trigger column for snippet auto-expand
  try {
    await db.execute(`ALTER TABLE snippets ADD COLUMN trigger TEXT`);
  } catch {
    // Column already exists
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS snippet_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      icon TEXT,
      is_pinned INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Migration: rename is_favorite → is_pinned in vault_items
  try {
    await db.execute(`ALTER TABLE vault_items ADD COLUMN is_pinned INTEGER DEFAULT 0`);
    await db.execute(`UPDATE vault_items SET is_pinned = is_favorite`);
  } catch {
    // Column already exists
  }

  // Migration: add trigger column for vault auto-expand
  try {
    await db.execute(`ALTER TABLE vault_items ADD COLUMN trigger TEXT`);
  } catch {
    // Column already exists
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vault_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Tags system (many-to-many)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS item_tags (
      item_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (item_id, tag_id),
      FOREIGN KEY (item_id) REFERENCES clipboard_history(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id)`);
}

export function getDatabase() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// --- Clipboard history query helpers ---

import type { ClipboardHistoryRow } from '@/types/database';
import { FORMAT_FILTER_GROUPS, CATEGORIZED_FORMATS } from '@/stores/appStore';
import type { FormatFilterGroup } from '@/stores/appStore';
import { tokenizeSearchQuery, escapeLikePattern } from '@/lib/searchQuery';

export interface HistoryQueryParams {
  formatFilter: FormatFilterGroup;
  searchQuery: string;
  /** Restrict to clips copied from this app. null = every app. */
  sourceApp?: string | null;
  /** Restrict to clips carrying this tag. null = every tag. */
  tagId?: string | null;
  limit: number;
  offset: number;
}

/** Exported for tests: the SQL must stay parameterized and the filters must compose. */
export function buildWhereClause(
  params: Omit<HistoryQueryParams, 'limit' | 'offset'>,
): { where: string; args: (string | number)[] } {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  // Pinned filter (special case — not format-based)
  if (params.formatFilter === 'pinned') {
    conditions.push('is_pinned = 1');
  }

  // Format filter
  if (params.formatFilter === 'other') {
    const categorized = Array.from(CATEGORIZED_FORMATS);
    if (categorized.length > 0) {
      conditions.push(`detected_format NOT IN (${categorized.map(() => '?').join(',')})`);
      args.push(...categorized);
    }
  } else if (params.formatFilter !== 'all') {
    const formats = FORMAT_FILTER_GROUPS[params.formatFilter].formats;
    if (formats && formats.length > 0) {
      conditions.push(`detected_format IN (${formats.map(() => '?').join(',')})`);
      args.push(...formats);
    }
  }

  // Source app filter — uses idx_source_app
  if (params.sourceApp) {
    conditions.push('source_app = ?');
    args.push(params.sourceApp);
  }

  // Tag filter — EXISTS over item_tags (idx_item_tags_tag) so it matches across
  // the whole table, not just the page already loaded into memory.
  if (params.tagId) {
    conditions.push('EXISTS (SELECT 1 FROM item_tags WHERE item_id = clipboard_history.id AND tag_id = ?)');
    args.push(params.tagId);
  }

  // Search — only text items, case-insensitive LIKE.
  // Every token must appear somewhere in the content, in any order, so
  // "select users" finds "SELECT id FROM users".
  const tokens = tokenizeSearchQuery(params.searchQuery);
  if (tokens.length > 0) {
    conditions.push(`content_type != 'image'`);
    for (const token of tokens) {
      conditions.push(`content LIKE ? ESCAPE '\\'`);
      args.push(`%${escapeLikePattern(token)}%`);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, args };
}

/**
 * Distinct apps that clips were copied from, most-used first.
 * `source_app` is empty on Linux (see `get_frontmost_app`), so those rows are skipped.
 */
export async function getSourceApps(): Promise<string[]> {
  const db = getDatabase();
  const rows = await db.select<{ source_app: string }[]>(
    `SELECT source_app FROM clipboard_history
     WHERE source_app IS NOT NULL AND source_app != ''
     GROUP BY source_app ORDER BY COUNT(*) DESC, source_app ASC`
  );
  return rows.map((r) => r.source_app);
}

export async function queryHistoryItems(params: HistoryQueryParams): Promise<ClipboardHistoryRow[]> {
  const db = getDatabase();
  const { where, args } = buildWhereClause(params);
  const sql = `SELECT * FROM clipboard_history ${where} ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?`;
  args.push(params.limit, params.offset);
  return db.select<ClipboardHistoryRow[]>(sql, args);
}

export async function countHistoryItems(params: Omit<HistoryQueryParams, 'limit' | 'offset'>): Promise<number> {
  const db = getDatabase();
  const { where, args } = buildWhereClause(params);
  const result = await db.select<{ count: number }[]>(`SELECT COUNT(*) as count FROM clipboard_history ${where}`, args);
  return result[0]?.count ?? 0;
}
