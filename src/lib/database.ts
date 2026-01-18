import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function initDatabase() {
  db = await Database.load('sqlite:qliplab.db');

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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category_id TEXT,
      syntax TEXT,
      is_favorite INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

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
      is_favorite INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vault_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

export function getDatabase() {
  if (!db) throw new Error('Database not initialized');
  return db;
}
