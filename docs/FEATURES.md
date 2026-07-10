# qliplab Features

## Feature Summary

| Feature | Status | Phase |
|---------|--------|-------|
| Clipboard History | Complete | Phase 1-2 |
| Format Auto-Detection | Complete | Phase 2 |
| Smart Transforms | Complete | Phase 3 |
| Diff Mode | Complete | Phase 4 |
| Snippets | Complete | Phase 5 |
| Secure Vault | Complete | Phase 3 |
| Settings | Complete | Phase 2 |
| Global Shortcut | Complete | Phase 2 |
| Ditto-like Paste | Complete | Enhancement |
| Issue Reporting | Complete | Enhancement |
| Search (All Tabs) | Complete | Enhancement |

---

## 1. Clipboard History

### Description
Automatically captures everything copied to the system clipboard and stores it in a searchable history.

### Technical Implementation

**Hook**: `src/hooks/useClipboardListener.ts`
```typescript
// Polls clipboard every 500ms
const interval = setInterval(checkClipboard, 500);

// On new content:
await addItem({
  content,
  contentType: 'text',
  detectedFormat: detectFormat(content),
  isSensitive: isSensitive(content),
});
```

**Store**: `src/stores/historyStore.ts`
- `items: ClipboardItem[]` - Current history items
- `loadItems()` - Load from SQLite (limit 100, pinned first)
- `addItem()` - Add new item (updates timestamp if duplicate)
- `deleteItem()` - Remove single item
- `togglePin()` - Pin/unpin item
- `clearAll()` - Delete non-pinned items

**Components**:
- `HistoryList` - Scrollable list with keyboard navigation
- `HistoryItem` - Single item row with format icon
- `ItemMenu` - Context menu with actions

### User Interaction
1. Copy text anywhere on system
2. Open qliplab (Cmd+Shift+V)
3. Browse history, search, or scroll
4. Click item to paste to previous app
5. Use arrow keys + Enter for keyboard navigation

---

## 2. Format Auto-Detection

### Description
Automatically identifies content format (JSON, JWT, URL, etc.) and displays appropriate icon.

### Technical Implementation

**Library**: `src/lib/formatDetector.ts`

```typescript
export function detectFormat(content: string): DetectedFormat {
  // Check patterns in order of specificity
  if (isJSON(content)) return 'json';
  if (isJWT(content)) return 'jwt';
  if (isUUID(content)) return 'uuid';
  if (isURL(content)) return 'url';
  if (isBase64(content)) return 'base64';
  if (isSQL(content)) return 'sql';
  if (isXMLorHTML(content)) return isHTML(content) ? 'html' : 'xml';
  if (isTimestamp(content)) return 'timestamp';
  return 'plain';
}
```

**Component**: `src/components/history/FormatIcon.tsx`
- Color-coded icons for each format
- Displayed in history item rows

### Supported Formats

| Format | Icon Color | Detection |
|--------|-----------|-----------|
| JSON | Blue | Valid JSON parse |
| JWT | Purple | eyJ... pattern |
| Base64 | Orange | Base64 charset, length > 20 |
| URL | Green | http(s):// prefix |
| SQL | Yellow | SQL keyword prefix |
| UUID | Cyan | UUID regex |
| Timestamp | Gray | 10-13 digit date |
| Plain | Default | Fallback |

---

## 3. Smart Transforms

### Description
Context-aware content transformations based on detected format.

### Technical Implementation

**Library**: `src/lib/transforms.ts`

| Transform | Input Format | Function |
|-----------|-------------|----------|
| Beautify JSON | json | `beautifyJson()` |
| Minify JSON | json | `minifyJson()` |
| Decode JWT | jwt | `decodeJwt()` |
| Encode Base64 | any | `encodeBase64()` |
| Decode Base64 | base64 | `decodeBase64()` |
| Decode URL | url_encoded | `decodeUrl()` |
| Format SQL | sql | `formatSql()` |
| Timestamp to Date | timestamp | `timestampToDate()` |

**Store**: `src/stores/previewStore.ts`
- `openTransform(item, type, content)` - Opens preview panel
- Expands window from 420px to 840px

