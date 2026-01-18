# FEATURE: GitHub Issue Reporter + Automatic Error Reporting

> **Add to:** Settings screen or as standalone feature
> **Purpose:** Allow users to report bugs/request features AND automatically capture crashes/errors

---

## PART 1: AUTOMATIC ERROR REPORTING (Silent)

This captures errors automatically WITHOUT user interaction.

### Error Types to Capture

```typescript
type ErrorSeverity = 'critical' | 'error' | 'warning';

interface AutoErrorReport {
  type: 'crash' | 'unhandled_exception' | 'api_error' | 'database_error';
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context: {
    component?: string;      // React component name
    action?: string;         // What user was doing
    route?: string;          // Current tab/view
  };
  systemInfo: SystemInfo;
  timestamp: string;
  appVersion: string;
}
```

### Implementation

**src/lib/errorReporter.ts:**
```typescript
import { getSystemInfo } from './systemInfo';

const ERROR_ENDPOINT = 'https://api.github.com/repos/{owner}/{repo}/issues';
const DUPLICATE_WINDOW_MS = 60000; // Don't report same error within 1 minute
const recentErrors = new Map<string, number>();

export async function reportError(error: Error, context?: Record<string, any>) {
  const errorKey = `${error.message}-${error.stack?.slice(0, 100)}`;
  const lastReported = recentErrors.get(errorKey);
  
  // Prevent duplicate spam
  if (lastReported && Date.now() - lastReported < DUPLICATE_WINDOW_MS) {
    console.log('Duplicate error suppressed');
    return;
  }
  recentErrors.set(errorKey, Date.now());
  
  // Check if user opted-in to auto error reporting
  const settings = await getSettings();
  if (!settings.autoErrorReporting) return;
  
  const systemInfo = await getSystemInfo();
  const report: AutoErrorReport = {
    type: 'unhandled_exception',
    message: error.message,
    stack: error.stack,
    severity: 'error',
    context: context || {},
    systemInfo,
    timestamp: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
  
  await submitAutoReport(report);
}

async function submitAutoReport(report: AutoErrorReport) {
  const token = await getGithubToken();
  if (!token) return; // Silently fail if no token
  
  const body = formatAutoReportBody(report);
  const title = `[Auto] ${report.type}: ${report.message.slice(0, 50)}`;
  
  // Check if similar issue exists (optional - requires search API)
  const existingIssue = await findSimilarIssue(title);
  if (existingIssue) {
    // Add comment to existing issue instead
    await addCommentToIssue(existingIssue.number, `Another occurrence:\n${body}`);
    return;
  }
  
  await fetch(ERROR_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      labels: ['auto-reported', 'bug', report.severity],
    }),
  });
}

function formatAutoReportBody(report: AutoErrorReport): string {
  return `## Auto-Reported Error

**Type:** ${report.type}
**Severity:** ${report.severity}
**Time:** ${report.timestamp}

## Error
\`\`\`
${report.message}
\`\`\`

## Stack Trace
\`\`\`
${report.stack || 'No stack trace'}
\`\`\`

## Context
- **Component:** ${report.context.component || 'Unknown'}
- **Action:** ${report.context.action || 'Unknown'}
- **View:** ${report.context.route || 'Unknown'}

## System Info
- **OS:** ${report.systemInfo.os}
- **App Version:** ${report.systemInfo.appVersion}
- **Arch:** ${report.systemInfo.arch}

---
*This issue was automatically reported by qliplab error tracking*`;
}
```

### Global Error Handlers

**src/main.tsx:**
```typescript
import { reportError } from './lib/errorReporter';

// Catch unhandled errors
window.onerror = (message, source, lineno, colno, error) => {
  reportError(error || new Error(String(message)), {
    source, lineno, colno
  });
};

// Catch unhandled promise rejections
window.onunhandledrejection = (event) => {
  reportError(
    event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
    { type: 'unhandled_promise' }
  );
};
```

### React Error Boundary

**src/components/ErrorBoundary.tsx:**
```typescript
import { Component, ReactNode } from 'react';
import { reportError } from '@/lib/errorReporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportError(error, {
      component: errorInfo.componentStack,
      type: 'react_error_boundary'
    });
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <p className="text-destructive">Something went wrong</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-sm text-accent"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Wrap App

