# qliplab Domain Model

## Core Concepts

qliplab is organized around three main domains:

1. **Clipboard History** - Automatic capture and management of copied content
2. **Snippets** - User-created reusable text/code blocks
3. **Vault** - Encrypted storage for sensitive information

---

## 1. Clipboard History Domain

### ClipboardItem

Represents a single clipboard entry captured from the system.

```typescript
interface ClipboardItem {
  id: string;              // UUID
  content: string;         // The copied text content
  contentType: ContentType; // Type of content
  detectedFormat: DetectedFormat; // Auto-detected format
  sourceApp?: string;      // Application where content was copied (optional)
  isPinned: boolean;       // Pinned items persist on clearAll
  isSensitive: boolean;    // Auto-detected sensitive content flag
  createdAt: Date;
  updatedAt: Date;
}
```

### ContentType

```typescript
type ContentType = 'text' | 'image' | 'file';
```

Currently only `text` is fully implemented.

### DetectedFormat

Auto-detection of content format for smart transforms:

```typescript
type DetectedFormat =
  | 'json'        // Valid JSON object or array
  | 'jwt'         // JWT token (eyJ...)
  | 'base64'      // Base64 encoded string
  | 'url'         // HTTP/HTTPS URL
  | 'url_encoded' // URL encoded string
  | 'sql'         // SQL statement
  | 'xml'         // XML document
  | 'html'        // HTML document
  | 'uuid'        // UUID format
  | 'timestamp'   // Unix timestamp
  | 'plain';      // Plain text (default)
```

### Format Detection Logic

| Format | Detection Pattern |
|--------|------------------|
| JSON | Starts with `{` or `[`, valid JSON.parse() |
| JWT | Matches `eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+` |
| UUID | Matches `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}` |
| URL | Starts with `http://` or `https://` |
| Base64 | Matches `[A-Za-z0-9+/]+=*` with length > 20 |
| SQL | Starts with SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP |
| XML/HTML | Matches `<tag>...</tag>` pattern |
| Timestamp | 10-13 digit number representing valid date |

### Sensitive Content Detection

Content is flagged as sensitive if it matches:
- `password[:=]` pattern
- `secret[:=]` pattern
- `api[_-]?key[:=]` pattern
- `token[:=]` pattern
- IBAN format
- Credit card number (16 digits with optional separators)

---

## 2. Snippets Domain

### Snippet

User-created reusable text blocks.

```typescript
interface Snippet {
  id: string;           // UUID
  title: string;        // Display name
  content: string;      // The snippet content
  categoryId?: string;  // Optional category reference
  syntax: string;       // Syntax highlighting type (e.g., 'javascript', 'plain')
  isFavorite: boolean;  // Starred for quick access
  sortOrder: number;    // Display order
  createdAt: Date;
  updatedAt: Date;
}
```

### SnippetCategory

Organizational grouping for snippets.

```typescript
interface SnippetCategory {
  id: string;
  name: string;
  icon?: string;      // Optional icon identifier
  sortOrder: number;
  createdAt: Date;
}
```

---

## 3. Vault Domain

### VaultItem

Encrypted storage item for sensitive data.