**Components**:
- `PreviewPanel` - Slide-out panel
- `TransformView` - Displays transformed content
- Copy/Paste buttons in footer

### User Interaction
1. Hover over history item
2. Click 3-dot menu button
3. Select transform from menu
4. Preview panel shows result
5. Click "Copy" or "Paste"

---

## 4. Diff Mode

### Description
Compare two clipboard items side-by-side with line-by-line diff visualization.

### Technical Implementation

**Hook**: `src/hooks/useDiffMode.ts`
- Toggle with Option+D (Alt+D on Windows/Linux)
- Escape to exit diff mode
- Tracks selected items (max 2)

**Library**: `src/lib/diff.ts`
```typescript
interface DiffResult {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  left: string;
  right: string;
  leftLine?: number;
  rightLine?: number;
}

export function computeDiff(left: string, right: string): DiffResult[]
```

**Store**: `src/stores/appStore.ts`
- `isDiffMode: boolean`
- `diffSelectedIds: string[]`
- `addToDiffSelection(id)` - Adds item (max 2)
- `clearDiffSelection()` - Resets selection

**Component**: `src/components/preview/DiffView.tsx`
- Side-by-side display
- Color coding: green (insert), red (delete), yellow (replace)

### User Interaction
1. Press Option+D to enter diff mode
2. Cursor changes to crosshair
3. Click first item (highlighted)
4. Click second item
5. Diff panel opens automatically
6. Press Escape or Option+D to exit

---

## 5. Snippets

### Description
Save and organize reusable code/text snippets for quick access.

### Technical Implementation

**Store**: `src/stores/snippetStore.ts`
- `snippets: Snippet[]`
- `loadSnippets()` - Load from SQLite
- `createSnippet()` - Create new snippet
- `updateSnippet()` - Modify existing
- `deleteSnippet()` - Remove snippet

**Components**:
- `SnippetList` - List with "New Snippet" button
- `SnippetItem` - Row with favorite/delete actions
- `NewSnippetDialog` - Creation modal

### User Interaction
1. Switch to Snippets tab
2. Click "New Snippet" button
3. Enter title and content
4. Save snippet
5. Click snippet to paste
6. Star/unstar favorites
7. Delete with trash icon

---

## 6. Secure Vault

### Description
Encrypted storage for sensitive information (cards, bank accounts, addresses, PINs).

### Technical Implementation

**Library**: `src/lib/encryption.ts`
```typescript
// Key derivation
await deriveKey(password, salt)  // PBKDF2, 100k iterations

// Encryption
await encrypt(plaintext, password)  // AES-256-GCM

// Decryption
await decrypt(ciphertext, password)
```

**Store**: `src/stores/vaultStore.ts`
- `isLocked: boolean`
- `items: VaultItem[]`
- `unlock(password)` - Verify/create master password
- `lock()` - Clear session, hide items
- `createItem()` - Encrypt and save
- `deleteItem()` - Remove from vault

**Components**:
- `VaultLock` - Password entry screen
- `VaultList` - Decrypted items list
- `VaultItem` - Single item with reveal/delete
- `NewVaultItemDialog` - Type-specific forms

### Vault Item Types

| Type | Fields | Main Copy Value |
|------|--------|-----------------|
| Card | cardholderName, cardNumber, expiry, cvv | cardNumber |
| Bank | bankName, accountHolder, iban, swift | iban |
| Address | street, city, postalCode, country | street |
| Code | code, notes | code |

### User Interaction
1. Switch to Vault tab
2. Enter master password (creates on first use)
3. Browse vault items
4. Click item to copy main value
5. Hover to reveal/hide values
6. Click "Lock" to secure vault

---

## 7. Settings

### Description
Configure app behavior, theme, and privacy options.

### Technical Implementation

**Store**: `src/stores/settingsStore.ts`
- Uses `tauri-plugin-store` for persistence
- `settings.json` file in app data directory

**Available Settings**:

| Setting | Type | Default | Options |
|---------|------|---------|---------|
| theme | string | 'system' | light, dark, system |
| historyLimit | number | 100 | 50, 100, 200, 500 |
| autoLockMinutes | number | 5 | 1, 5, 15, 0 (never) |
| sensitiveDetectionEnabled | boolean | true | |
| storeImages | boolean | true | |
| clearHistoryOnQuit | boolean | false | |