**src/App.tsx:**
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* ... rest of app */}
    </ErrorBoundary>
  );
}
```

### Settings Toggle

Add to Settings:
```typescript
// In SettingsDialog.tsx
<ToggleSetting 
  label="Auto Error Reporting" 
  description="Automatically send crash reports to help improve the app"
  checked={settings.autoErrorReporting} 
  onChange={v => updateSetting('autoErrorReporting', v)} 
/>
```

### Duplicate Prevention Strategy

```typescript
// Option 1: Hash-based deduplication
function getErrorHash(error: Error): string {
  const content = `${error.message}${error.stack?.split('\n')[1] || ''}`;
  return btoa(content).slice(0, 20);
}

// Option 2: Search existing issues before creating
async function findSimilarIssue(title: string): Promise<Issue | null> {
  const searchQuery = encodeURIComponent(`repo:owner/repo is:issue "${title.slice(0, 30)}"`);
  const response = await fetch(`https://api.github.com/search/issues?q=${searchQuery}`);
  const data = await response.json();
  return data.items?.[0] || null;
}
```

---

## PART 2: MANUAL REPORTING (User-initiated)

---

## PROMPT

```
Add a GitHub Issue Reporter feature to qliplab. This allows users to report bugs or request features directly from the app.

## REQUIREMENTS

### 1. UI Location
Add "Report Issue" or "Send Feedback" button in Settings dialog, at the bottom section.

### 2. Issue Reporter Dialog

Create a modal dialog with these fields:

**Issue Type (required)** - Radio buttons or segmented control:
- 🐛 Bug Report
- ✨ Feature Request  
- 💬 Question
- 📝 Other

**Title (required)** - Single line input
- Placeholder: "Brief description of the issue"
- Max 100 characters

**Description (required)** - Textarea
- Placeholder changes based on type:
  - Bug: "What happened? What did you expect?"
  - Feature: "Describe the feature you'd like"
  - Question: "What would you like to know?"
- Min 20 characters

**Steps to Reproduce (only for Bug)** - Textarea
- Placeholder: "1. Go to...\n2. Click on...\n3. See error"
- Optional but encouraged

**Priority (optional)** - Dropdown:
- Low
- Medium (default)
- High
- Critical (only for bugs)

**Include System Info** - Checkbox (default: checked)
- Auto-collects: OS, app version, theme, etc.

**Attach Screenshot** - Button (optional)
- Opens file picker for image
- Shows preview if attached
- Can remove

### 3. System Info Collection

Auto-collect (when checkbox enabled):
```typescript
interface SystemInfo {
  appVersion: string;      // from package.json
  os: string;              // macOS 14.2 / Windows 11 / Ubuntu 22.04
  arch: string;            // x64 / arm64
  theme: string;           // light / dark
  locale: string;          // en-US
  historyCount: number;    // current items in history
  snippetCount: number;    // current snippets
}
```

### 4. GitHub Integration

**Configuration** (in Settings or .env):
```typescript
const GITHUB_CONFIG = {
  owner: 'YOUR_GITHUB_USERNAME',
  repo: 'qliplab',
  // Token should be stored securely - use Tauri's secure storage
};
```

**API Call:**
```typescript
// POST https://api.github.com/repos/{owner}/{repo}/issues
{
  title: "[Bug] User reported title",
  body: `## Description
${description}

## Steps to Reproduce
${steps}

## System Info
- **OS:** ${systemInfo.os}
- **App Version:** ${systemInfo.appVersion}
- **Theme:** ${systemInfo.theme}

## Priority
${priority}

---
*Reported via qliplab app*`,
  labels: ["bug", "user-reported"]  // or ["enhancement"] for features
}
```

### 5. Token Handling Options

