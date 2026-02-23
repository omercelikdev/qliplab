import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';
import { getSystemInfo, formatSystemInfoForReport } from '@/lib/systemInfo';
import { CONFIG } from '@/lib/config';

export type IssueType = 'bug' | 'feature' | 'question' | 'other';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface IssueData {
  type: IssueType;
  title: string;
  description: string;
  steps?: string;
  priority: Priority;
  includeSystemInfo: boolean;
}

interface FeedbackState {
  isSubmitting: boolean;
  autoErrorReporting: boolean;
  hasSeenOptIn: boolean;

  loadSettings: () => Promise<void>;
  setAutoErrorReporting: (enabled: boolean) => Promise<void>;
  setHasSeenOptIn: (seen: boolean) => Promise<void>;
  submitIssue: (data: IssueData) => Promise<{ success: boolean; url?: string; error?: string }>;
}

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

const TYPE_PREFIXES: Record<IssueType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  question: 'Question',
  other: 'Feedback',
};

function formatIssueBody(data: IssueData, systemInfoFormatted?: string): string {
  let body = `## Description
${data.description}
`;

  if (data.type === 'bug' && data.steps) {
    body += `
## Steps to Reproduce
${data.steps}
`;
  }

  body += `
## Priority
${data.priority.charAt(0).toUpperCase() + data.priority.slice(1)}
`;

  if (systemInfoFormatted) {
    body += `
## System Info
${systemInfoFormatted}
`;
  }

  body += `
---
*Reported via qliplab app*`;

  return body;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  isSubmitting: false,
  autoErrorReporting: false,
  hasSeenOptIn: false,

  loadSettings: async () => {
    try {
      const store = await Store.load('settings.json');
      const autoReporting = await store.get<boolean>('autoErrorReporting');
      const seenOptIn = await store.get<boolean>('hasSeenOptIn');

      set({
        autoErrorReporting: autoReporting ?? false,
        hasSeenOptIn: seenOptIn ?? false,
      });
    } catch {
      // Load failed
    }
  },

  setAutoErrorReporting: async (enabled: boolean) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('autoErrorReporting', enabled);
      await store.save();
      set({ autoErrorReporting: enabled });
    } catch {
      // Save failed
    }
  },

  setHasSeenOptIn: async (seen: boolean) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('hasSeenOptIn', seen);
      await store.save();
      set({ hasSeenOptIn: seen });
    } catch {
      // Save failed
    }
  },

  submitIssue: async (data: IssueData) => {
    // Skip external reporting in development
    if (import.meta.env.DEV) {
      return { success: false, error: 'Issue reporting is disabled in development mode' };
    }

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    } finally {
      set({ isSubmitting: false });
    }
  },
}));
