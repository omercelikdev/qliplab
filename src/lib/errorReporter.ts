import { getSystemInfo, formatSystemInfoForReport } from './systemInfo';
import { CONFIG } from './config';
import { Store } from '@tauri-apps/plugin-store';

const DUPLICATE_WINDOW_MS = 60000; // 1 minute
const recentErrors = new Map<string, number>();

// Rate limiting
const RATE_LIMITS = {
  maxIssuesPerHour: 10,
  maxIssuesPerDay: 50,
};

interface RateLimitState {
  hourlyCount: number;
  hourlyReset: number;
  dailyCount: number;
  dailyReset: number;
}

let rateLimitState: RateLimitState = {
  hourlyCount: 0,
  hourlyReset: Date.now() + 3600000,
  dailyCount: 0,
  dailyReset: Date.now() + 86400000,
};

type ErrorSeverity = 'critical' | 'error' | 'warning';

interface AutoErrorReport {
  type: 'crash' | 'unhandled_exception' | 'api_error' | 'database_error';
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context: {
    component?: string;
    action?: string;
    route?: string;
  };
  timestamp: string;
  appVersion: string;
}

function getErrorHash(error: Error): string {
  const content = `${error.message}${error.stack?.split('\n')[1] || ''}`;
  const encoded = new TextEncoder().encode(content);
  // Use a simple hash instead of truncated base64
  let hash = 0;
  for (let i = 0; i < encoded.length; i++) {
    hash = ((hash << 5) - hash + encoded[i]) | 0;
  }
  return hash.toString(36);
}

function checkRateLimit(): boolean {
  const now = Date.now();

  // Reset hourly if needed
  if (now > rateLimitState.hourlyReset) {
    rateLimitState.hourlyCount = 0;
    rateLimitState.hourlyReset = now + 3600000;
  }

  // Reset daily if needed
  if (now > rateLimitState.dailyReset) {
    rateLimitState.dailyCount = 0;
    rateLimitState.dailyReset = now + 86400000;
  }

  return (
    rateLimitState.hourlyCount < RATE_LIMITS.maxIssuesPerHour &&
    rateLimitState.dailyCount < RATE_LIMITS.maxIssuesPerDay
  );
}

function incrementRateLimit() {
  rateLimitState.hourlyCount++;
  rateLimitState.dailyCount++;
}

async function getAutoReportingEnabled(): Promise<boolean> {
  try {
    const store = await Store.load('settings.json');
    return await store.get<boolean>('autoErrorReporting') ?? false;
  } catch {
    return false;
  }
}

// Sanitize error message to remove potential user data (file paths, URLs with params, etc.)
function sanitizeMessage(msg: string): string {
  return msg
    .replace(/(?:\/[^\s:)]+\/)+([^\s:)]+)/g, '$1') // Strip absolute paths
    .replace(/https?:\/\/[^\s]+/g, '[url]') // Strip URLs
    .replace(/"[^"]{50,}"/g, '"[redacted]"') // Strip long quoted strings
    .slice(0, 200); // Truncate
}

function formatAutoReportBody(report: AutoErrorReport, systemInfoFormatted: string): string {
  return `## Auto-Reported Error

**Type:** ${report.type}
**Severity:** ${report.severity}
**Time:** ${report.timestamp}
**Error Hash:** ${report.stack || 'N/A'}

## Error
\`\`\`
${sanitizeMessage(report.message)}
\`\`\`

## Context
- **Component:** ${report.context.component || 'Unknown'}
- **Action:** ${report.context.action || 'Unknown'}
- **View:** ${report.context.route || 'Unknown'}

## System Info
${systemInfoFormatted}

---
*This issue was automatically reported by qliplab error tracking*`;
}

export async function reportError(
  error: Error,
  context?: { component?: string; action?: string; route?: string; type?: string }
): Promise<void> {
  // Skip external reporting in development
  if (import.meta.env.DEV) return;

  const errorKey = getErrorHash(error);
  const lastReported = recentErrors.get(errorKey);

  // Prevent duplicate spam
  if (lastReported && Date.now() - lastReported < DUPLICATE_WINDOW_MS) {
    // Duplicate error suppressed
    return;
  }
  recentErrors.set(errorKey, Date.now());

  // Check if user opted-in to auto error reporting
  const autoReportingEnabled = await getAutoReportingEnabled();
  if (!autoReportingEnabled) {
    // Auto error reporting disabled
    return;
  }

  // Check rate limits
  if (!checkRateLimit()) {
    // Rate limit exceeded
    return;
  }

  try {
    const systemInfo = await getSystemInfo();
    const systemInfoFormatted = formatSystemInfoForReport(systemInfo);

    const report: AutoErrorReport = {
      type: 'unhandled_exception',
      message: error.message,
      stack: getErrorHash(error), // Send hash only, never raw stack traces
      severity: 'error',
      context: {
        component: context?.component,
        action: context?.action,
        route: context?.route,
      },
      timestamp: new Date().toISOString(),
      appVersion: CONFIG.APP_VERSION,
    };

    const title = `[Auto] ${report.type}: ${report.message.slice(0, 50)}`;
    const body = formatAutoReportBody(report, systemInfoFormatted);
    const labels = ['auto-reported', 'bug', report.severity];

    // Submit via Val.town proxy
    const response = await fetch(CONFIG.ISSUE_REPORTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, labels }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      incrementRateLimit();
      // Successfully auto-reported
    } else {
      console.error('Failed to auto-report error:', result.error);
    }
  } catch (e) {
    console.error('Failed to auto-report error:', e);
  }
}