**Option A: User provides their own token (Recommended for private repos)**
- Settings field for GitHub Personal Access Token
- Token stored in Tauri secure store (encrypted)
- User creates token with `repo` scope

**Option B: App-embedded token (Less secure)**
- Token in environment variable at build time
- Works but token exposed in binary

**Option C: Backend proxy (Most secure)**
- Your own server handles GitHub API
- App sends to your endpoint
- Server adds token and forwards to GitHub

### 6. Store Implementation

**src/stores/feedbackStore.ts:**
```typescript
import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';

type IssueType = 'bug' | 'feature' | 'question' | 'other';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface FeedbackState {
  githubToken: string | null;
  isSubmitting: boolean;
  
  loadToken: () => Promise<void>;
  saveToken: (token: string) => Promise<void>;
  submitIssue: (data: IssueData) => Promise<{ success: boolean; url?: string; error?: string }>;
}

interface IssueData {
  type: IssueType;
  title: string;
  description: string;
  steps?: string;
  priority: Priority;
  includeSystemInfo: boolean;
  screenshot?: string; // base64
}
```

### 7. UI Components

**src/components/feedback/ReportIssueButton.tsx:**
```typescript
// In Settings dialog:
<button onClick={() => setIsReportOpen(true)}>
  <MessageSquare className="w-4 h-4" />
  Report Issue / Send Feedback
</button>
```

**src/components/feedback/ReportIssueDialog.tsx:**
- Full dialog with all fields
- Form validation
- Submit button with loading state
- Success message with link to created issue
- Error handling

### 8. Labels Mapping

```typescript
const TYPE_LABELS: Record<IssueType, string[]> = {
  bug: ['bug', 'user-reported'],
  feature: ['enhancement', 'user-reported'],
  question: ['question', 'user-reported'],
  other: ['user-reported'],
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'priority: low',
  medium: 'priority: medium',
  high: 'priority: high',
  critical: 'priority: critical',
};
```

### 9. Validation

- Title: 5-100 chars, required
- Description: 20-2000 chars, required
- Steps: 0-1000 chars, optional
- Token: Valid GitHub PAT format

### 10. Success Flow

1. User fills form
2. Click "Submit"
3. Show loading spinner
4. On success:
   - Show success message
   - Show link to GitHub issue
   - Option to "Open in Browser"
   - Close dialog
5. On error:
   - Show error message
   - Keep form open
   - Allow retry

### 11. UI Mockup

```
┌─────────────────────────────────────────────────┐
│ Report Issue                               [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Issue Type                                     │
│  ┌─────┐ ┌─────────┐ ┌─────────┐ ┌───────┐    │
│  │ 🐛  │ │ ✨      │ │ 💬      │ │ 📝    │    │
│  │ Bug │ │ Feature │ │ Question│ │ Other │    │
│  └─────┘ └─────────┘ └─────────┘ └───────┘    │
│                                                 │
│  Title *                                        │
│  ┌─────────────────────────────────────────┐   │
│  │ Brief description...                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Description *                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ What happened?                           │   │
│  │                                          │   │
│  │                                          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Steps to Reproduce                             │
│  ┌─────────────────────────────────────────┐   │
│  │ 1. Go to...                              │   │
│  │ 2. Click...                              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Priority                                       │
│  ┌──────────────────────────────────┐ [▼]     │
│  │ Medium                            │         │
│  └──────────────────────────────────┘         │
│                                                 │
│  [✓] Include system information                │
│  [ ] Attach screenshot  [Choose File]          │
│                                                 │
├─────────────────────────────────────────────────┤
│                              [Cancel] [Submit]  │
└─────────────────────────────────────────────────┘
```

## OUTPUT CHECK

- ✅ "Report Issue" button in Settings
- ✅ Dialog with all fields
- ✅ Issue type selection
- ✅ Form validation
- ✅ System info auto-collection
- ✅ GitHub API integration
- ✅ Success/error messages
- ✅ Token stored securely

## GITHUB TOKEN SETUP (for user)

User needs to:
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Generate new token (classic)
3. Select scope: `repo` (for private repos)
4. Copy token to app Settings