```typescript
interface VaultItem {
  id: string;
  type: VaultItemType;    // Category of vault item
  title: string;          // Display name (searchable)
  data: any;              // Decrypted data object (type-specific)
  icon?: string;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### VaultItemType

```typescript
type VaultItemType = 'card' | 'bank' | 'address' | 'code' | 'personal' | 'company';
```

### Type-Specific Data Structures

#### CardData (Credit/Debit Cards)
```typescript
interface CardData {
  cardholderName: string;
  cardNumber: string;     // Main value for copy
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}
```

#### BankData (Bank Accounts)
```typescript
interface BankData {
  bankName: string;
  accountHolder: string;
  iban: string;           // Main value for copy
  swift?: string;
}
```

#### AddressData (Physical Addresses)
```typescript
interface AddressData {
  street: string;         // Main value for copy
  city: string;
  postalCode: string;
  country: string;
}
```

#### CodeData (PINs, Passwords, etc.)
```typescript
interface CodeData {
  code: string;           // Main value for copy
  notes?: string;
}
```

### Vault Security Model

1. **Master Password**: Required to unlock vault
   - Hashed with SHA-256 for verification
   - Never stored in plaintext

2. **Encryption**: AES-256-GCM
   - Key derived via PBKDF2 (100,000 iterations)
   - Random salt (16 bytes) per encryption
   - Random IV (12 bytes) per encryption

3. **Session Management**:
   - Password kept in memory during session
   - Auto-lock after configurable timeout (default: 5 minutes)
   - Cleared on app quit or manual lock

---

## 4. Settings Domain

### AppSettings

```typescript
interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  historyLimit: number;              // Max items in history (50, 100, 200, 500)
  autoLockMinutes: number;           // Vault auto-lock (1, 5, 15, 0=never)
  sensitiveDetectionEnabled: boolean;
  storeImages: boolean;
  clearHistoryOnQuit: boolean;
}
```

---

## 5. Feedback Domain

### IssueData

For user-reported issues.

```typescript
interface IssueData {
  type: IssueType;
  title: string;
  description: string;
  steps?: string;           // Steps to reproduce (for bugs)
  priority: Priority;
  includeSystemInfo: boolean;
}

type IssueType = 'bug' | 'feature' | 'question' | 'other';
type Priority = 'low' | 'medium' | 'high' | 'critical';
```

### AutoErrorReport

For automatic crash reporting.

```typescript
interface AutoErrorReport {
  type: 'crash' | 'unhandled_exception' | 'api_error' | 'database_error';
  message: string;
  stack?: string;
  severity: 'critical' | 'error' | 'warning';
  context: {
    component?: string;
    action?: string;
    route?: string;
  };
  timestamp: string;
  appVersion: string;
}
```

---

## Database Schema

### clipboard_history
```sql
CREATE TABLE clipboard_history (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL,
  detected_format TEXT,
  source_app TEXT,
  is_pinned INTEGER DEFAULT 0,
  is_sensitive INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_created_at ON clipboard_history(created_at DESC);
```

### snippets
```sql
CREATE TABLE snippets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id TEXT,
  syntax TEXT,
  is_favorite INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### snippet_categories
```sql
CREATE TABLE snippet_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
```

### vault_items
```sql
CREATE TABLE vault_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,  -- AES-256-GCM encrypted JSON
  icon TEXT,
  is_favorite INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### vault_settings
```sql
CREATE TABLE vault_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Stores: master_password_hash
```

---

## User Flows

### 1. Copy & Paste Flow
```
User copies text anywhere
    ↓
useClipboardListener detects change (500ms polling)
    ↓
detectFormat() identifies content type
    ↓
isSensitive() checks for sensitive patterns
    ↓
historyStore.addItem() saves to SQLite
    ↓
User opens qliplab (Cmd+Shift+V)
    ↓
Clicks item to paste
    ↓
Content written to clipboard
    ↓
Window hides, previous app activated
    ↓
Cmd+V simulated → content pasted
```

### 2. Transform Flow
```
User hovers history item
    ↓
Opens context menu (3-dot icon)
    ↓
Selects transform (e.g., "Beautify JSON")
    ↓
Window expands to 840px
    ↓
PreviewPanel shows transformed content
    ↓
User clicks "Paste" → transformed content pasted
```

### 3. Diff Flow
```
User presses Option+D
    ↓
Diff mode activated (crosshair cursor)
    ↓
User selects 2 history items
    ↓
Window expands
    ↓
DiffView shows side-by-side comparison
    ↓
Color coding: green=insert, red=delete, yellow=replace
```

### 4. Vault Flow
```
User switches to Vault tab
    ↓
VaultLock shown (first time: creates password)
    ↓
User enters master password
    ↓
Password hashed & verified
    ↓
Items decrypted with session password
    ↓
User clicks item → main value copied & pasted
    ↓
Auto-lock after timeout or manual lock
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture
- [Features](./FEATURES.md) - Feature specifications
- [Components](./COMPONENTS.md) - UI components
- [Stores](./STORES.md) - State management
