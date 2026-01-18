# qliplab State Management

## Overview

qliplab uses **Zustand** for state management. Each domain has its own store with a clear separation of concerns.

```
src/stores/
├── appStore.ts       # UI state, tabs, search, diff mode
├── historyStore.ts   # Clipboard history
├── snippetStore.ts   # User snippets
├── vaultStore.ts     # Encrypted vault
├── previewStore.ts   # Transform/diff preview panel
├── settingsStore.ts  # App settings
└── feedbackStore.ts  # Issue reporting
```

---

## appStore

**Path**: `src/stores/appStore.ts`

Global UI state and navigation.

### State

```typescript
interface AppState {
  activeTab: 'history' | 'snippets' | 'vault';
  previewOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  searchQuery: string;
  isTransformMode: boolean;
  isDiffMode: boolean;
  diffSelectedIds: string[];
}
```

### Actions

| Action | Description |
|--------|-------------|
| `setActiveTab(tab)` | Switch tabs, clears search query |
| `setPreviewOpen(open)` | Toggle preview panel visibility |
| `setTheme(theme)` | Change theme |
| `setSearchQuery(query)` | Update search filter |
| `setTransformMode(active)` | Toggle transform mode |
| `setDiffMode(active)` | Toggle diff mode, clears selection |
| `addToDiffSelection(id)` | Add item to diff (max 2) |
| `clearDiffSelection()` | Reset diff selection |

### Usage

```typescript
import { useAppStore } from '@/stores/appStore';

function MyComponent() {
  const { activeTab, setActiveTab, searchQuery } = useAppStore();
  // or with selector
  const isDiffMode = useAppStore((state) => state.isDiffMode);
}
```

---

## historyStore

**Path**: `src/stores/historyStore.ts`

Clipboard history management with SQLite persistence.

### State

```typescript
interface HistoryState {
  items: ClipboardItem[];
  isLoading: boolean;
}
```

### Actions

| Action | Description |
|--------|-------------|
| `loadItems()` | Load from SQLite (limit 100, pinned first) |
| `addItem(item)` | Add new item or update timestamp if duplicate |
| `deleteItem(id)` | Remove single item |
| `togglePin(id)` | Pin/unpin item |
| `clearAll()` | Delete all non-pinned items |

### Database Queries

```typescript
// Load items
db.select('SELECT * FROM clipboard_history ORDER BY is_pinned DESC, created_at DESC LIMIT 100');

// Add item (with duplicate check)
const existing = items.find(i => i.content === item.content);
if (existing) {
  db.execute('UPDATE clipboard_history SET updated_at = ? WHERE id = ?', [now, existing.id]);
} else {
  db.execute('INSERT INTO clipboard_history ...', [...]);
}

// Delete
db.execute('DELETE FROM clipboard_history WHERE id = ?', [id]);

// Toggle pin
db.execute('UPDATE clipboard_history SET is_pinned = ? WHERE id = ?', [newPinned ? 1 : 0, id]);

// Clear all (preserves pinned)
db.execute('DELETE FROM clipboard_history WHERE is_pinned = 0');
```

---

## snippetStore

**Path**: `src/stores/snippetStore.ts`

User-created snippets management.

### State

```typescript
interface SnippetState {
  snippets: Snippet[];
  categories: SnippetCategory[];
  selectedCategoryId: string | null;
  isLoading: boolean;
}
```

### Actions

| Action | Description |
|--------|-------------|
| `loadSnippets()` | Load all snippets from SQLite |
| `createSnippet(data)` | Create new snippet |
| `updateSnippet(id, data)` | Modify existing snippet |
| `deleteSnippet(id)` | Remove snippet |
| `loadCategories()` | Load snippet categories |
| `createCategory(name)` | Create new category |
| `setSelectedCategory(id)` | Filter by category |

---

## vaultStore

**Path**: `src/stores/vaultStore.ts`

Encrypted vault with session-based decryption.

### State

```typescript
interface VaultState {
  isLocked: boolean;
  items: VaultItem[];
}
```

### Session Password

```typescript
// Module-level variable (not in state)
let sessionPassword: string | null = null;
```

### Actions

| Action | Description |
|--------|-------------|
| `unlock(password)` | Verify password, load & decrypt items |
| `lock()` | Clear session password, hide items |
| `loadItems(password)` | Decrypt all vault items |
| `createItem(type, title, data)` | Encrypt and save new item |
| `deleteItem(id)` | Remove vault item |

### Unlock Flow

```typescript
unlock: async (password) => {
  const db = getDatabase();

  // Check if master password exists
  const result = await db.select(
    "SELECT value FROM vault_settings WHERE key = 'master_password_hash'"
  );

  if (result.length === 0) {
    // First time - create master password
    const hash = await hashPassword(password);
    await db.execute(
      "INSERT INTO vault_settings (key, value) VALUES ('master_password_hash', ?)",
      [hash]
    );
    sessionPassword = password;
    set({ isLocked: false });
    return true;
  }

  // Verify existing password
  const storedHash = result[0].value;
  const inputHash = await hashPassword(password);

  if (storedHash === inputHash) {
    sessionPassword = password;
    await get().loadItems(password);
    set({ isLocked: false });
    return true;
  }
  return false;
}
```

### Encryption Details

```typescript
// Create item
createItem: async (type, title, data) => {
  if (!sessionPassword) return;

  const encryptedData = await encrypt(
    JSON.stringify(data),
    sessionPassword
  );

  await db.execute(
    'INSERT INTO vault_items ... VALUES (?, ?, ?, ?, ...)',
    [id, type, title, encryptedData, ...]
  );
}

// Load items (decrypt)
loadItems: async (password) => {
  const result = await db.select('SELECT * FROM vault_items ...');

  const items = await Promise.all(
    result.map(async (row) => ({
      ...row,
      data: JSON.parse(await decrypt(row.encrypted_data, password)),
    }))
  );

  set({ items });
}
```

