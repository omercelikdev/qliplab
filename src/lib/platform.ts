export function isMac(): boolean {
  return navigator.platform.toUpperCase().includes('MAC');
}

export function isWindows(): boolean {
  return navigator.platform.toUpperCase().includes('WIN');
}

export function isLinux(): boolean {
  return navigator.platform.toUpperCase().includes('LINUX');
}

export function getModifierKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

export function getAltKey(): string {
  return isMac() ? '⌥' : 'Alt';
}

export function getShortcutDisplay(shortcut: string): string {
  const mod = getModifierKey();
  const alt = getAltKey();
  return shortcut
    .replace('CommandOrControl', mod)
    .replace('Cmd', mod)
    .replace('Ctrl', mod)
    .replace('Alt', alt)
    .replace('Option', alt)
    .replace('Shift', '⇧')
    .replace(/\+/g, '');
}
