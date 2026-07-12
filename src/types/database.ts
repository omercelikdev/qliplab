// Database row types — these match the SQLite column names (snake_case)
// Used as type parameters for db.select<T[]>() calls

export interface ClipboardHistoryRow {
  id: string;
  content: string;
  html_content: string | null;
  content_type: string;
  detected_format: string;
  source_app: string | null;
  is_pinned: number;
  is_sensitive: number;
  created_at: string;
  updated_at: string;
  /** Times this clip has been pasted — drives the "Most used" sort. */
  paste_count?: number;
}

export interface SnippetRow {
  id: string;
  title: string;
  content: string;
  trigger: string | null;
  category_id: string | null;
  syntax: string | null;
  is_pinned: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SnippetCategoryRow {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface VaultItemRow {
  id: string;
  type: string;
  title: string;
  encrypted_data: string;
  trigger: string | null;
  icon: string | null;
  is_pinned: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VaultSettingsRow {
  key: string;
  value: string;
}

export interface TagRow {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface ItemTagRow {
  item_id: string;
  tag_id: string;
}
