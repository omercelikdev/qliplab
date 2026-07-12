import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SelectMenu, typeaheadIndex, type SelectOption } from './SelectMenu';

const OPTS: SelectOption[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
  { value: 'd', label: 'Apricot' },
];

afterEach(cleanup);

describe('typeaheadIndex', () => {
  it('finds the next label starting with the buffer, after `from`', () => {
    expect(typeaheadIndex(OPTS, 'b', 0)).toBe(1);
  });
  it('wraps around past the end', () => {
    expect(typeaheadIndex(OPTS, 'a', 3)).toBe(0); // from Apricot(3) → Apple(0)
  });
  it('advances through multiple matches on repeat search from current', () => {
    // starting at Apple(0), "a" should jump to the next a-word: Apricot(3)
    expect(typeaheadIndex(OPTS, 'a', 0)).toBe(3);
  });
  it('stays on the current item if only it matches', () => {
    expect(typeaheadIndex(OPTS, 'c', 2)).toBe(2);
  });
  it('returns -1 when nothing matches', () => {
    expect(typeaheadIndex(OPTS, 'z', 0)).toBe(-1);
  });
  it('returns -1 for an empty buffer', () => {
    expect(typeaheadIndex(OPTS, '', 0)).toBe(-1);
  });
});

describe('SelectMenu keyboard navigation', () => {
  function open(onChange = vi.fn()) {
    render(<SelectMenu value="a" options={OPTS} onChange={onChange} ariaLabel="Fruit" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fruit' }));
    return onChange;
  }

  it('opens and highlights the current value', () => {
    open();
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-activedescendant', 'selectmenu-opt-a');
  });

  it('ArrowDown then Enter selects the next option', () => {
    const onChange = open();
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('End jumps to the last option', () => {
    const onChange = open();
    fireEvent.keyDown(document, { key: 'End' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('d');
  });

  it('type-ahead jumps to a matching label', () => {
    const onChange = open();
    fireEvent.keyDown(document, { key: 'c' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('ArrowUp is clamped at the top', () => {
    const onChange = open();
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('a');
  });
});
