import { readText } from '@tauri-apps/plugin-clipboard-manager';

// Supported snippet variables:
// {date}       → 2026-02-16
// {time}       → 14:30:45
// {datetime}   → 2026-02-16 14:30:45
// {timestamp}  → 1739712645000
// {clipboard}  → current clipboard content
// {uuid}       → random UUID

const VARIABLE_PATTERN = /\{(date|time|datetime|timestamp|clipboard|uuid)\}/gi;

export function hasVariables(content: string): boolean {
  return VARIABLE_PATTERN.test(content);
}

export async function expandVariables(content: string): Promise<string> {
  const now = new Date();
  let clipboardContent: string | null = null;

  // Pre-fetch clipboard if needed
  if (/\{clipboard\}/i.test(content)) {
    try {
      clipboardContent = await readText();
    } catch {
      clipboardContent = '';
    }
  }

  return content.replace(VARIABLE_PATTERN, (_, name: string) => {
    switch (name.toLowerCase()) {
      case 'date':
        return now.toISOString().split('T')[0];
      case 'time':
        return now.toTimeString().split(' ')[0];
      case 'datetime':
        return `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
      case 'timestamp':
        return String(now.getTime());
      case 'clipboard':
        return clipboardContent ?? '';
      case 'uuid':
        return crypto.randomUUID();
      default:
        return `{${name}}`;
    }
  });
}

// List of available variables for UI hints
export const AVAILABLE_VARIABLES = [
  { name: '{date}', description: 'Current date (YYYY-MM-DD)' },
  { name: '{time}', description: 'Current time (HH:MM:SS)' },
  { name: '{datetime}', description: 'Date and time' },
  { name: '{timestamp}', description: 'Unix timestamp (ms)' },
  { name: '{clipboard}', description: 'Current clipboard content' },
  { name: '{uuid}', description: 'Random UUID' },
];
