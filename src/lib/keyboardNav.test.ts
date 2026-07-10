import { describe, it, expect } from 'vitest';
import { blocksListNavigation, type NavigationTarget } from './keyboardNav';

const target = (over: Partial<NavigationTarget>): NavigationTarget => ({
  tagName: 'DIV',
  isContentEditable: false,
  isSearchInput: false,
  ...over,
});

describe('blocksListNavigation', () => {
  it('lets navigation through on ordinary elements', () => {
    expect(blocksListNavigation(target({}))).toBe(false);
  });

  it('keeps navigation keys inside ordinary inputs', () => {
    expect(blocksListNavigation(target({ tagName: 'INPUT' }))).toBe(true);
    expect(blocksListNavigation(target({ tagName: 'TEXTAREA' }))).toBe(true);
    expect(blocksListNavigation(target({ isContentEditable: true }))).toBe(true);
  });

  // The search box stays focused so the user can type immediately; arrows and
  // Enter still have to drive the list.
  it('never blocks navigation from the search box', () => {
    expect(blocksListNavigation(target({ tagName: 'INPUT', isSearchInput: true }))).toBe(false);
  });

  it('treats the search box flag as decisive even for contenteditable', () => {
    expect(
      blocksListNavigation(target({ isContentEditable: true, isSearchInput: true }))
    ).toBe(false);
  });
});
