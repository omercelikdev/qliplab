# qliplab Components

## Component Hierarchy

```
App.tsx
├── ErrorBoundary
│   └── Main Layout
│       ├── DragBar
│       │   └── SettingsDialog
│       │       └── ReportIssueDialog
│       ├── SearchBar
│       ├── TabBar
│       ├── Content Area
│       │   ├── HistoryList
│       │   │   ├── HistoryItem
│       │   │   │   ├── FormatIcon
│       │   │   │   └── ItemMenu
│       │   ├── SnippetList
│       │   │   ├── SnippetItem
│       │   │   └── NewSnippetDialog
│       │   └── VaultList
│       │       ├── VaultLock
│       │       ├── VaultItem
│       │       └── NewVaultItemDialog
│       └── PreviewPanel
│           ├── TransformView
│           └── DiffView
│       └── HintBar
└── ErrorReportingOptIn
```

---

## Layout Components

### DragBar
**Path**: `src/components/layout/DragBar.tsx`

Window drag region with settings button.

```typescript
interface DragBar {
  // No props - uses internal state for settings dialog
}
```

**Features**:
- Enables window dragging via `window.startDragging()`
- Settings gear icon opens SettingsDialog
- Height: 32px (h-8)

---

### SearchBar
**Path**: `src/components/layout/SearchBar.tsx`

Universal search input that filters all tabs.

```typescript
// Uses appStore
const { searchQuery, setSearchQuery, activeTab } = useAppStore();
```

**Features**:
- Dynamic placeholder based on active tab
- Clear button (X) when query exists
- Height: 44px (h-11)

---

### TabBar
**Path**: `src/components/layout/TabBar.tsx`

Navigation between History, Snippets, and Vault.

```typescript
const tabs: { id: Tab; label: string }[] = [
  { id: 'history', label: 'History' },
  { id: 'snippets', label: 'Snippets' },
  { id: 'vault', label: 'Vault' },
];
```

**Features**:
- Tab switching clears search query
- Active tab highlighted with background
- Height: 40px (h-10)

---

### HintBar
**Path**: `src/components/layout/HintBar.tsx`

Keyboard shortcut hints at bottom of window.

**Displayed Hints**:
- History tab: "⌥D Diff mode"
- Diff mode active: "ESC Exit diff • Select 2 items to compare"
- Other tabs: Navigation hints

---

## History Components

### HistoryList
**Path**: `src/components/history/HistoryList.tsx`

Scrollable list of clipboard history items.

```typescript
// Filtering
const filteredItems = searchQuery
  ? items.filter(item =>
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  : items;
```

**Features**:
- Keyboard navigation (up/down arrows, Enter)
- Search filtering
- "No results" message when empty

---

### HistoryItem
**Path**: `src/components/history/HistoryItem.tsx`

Single clipboard history entry.

```typescript
interface HistoryItemProps {
  item: ClipboardItem;
  isSelected?: boolean;  // Keyboard navigation highlight
}
```

**Features**:
- Click to copy & paste
- Hover shows menu button (3-dot)
- Pin icon for pinned items
- Format icon indicates content type
- Diff mode: crosshair cursor, ring highlight on selection
- Scale animation on click (whileTap)

---

### FormatIcon
**Path**: `src/components/history/FormatIcon.tsx`

Color-coded icon for detected format.

```typescript
interface FormatIconProps {
  format: DetectedFormat;
}
```

**Color Mapping**:
| Format | Color |
|--------|-------|
| json | text-blue-500 |
| jwt | text-purple-500 |
| base64 | text-orange-500 |
| url | text-green-500 |
| sql | text-yellow-500 |
| xml/html | text-pink-500 |
| uuid | text-cyan-500 |
| timestamp | text-gray-500 |
| plain | text-muted-foreground |

---

### ItemMenu
**Path**: `src/components/history/ItemMenu.tsx`

Context menu for history item actions.

```typescript
interface ItemMenuProps {
  item: ClipboardItem;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
}
```

**Menu Items**:
- Copy (always visible)
- Format-specific transforms (conditional)
- Pin/Unpin
- Delete

**Position Calculation**:
- Anchored to menu button
- Adjusts for viewport boundaries
- Portal rendered to document.body

---

## Snippets Components

### SnippetList
**Path**: `src/components/snippets/SnippetList.tsx`

List of user-created snippets.

```typescript
// Filtering
const filteredSnippets = searchQuery
  ? snippets.filter(snippet =>
      snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  : snippets;
```

**Features**:
- Keyboard navigation
- Search by title and content
- "New Snippet" button at bottom

---

### SnippetItem
**Path**: `src/components/snippets/SnippetItem.tsx`

Single snippet entry.

```typescript
interface SnippetItemProps {
  snippet: Snippet;
  isSelected?: boolean;
}
```

**Features**:
- Click to copy & paste
- Hover shows star and delete buttons
- Star icon for favorites
- Displays title and content preview

---

### NewSnippetDialog
**Path**: `src/components/snippets/NewSnippetDialog.tsx`

Modal for creating new snippets.

