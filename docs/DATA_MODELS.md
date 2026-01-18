# Data Models

## clipboard_history
- id, content, content_type, detected_format
- source_app, is_pinned, is_sensitive
- created_at, updated_at

## snippets
- id, title, content, category_id, syntax
- is_favorite, sort_order, created_at, updated_at

## vault_items
- id, type, title, encrypted_data
- icon, is_favorite, sort_order, created_at, updated_at
