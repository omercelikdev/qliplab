/**
 * Render a Tauri accelerator string (e.g. "CommandOrControl+Shift+V") as a
 * human, platform-appropriate label ("Cmd + Shift + V" on macOS, "Ctrl + Shift
 * + V" elsewhere). Shared by Settings (where the shortcut is recorded) and the
 * onboarding hint (where the summon shortcut is taught) so they never drift.
 */
export function formatShortcut(
  shortcut: string,
  isMac: boolean = navigator.platform.includes('Mac'),
): string {
  if (!shortcut) return '';
  return shortcut
    .replace('CommandOrControl', isMac ? 'Cmd' : 'Ctrl')
    .replace('Command', 'Cmd')
    .replace('Control', isMac ? 'Control' : 'Ctrl')
    .replace('Alt', isMac ? 'Option' : 'Alt')
    .replace('Backquote', '`')
    .replace(/\+/g, ' + ');
}