```typescript
interface NewSnippetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Form Fields**:
- Title (text input)
- Content (textarea, 6 rows, monospace font)

---

## Vault Components

### VaultLock
**Path**: `src/components/vault/VaultLock.tsx`

Password entry screen for locked vault.

**Features**:
- Password input with show/hide toggle
- Error message on wrong password
- First-time use creates master password

---

### VaultList
**Path**: `src/components/vault/VaultList.tsx`

List of decrypted vault items.

```typescript
// Filtering (title only for security)
const filteredItems = searchQuery
  ? items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  : items;
```

**Features**:
- Lock button in header
- Keyboard navigation
- "Add Item" button at bottom

---

### VaultItem
**Path**: `src/components/vault/VaultItem.tsx`

Single vault entry.

```typescript
interface VaultItemProps {
  item: VaultItem;
  isSelected?: boolean;
}
```

**Features**:
- Type-specific icon (Card, Bank, Address, Key)
- Masked preview (•••• •••• 1234)
- Hover shows reveal and delete buttons
- Click to copy main value

---

### NewVaultItemDialog
**Path**: `src/components/vault/NewVaultItemDialog.tsx`

Modal for creating new vault items.

**Type Selection**:
- Card (CreditCard icon)
- Bank (Building icon)
- Address (MapPin icon)
- Code (Key icon)

**Dynamic Form Fields**:
Based on selected type, shows appropriate input fields.

---

## Preview Components

### PreviewPanel
**Path**: `src/components/preview/PreviewPanel.tsx`

Slide-out panel for transforms and diffs.

```typescript
// Uses previewStore
const { isOpen, mode, transformedContent, transformType, close } = usePreviewStore();
```

**Features**:
- Animated width expansion (420px → 840px)
- Header shows transform type or "Diff"
- Copy and Paste buttons (transform mode only)
- Close button

---

### TransformView
**Path**: `src/components/preview/TransformView.tsx`

Displays transformed content in preview panel.

**Features**:
- Monospace font
- Preserves whitespace
- Scrollable content area

---

### DiffView
**Path**: `src/components/preview/DiffView.tsx`

Side-by-side diff comparison.

```typescript
// Uses diff library
const results = computeDiff(leftContent, rightContent);
```

**Color Coding**:
| Type | Left Side | Right Side |
|------|-----------|------------|
| equal | Default | Default |
| insert | - | Green background |
| delete | Red background | - |
| replace | Yellow background | Yellow background |

---

## Settings Components

### SettingsDialog
**Path**: `src/components/settings/SettingsDialog.tsx`

Full-screen settings modal.

**Sections**:
1. **Theme**: Light / Dark / System buttons
2. **History Limit**: Dropdown (50, 100, 200, 500)
3. **Vault Auto-lock**: Dropdown (1, 5, 15 min, Never)
4. **Toggles**:
   - Detect sensitive data
   - Store images
   - Clear on quit
5. **Privacy & Reporting**:
   - Auto Error Reporting toggle
6. **Report Issue Button**

---

## Feedback Components

### ReportIssueDialog
**Path**: `src/components/feedback/ReportIssueDialog.tsx`

Issue/feedback submission form.

```typescript
interface ReportIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Form Fields**:
- Issue Type: Bug, Feature, Question, Other
- Title (required, min 5 chars)
- Description (required, min 20 chars)
- Steps to Reproduce (bug only)
- Priority: Low, Medium, High, Critical
- Include system info checkbox

**Validation**:
- Title: ≥ 5 characters
- Description: ≥ 20 characters

---

### ErrorReportingOptIn
**Path**: `src/components/feedback/ErrorReportingOptIn.tsx`

First-run dialog for crash reporting opt-in.

```typescript
interface ErrorReportingOptInProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Content**:
- What we collect (error messages, OS, app version)
- What we DON'T collect (clipboard, snippets, personal data)
- Enable/Decline buttons

---

### ErrorBoundary
**Path**: `src/components/ErrorBoundary.tsx`

React error boundary that catches and reports errors.

```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
```

**Features**:
- Catches React render errors
- Reports to GitHub via errorReporter
- Displays fallback UI with retry button

---

## UI Components

### ScrollArea
**Path**: `src/components/ui/scroll-area.tsx`

Custom scrollbar component (shadcn/ui).

```typescript
<ScrollArea className="h-full">
  {children}
</ScrollArea>
```

---

## Component Styling Conventions

### Common Classes

```typescript
// Buttons
'cursor-pointer'  // All clickable elements
'transition-colors'  // Smooth hover effects
'hover:bg-surface-hover'  // Hover state

// Inputs
'bg-background border border-border'
'focus:outline-none focus:ring-1 focus:ring-accent'

// Dialog backdrop
'fixed inset-0 z-50 bg-black/50'

// Dialog content
'bg-surface rounded-xl shadow-xl'
```

### Tailwind Theme Colors

| Token | Usage |
|-------|-------|
| `bg-background` | Main background |
| `bg-surface` | Card/panel background |
| `bg-surface-hover` | Hover state |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary text |
| `border-border` | Borders |
| `bg-accent` | Primary action color |
| `text-destructive` | Delete/error color |

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Domain](./DOMAIN.md) - Data models
- [Features](./FEATURES.md) - Feature specs
- [Stores](./STORES.md) - State management
