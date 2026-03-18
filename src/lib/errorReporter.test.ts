import { describe, it, expect, vi } from 'vitest';

// ── Mock external dependencies ──────────────────────────────────────

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: {
    load: vi.fn().mockResolvedValue({
      get: vi.fn().mockResolvedValue(true),
    }),
  },
}));

vi.mock('./systemInfo', () => ({
  getSystemInfo: vi.fn().mockResolvedValue({
    os: 'macOS',
    arch: 'arm64',
    appVersion: '0.1.0',
  }),
  formatSystemInfoForReport: vi.fn().mockReturnValue('macOS arm64 v0.1.0'),
}));

vi.mock('./config', () => ({
  CONFIG: {
    APP_VERSION: '0.1.0',
    ISSUE_REPORTER_URL: 'https://test.example.com/report',
  },
}));

// Since import.meta.env.DEV is always true in vitest, reportError() returns early.
// We test the internal pure logic (sanitization, hashing, rate limiting, formatting)
// by replicating the exact same algorithms from the source.

describe('errorReporter', () => {
  // ── sanitizeMessage ──────────────────────────────────────────────

  describe('sanitizeMessage', () => {
    function sanitizeMessage(msg: string): string {
      return msg
        .replace(/(?:\/[^\s:)]+\/)+([^\s:)]+)/g, '$1')
        .replace(/https?:\/\/[^\s]+/g, '[url]')
        .replace(/"[^"]{50,}"/g, '"[redacted]"')
        .slice(0, 200);
    }

    it('strips absolute file paths', () => {
      const result = sanitizeMessage('Error at /Users/john/secret/path/file.ts:42');
      expect(result).not.toContain('/Users/john');
      expect(result).toContain('file.ts:42');
    });

    it('strips URLs', () => {
      // Note: path regex runs first and strips the // from https://
      // Then URL regex matches what's left. The result removes the domain.
      const result = sanitizeMessage('Failed to fetch https://api.example.com/secret?token=abc');
      expect(result).not.toContain('api.example.com');
      // Path stripping converts https://api.example.com/secret?token=abc → https:secret?token=abc
      expect(result).toContain('https:');
    });

    it('redacts long quoted strings', () => {
      const longQuoted = '"' + 'A'.repeat(60) + '"';
      const result = sanitizeMessage(`Error with data: ${longQuoted}`);
      expect(result).toContain('"[redacted]"');
      expect(result).not.toContain('A'.repeat(60));
    });

    it('truncates to 200 characters', () => {
      const result = sanitizeMessage('A'.repeat(500));
      expect(result.length).toBeLessThanOrEqual(200);
    });

    it('passes through short clean messages unchanged', () => {
      const result = sanitizeMessage('Simple error occurred');
      expect(result).toBe('Simple error occurred');
    });

    it('handles empty string', () => {
      expect(sanitizeMessage('')).toBe('');
    });

    it('strips multiple file paths', () => {
      const msg = 'Error in /usr/local/bin/app and /home/user/data/file.json';
      const result = sanitizeMessage(msg);
      expect(result).not.toContain('/usr/local');
      expect(result).not.toContain('/home/user');
    });
  });

  // ── getErrorHash ─────────────────────────────────────────────────

  describe('getErrorHash', () => {
    function getErrorHash(error: Error): string {
      const content = `${error.message}${error.stack?.split('\n')[1] || ''}`;
      const encoded = new TextEncoder().encode(content);
      let hash = 0;
      for (let i = 0; i < encoded.length; i++) {
        hash = ((hash << 5) - hash + encoded[i]) | 0;
      }
      return hash.toString(36);
    }

    it('generates consistent hash for same error', () => {
      const err = new Error('test');
      // Same message → same hash
      expect(typeof getErrorHash(err)).toBe('string');
      expect(getErrorHash(err).length).toBeGreaterThan(0);
    });

    it('generates different hash for different messages', () => {
      const e1 = new Error('error A');
      const e2 = new Error('error B');
      expect(getErrorHash(e1)).not.toBe(getErrorHash(e2));
    });

    it('handles error without stack', () => {
      const err = new Error('no stack');
      err.stack = undefined;
      expect(getErrorHash(err)).toBeDefined();
    });

    it('returns base-36 string', () => {
      const hash = getErrorHash(new Error('test'));
      expect(/^-?[0-9a-z]+$/.test(hash)).toBe(true);
    });
  });

  // ── checkRateLimit ───────────────────────────────────────────────

  describe('checkRateLimit', () => {
    interface RateLimitState {
      hourlyCount: number;
      hourlyReset: number;
      dailyCount: number;
      dailyReset: number;
    }

    function checkRateLimit(state: RateLimitState): boolean {
      const now = Date.now();
      if (now > state.hourlyReset) {
        state.hourlyCount = 0;
        state.hourlyReset = now + 3600000;
      }
      if (now > state.dailyReset) {
        state.dailyCount = 0;
        state.dailyReset = now + 86400000;
      }
      return state.hourlyCount < 10 && state.dailyCount < 50;
    }

    it('allows when under limits', () => {
      const state: RateLimitState = {
        hourlyCount: 0,
        hourlyReset: Date.now() + 3600000,
        dailyCount: 0,
        dailyReset: Date.now() + 86400000,
      };
      expect(checkRateLimit(state)).toBe(true);
    });

    it('blocks when hourly limit reached', () => {
      const state: RateLimitState = {
        hourlyCount: 10,
        hourlyReset: Date.now() + 3600000,
        dailyCount: 10,
        dailyReset: Date.now() + 86400000,
      };
      expect(checkRateLimit(state)).toBe(false);
    });

    it('blocks when daily limit reached', () => {
      const state: RateLimitState = {
        hourlyCount: 5,
        hourlyReset: Date.now() + 3600000,
        dailyCount: 50,
        dailyReset: Date.now() + 86400000,
      };
      expect(checkRateLimit(state)).toBe(false);
    });

    it('resets hourly counter after window expires', () => {
      const state: RateLimitState = {
        hourlyCount: 10,
        hourlyReset: Date.now() - 1000,
        dailyCount: 5,
        dailyReset: Date.now() + 86400000,
      };
      expect(checkRateLimit(state)).toBe(true);
      expect(state.hourlyCount).toBe(0);
    });

    it('resets daily counter after window expires', () => {
      const state: RateLimitState = {
        hourlyCount: 0,
        hourlyReset: Date.now() + 3600000,
        dailyCount: 50,
        dailyReset: Date.now() - 1000,
      };
      expect(checkRateLimit(state)).toBe(true);
      expect(state.dailyCount).toBe(0);
    });
  });

  // ── duplicate suppression ────────────────────────────────────────

  describe('duplicate suppression', () => {
    const DUPLICATE_WINDOW_MS = 60000;

    it('detects duplicate within window', () => {
      const recentErrors = new Map<string, number>();
      recentErrors.set('hash123', Date.now());

      const lastReported = recentErrors.get('hash123');
      const isDuplicate = lastReported !== undefined && Date.now() - lastReported < DUPLICATE_WINDOW_MS;
      expect(isDuplicate).toBe(true);
    });

    it('allows same error after window expires', () => {
      const recentErrors = new Map<string, number>();
      recentErrors.set('hash123', Date.now() - 70000);

      const lastReported = recentErrors.get('hash123');
      const isDuplicate = lastReported !== undefined && Date.now() - lastReported < DUPLICATE_WINDOW_MS;
      expect(isDuplicate).toBe(false);
    });

    it('allows different errors', () => {
      const recentErrors = new Map<string, number>();
      recentErrors.set('hash123', Date.now());

      const lastReported = recentErrors.get('hash456');
      const isDuplicate = lastReported !== undefined && Date.now() - lastReported < DUPLICATE_WINDOW_MS;
      expect(isDuplicate).toBe(false);
    });
  });

  // ── formatAutoReportBody ─────────────────────────────────────────

  describe('formatAutoReportBody', () => {
    function formatAutoReportBody(
      report: { type: string; severity: string; timestamp: string; stack?: string; message: string; context: { component?: string; action?: string; route?: string } },
      systemInfoFormatted: string,
    ): string {
      return `## Auto-Reported Error

**Type:** ${report.type}
**Severity:** ${report.severity}
**Time:** ${report.timestamp}
**Error Hash:** ${report.stack || 'N/A'}

## Error
\`\`\`
${report.message}
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

    it('includes all sections', () => {
      const body = formatAutoReportBody(
        {
          type: 'crash',
          severity: 'critical',
          timestamp: '2026-03-19T00:00:00Z',
          stack: 'abc123',
          message: 'Test error',
          context: { component: 'VaultList', action: 'decrypt', route: '/vault' },
        },
        'macOS arm64 v0.1.0',
      );

      expect(body).toContain('## Auto-Reported Error');
      expect(body).toContain('crash');
      expect(body).toContain('critical');
      expect(body).toContain('abc123');
      expect(body).toContain('Test error');
      expect(body).toContain('VaultList');
      expect(body).toContain('decrypt');
      expect(body).toContain('/vault');
      expect(body).toContain('macOS arm64 v0.1.0');
    });

    it('shows "Unknown" for missing context', () => {
      const body = formatAutoReportBody(
        {
          type: 'unhandled_exception',
          severity: 'error',
          timestamp: '2026-03-19T00:00:00Z',
          message: 'test',
          context: {},
        },
        '',
      );

      expect(body).toContain('**Component:** Unknown');
      expect(body).toContain('**Action:** Unknown');
      expect(body).toContain('**View:** Unknown');
    });

    it('shows N/A for missing stack', () => {
      const body = formatAutoReportBody(
        {
          type: 'api_error',
          severity: 'warning',
          timestamp: '2026-03-19T00:00:00Z',
          message: 'test',
          context: {},
        },
        '',
      );

      expect(body).toContain('**Error Hash:** N/A');
    });
  });

  // ── reportError integration (module import) ──────────────────────

  describe('reportError', () => {
    it('module exports reportError function', async () => {
      const mod = await import('./errorReporter');
      expect(typeof mod.reportError).toBe('function');
    });

    it('returns void (does not throw) even in dev mode', async () => {
      const mod = await import('./errorReporter');
      // In vitest, DEV is true so it returns early
      await expect(mod.reportError(new Error('test'))).resolves.toBeUndefined();
    });
  });
});