## TEST

1. Open Settings
2. Click "Report Issue"
3. Fill form with test data
4. Submit
5. Check GitHub repo for new issue
```

---

## ADDITIONAL: First-time Token Setup Flow

```
If no token configured:

┌─────────────────────────────────────────────────┐
│ GitHub Token Required                      [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  To report issues, you need a GitHub token.    │
│                                                 │
│  1. Go to GitHub Settings                       │
│  2. Developer Settings → Personal Access Tokens │
│  3. Generate new token with 'repo' scope       │
│  4. Paste it below                             │
│                                                 │
│  GitHub Token                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [?] How to create a token                      │
│                                                 │
│  [✓] Remember this token                       │
│                                                 │
├─────────────────────────────────────────────────┤
│                              [Cancel] [Save]    │
└─────────────────────────────────────────────────┘
```

---

## SUMMARY: Auto vs Manual Reporting

| Feature | Auto Reporting | Manual Reporting |
|---------|---------------|------------------|
| **Trigger** | Crash/Error occurs | User clicks button |
| **User action** | None (silent) | Fills form |
| **User consent** | Opt-in in Settings | Per submission |
| **Error types** | Crashes, exceptions, API errors | Bugs, features, questions |
| **Labels** | `auto-reported`, `bug` | `user-reported`, type-based |
| **Duplicates** | Auto-deduplicated | User's responsibility |
| **System info** | Always included | Optional checkbox |
| **Screenshot** | No | Optional |

---

## SETTINGS UI for Both Features

```
Settings
├── Appearance
│   └── Theme: [Light] [Dark] [System]
├── History
│   └── Limit: [100 items ▼]
├── Privacy & Reporting          ← NEW SECTION
│   ├── [✓] Auto Error Reporting
│   │     └── "Automatically send crash reports"
│   ├── [✓] Include system info in reports
│   │     └── "OS, app version, theme"
│   └── GitHub Token: [••••••••] [Edit]
└── ───────────────
    📝 Report Issue / Send Feedback
```

---

## WHAT GETS AUTO-REPORTED

### ✅ Will Auto-Report (if enabled):
- React component crashes
- Unhandled JavaScript exceptions
- Unhandled Promise rejections
- Database connection failures
- API/Network errors
- Encryption/decryption failures

### ❌ Won't Auto-Report:
- User-caused validation errors
- Expected errors (wrong password, etc.)
- Console warnings
- Performance issues

### Example Code for Selective Reporting:

```typescript
// Only report unexpected errors
try {
  await vault.decrypt(data, password);
} catch (error) {
  if (error.message === 'Incorrect password') {
    // Expected - don't report
    showError('Wrong password');
  } else {
    // Unexpected - report it
    reportError(error, { action: 'vault_decrypt' });
    showError('Something went wrong');
  }
}
```

---

## PRIVACY CONSIDERATIONS

Add to Settings or first-run:

```
┌─────────────────────────────────────────────────┐
│ Help Improve qliplab                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  Would you like to automatically send crash    │
│  reports to help us fix bugs?                  │
│                                                 │
│  What we collect:                              │
│  ✓ Error messages and stack traces             │
│  ✓ App version and OS                          │
│  ✓ Which feature was being used                │
│                                                 │
│  What we DON'T collect:                        │
│  ✗ Your clipboard content                      │
│  ✗ Your snippets or vault data                 │
│  ✗ Personal information                        │
│                                                 │
│  You can change this anytime in Settings.      │
│                                                 │
│         [No Thanks]  [Enable Reporting]         │
└─────────────────────────────────────────────────┘
```

---

## RATE LIMITING

Prevent GitHub API abuse:

```typescript
const RATE_LIMITS = {
  maxIssuesPerHour: 10,
  maxIssuesPerDay: 50,
  duplicateWindowMs: 60000,  // 1 minute
};

// Track in localStorage or store
interface RateLimitState {
  hourlyCount: number;
  hourlyReset: number;
  dailyCount: number;
  dailyReset: number;
}
```