**Component**: `src/components/settings/SettingsDialog.tsx`

---

## 8. Global Shortcut

### Description
System-wide keyboard shortcut to show/hide qliplab window.

### Technical Implementation

**Hook**: `src/hooks/useGlobalShortcut.ts`
- Registers `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux)
- Uses `tauri-plugin-global-shortcut`

**Behavior**:
- If hidden: Shows window, focuses it
- If visible: Hides window

---

## 9. Ditto-like Paste

### Description
When selecting a clipboard item, automatically paste to the previously active application.

### Technical Implementation

**Frontend**: `src/lib/window.ts`
```typescript
export async function hideAndPaste() {
  await window.hide();
  await invoke('simulate_paste');
}
```

**Backend**: `src-tauri/src/lib.rs`
```rust
#[tauri::command]
fn save_frontmost_app() -> Result<(), String> {
  // AppleScript: Get frontmost app name
  // Store in PREVIOUS_APP static
}

#[tauri::command]
fn simulate_paste() -> Result<(), String> {
  // 1. Activate PREVIOUS_APP
  // 2. AppleScript: keystroke "v" using command down
}
```

### Flow
1. User opens qliplab (Cmd+Shift+V)
2. `save_frontmost_app()` stores current active app
3. User clicks history item
4. Content written to clipboard
5. Window hides
6. `simulate_paste()`: Activates previous app, sends Cmd+V

---

## 10. Issue Reporting

### Description
Built-in system for reporting bugs and requesting features, plus optional automatic crash reporting.

### Technical Implementation

**Store**: `src/stores/feedbackStore.ts`
- `submitIssue(data)` - Create GitHub issue via the Cloudflare Worker proxy
- `setAutoErrorReporting(enabled)` - Toggle auto-reporting

**Library**: `src/lib/errorReporter.ts`
- `reportError(error, context)` - Auto-report crashes
- Rate limiting: 10/hour, 50/day
- Duplicate prevention: 1 minute window

**Config**: `src/lib/config.ts`
```typescript
export const CONFIG = {
  ISSUE_REPORTER_URL: 'https://qliplab-api.omercelikdev.workers.dev/report',
  APP_TOKEN: '...', // soft anti-abuse gate for the Worker
  APP_VERSION: '...', // injected from package.json at build time
};
```

**Components**:
- `ReportIssueDialog` - Manual issue form
- `ErrorReportingOptIn` - First-run opt-in dialog
- `ErrorBoundary` - Catches React errors

### Issue Submission Flow
1. User opens Settings
2. Clicks "Report Issue / Send Feedback"
3. Selects issue type (Bug, Feature, Question, Other)
4. Fills title and description
5. Optionally includes system info
6. Submits → Created as GitHub Issue

### Auto Error Reporting
1. First run shows opt-in dialog
2. If enabled, catches:
   - Unhandled exceptions
   - React error boundaries
   - Global error events
3. Reports via the Cloudflare Worker proxy (holds the GitHub token as a Worker secret)

---

## 11. Search

### Description
Universal search across all three tabs (History, Snippets, Vault).

### Technical Implementation

**Store**: `src/stores/appStore.ts`
```typescript
searchQuery: string;
setSearchQuery: (query) => set({ searchQuery: query });
setActiveTab: (tab) => set({ activeTab: tab, searchQuery: '' }); // Clears on tab change
```

**Component**: `src/components/layout/SearchBar.tsx`
- Dynamic placeholder based on active tab
- Clear button when query exists

**Filtering**:
- History: Searches `content`
- Snippets: Searches `title` and `content`
- Vault: Searches `title` only (security)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+Shift+V | Toggle window |
| Option+D | Toggle diff mode |
| Escape | Exit diff mode / Close preview |
| Arrow Up/Down | Navigate list |
| Enter | Select/paste current item |

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Domain](./DOMAIN.md) - Data models
- [Components](./COMPONENTS.md) - UI reference
- [Stores](./STORES.md) - State management
- [Tauri Backend](./TAURI.md) - Rust implementation
