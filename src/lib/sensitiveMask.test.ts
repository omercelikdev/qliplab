import { describe, it, expect } from 'vitest';
import { shouldMaskContent } from './sensitiveMask';

describe('shouldMaskContent', () => {
  it('masks sensitive content that is not hovered', () => {
    expect(shouldMaskContent(true, true, false)).toBe(true);
  });

  it('reveals sensitive content on hover', () => {
    expect(shouldMaskContent(true, true, true)).toBe(false);
  });

  it('never masks non-sensitive content', () => {
    expect(shouldMaskContent(false, true, false)).toBe(false);
    expect(shouldMaskContent(false, true, true)).toBe(false);
  });

  // The user can switch sensitive detection off; masking must follow that switch.
  it('never masks when sensitive detection is disabled', () => {
    expect(shouldMaskContent(true, false, false)).toBe(false);
    expect(shouldMaskContent(true, false, true)).toBe(false);
  });
});