---

## previewStore

**Path**: `src/stores/previewStore.ts`

Transform and diff preview panel state.

### State

```typescript
interface PreviewState {
  isOpen: boolean;
  mode: 'transform' | 'diff';
  sourceItem: ClipboardItem | null;
  transformedContent: string;
  transformType: string;
  diffItems: [ClipboardItem | null, ClipboardItem | null];
}
```

### Actions

| Action | Description |
|--------|-------------|
| `openTransform(item, type, content)` | Show transform preview |
| `openDiff(items)` | Show diff view |
| `close()` | Close preview panel |

### Window Management

```typescript
openTransform: (item, type, content) => {
  const wasOpen = get().isOpen;
  set({ isOpen: true, mode: 'transform', ... });

  if (!wasOpen) {
    expandWindowForPreview();  // 420px → 840px
  }
}

close: () => {
  set({ isOpen: false, ... });
  shrinkWindowFromPreview();  // 840px → 420px
}
```

---

## settingsStore

**Path**: `src/stores/settingsStore.ts`

App settings with tauri-plugin-store persistence.

### State

```typescript
interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  historyLimit: number;
  autoLockMinutes: number;
  sensitiveDetectionEnabled: boolean;
  storeImages: boolean;
  clearHistoryOnQuit: boolean;
}
```

### Default Values

```typescript
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  historyLimit: 100,
  autoLockMinutes: 5,
  sensitiveDetectionEnabled: true,
  storeImages: true,
  clearHistoryOnQuit: false,
};
```

### Actions

| Action | Description |
|--------|-------------|
| `loadSettings()` | Load from settings.json |
| `updateSetting(key, value)` | Update single setting |

### Persistence

```typescript
// Uses tauri-plugin-store
import { Store } from '@tauri-apps/plugin-store';

let store: Store | null = null;

loadSettings: async () => {
  store = await Store.load('settings.json');

  const savedSettings: Partial<AppSettings> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = await store.get(key);
    if (value !== null) savedSettings[key] = value;
  }

  set({ settings: { ...DEFAULT_SETTINGS, ...savedSettings } });
}

updateSetting: async (key, value) => {
  if (!store) return;
  await store.set(key, value);
  await store.save();
  set((state) => ({ settings: { ...state.settings, [key]: value } }));
}
```

---

## feedbackStore

**Path**: `src/stores/feedbackStore.ts`

Issue reporting and error tracking.

### State

```typescript
interface FeedbackState {
  isSubmitting: boolean;
  autoErrorReporting: boolean;
  hasSeenOptIn: boolean;
}
```

### Actions

| Action | Description |
|--------|-------------|
| `loadSettings()` | Load feedback preferences |
| `setAutoErrorReporting(enabled)` | Toggle auto crash reporting |
| `setHasSeenOptIn(seen)` | Mark opt-in dialog as seen |
| `submitIssue(data)` | Create GitHub issue via Val.town |

### Issue Submission

```typescript
submitIssue: async (data: IssueData) => {
  set({ isSubmitting: true });

  try {
    let systemInfoFormatted: string | undefined;
    if (data.includeSystemInfo) {
      const systemInfo = await getSystemInfo();
      systemInfoFormatted = formatSystemInfoForReport(systemInfo);
    }

    const title = `[${TYPE_PREFIXES[data.type]}] ${data.title}`;
    const body = formatIssueBody(data, systemInfoFormatted);
    const labels = [...TYPE_LABELS[data.type], PRIORITY_LABELS[data.priority]];

    const response = await fetch(CONFIG.ISSUE_REPORTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, labels }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to submit issue');
    }

    return { success: true, url: result.issueUrl };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    set({ isSubmitting: false });
  }
}
```

---

## Store Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ appStore │  │ settings │  │ feedback │  │ preview  │    │
│  │          │  │  Store   │  │  Store   │  │  Store   │    │
│  └────┬─────┘  └──────────┘  └──────────┘  └────┬─────┘    │
│       │                                          │          │
│       │ activeTab                                │          │
│       │                                          │          │
│  ┌────▼─────┐  ┌──────────┐  ┌──────────┐       │          │
│  │ Tab View │──│ history  │  │ snippet  │       │          │
│  │          │  │  Store   │  │  Store   │       │          │
│  │          │  └──────────┘  └──────────┘       │          │
│  │          │                                    │          │
│  │          │  ┌──────────┐                     │          │
│  │          │──│  vault   │                     │          │
│  └──────────┘  │  Store   │                     │          │
│                └──────────┘                     │          │
│                                                 │          │
│  openTransform() / openDiff() ─────────────────▶│          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Best Practices

### 1. Use Selectors
```typescript
// Good - selective subscription
const isDiffMode = useAppStore((state) => state.isDiffMode);

// Avoid - subscribes to all state changes
const { isDiffMode, activeTab, ... } = useAppStore();
```

### 2. Access State Outside React
```typescript
// Get current state synchronously
const currentState = useAppStore.getState();
const items = useHistoryStore.getState().items;
```

### 3. Async Actions Pattern
```typescript
// Actions that need current state
addItem: async (item) => {
  const existing = get().items.find(i => i.content === item.content);
  // ... use get() inside async actions
}
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Domain](./DOMAIN.md) - Data models
- [Features](./FEATURES.md) - Feature specs
- [Components](./COMPONENTS.md) - UI reference
