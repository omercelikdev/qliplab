/**
 * The search field stays focused so the user can just start typing. Arrow keys
 * and Enter must therefore still reach the list instead of the input — but any
 * *other* text field (snippet editor, vault form) must keep them.
 */

export interface NavigationTarget {
  tagName: string;
  isContentEditable: boolean;
  /** True for the history search box, which never consumes navigation keys. */
  isSearchInput: boolean;
}

/** Whether a keypress on this element belongs to the element, not the list. */
export function blocksListNavigation(target: NavigationTarget): boolean {
  if (target.isSearchInput) return false;
  if (target.isContentEditable) return true;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
}

/** Read a DOM event target into the shape above. */
export function toNavigationTarget(el: HTMLElement): NavigationTarget {
  return {
    tagName: el.tagName,
    isContentEditable: el.isContentEditable,
    isSearchInput: el.hasAttribute('data-search-input'),
  };
}
