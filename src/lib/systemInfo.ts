import { useHistoryStore } from '@/stores/historyStore';
import { useSnippetStore } from '@/stores/snippetStore';
import { useSettingsStore } from '@/stores/settingsStore';

export interface SystemInfo {
  appVersion: string;
  os: string;
  arch: string;
  theme: string;
  locale: string;
  historyCount: number;
  snippetCount: number;
}

function detectOS(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) return 'macOS';
  if (userAgent.includes('win')) return 'Windows';
  if (userAgent.includes('linux')) return 'Linux';
  return navigator.platform || 'unknown';
}

function detectArch(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('arm64') || userAgent.includes('aarch64')) return 'arm64';
  if (userAgent.includes('x86_64') || userAgent.includes('x64') || userAgent.includes('amd64')) return 'x64';
  return 'unknown';
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const historyCount = useHistoryStore.getState().items.length;
  const snippetCount = useSnippetStore.getState().snippets.length;
  const theme = useSettingsStore.getState().settings.theme;

  return {
    appVersion: '0.1.0',
    os: detectOS(),
    arch: detectArch(),
    theme,
    locale: navigator.language || 'unknown',
    historyCount,
    snippetCount,
  };
}

export function formatSystemInfoForReport(info: SystemInfo): string {
  return `- **OS:** ${info.os}
- **Arch:** ${info.arch}
- **App Version:** ${info.appVersion}
- **Theme:** ${info.theme}
- **Locale:** ${info.locale}
- **History Items:** ${info.historyCount}
- **Snippets:** ${info.snippetCount}`;
}
