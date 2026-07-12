import { describe, it, expect } from 'vitest';
import { getSmartActions } from './smartActions';

describe('getSmartActions', () => {
  it('offers Open on an http URL', () => {
    expect(getSmartActions('https://example.com/x', 'url')).toEqual([
      { kind: 'openUrl', href: 'https://example.com/x' },
    ]);
  });
  it('adds a scheme to a scheme-less URL the detector flagged', () => {
    expect(getSmartActions('www.example.com', 'url')).toEqual([
      { kind: 'openUrl', href: 'https://www.example.com' },
    ]);
  });
  it('offers Email on a bare address', () => {
    expect(getSmartActions('me@example.com', 'plain')).toEqual([
      { kind: 'email', href: 'mailto:me@example.com' },
    ]);
  });
  it('offers Call on a phone number, normalising to tel:', () => {
    expect(getSmartActions('+1 (555) 123-4567', 'plain')).toEqual([
      { kind: 'call', href: 'tel:+15551234567' },
    ]);
  });
  it('offers Map on coordinates within range', () => {
    expect(getSmartActions('41.0082, 28.9784', 'plain')).toEqual([
      { kind: 'map', href: 'https://www.google.com/maps/search/?api=1&query=41.0082,28.9784' },
    ]);
  });
  it('rejects out-of-range coordinates', () => {
    expect(getSmartActions('200.0, 999.0', 'plain')).toEqual([]);
  });
  it('does not treat a long integer as a phone number when digits exceed 15', () => {
    expect(getSmartActions('12345678901234567890', 'plain')).toEqual([]);
  });
  it('ignores plain prose', () => {
    expect(getSmartActions('just some copied text', 'plain')).toEqual([]);
  });
  it('ignores a multi-line block for email/phone but keeps a URL', () => {
    expect(getSmartActions('line1\nme@example.com', 'plain')).toEqual([]);
    expect(getSmartActions('https://x.com\nmore', 'url')).toEqual([
      { kind: 'openUrl', href: 'https://x.com\nmore'.trim() },
    ]);
  });
  it('returns nothing for empty content', () => {
    expect(getSmartActions('   ', 'plain')).toEqual([]);
  });
});
