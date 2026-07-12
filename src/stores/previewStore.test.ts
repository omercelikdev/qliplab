import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/window', () => ({
  expandWindowForPreview: vi.fn(),
  shrinkWindowFromPreview: vi.fn(),
}));

import { usePreviewStore } from './previewStore';
import type { ClipboardItem } from '@/types/clipboard';

const clip = (content: string): ClipboardItem => ({
  id: 'c1',
  content,
  contentType: 'text',
  detectedFormat: 'plain',
  isPinned: false,
  isSensitive: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe('previewStore — edit save / discard', () => {
  beforeEach(() => {
    usePreviewStore.getState().close();
  });

  it('a freshly opened view is not dirty', () => {
    usePreviewStore.getState().openView(clip('hello'));
    expect(usePreviewStore.getState().isViewDirty()).toBe(false);
  });

  it('editing the content marks it dirty', () => {
    usePreviewStore.getState().openView(clip('hello'));
    usePreviewStore.getState().setEditedContent('hello world');
    expect(usePreviewStore.getState().isViewDirty()).toBe(true);
  });

  it('requestClose on a dirty view asks to confirm instead of closing', () => {
    usePreviewStore.getState().openView(clip('hello'));
    usePreviewStore.getState().setEditedContent('changed');
    usePreviewStore.getState().requestClose();
    expect(usePreviewStore.getState().pendingClose).toBe(true);
    expect(usePreviewStore.getState().isOpen).toBe(true);
  });

  it('requestClose on a clean view closes immediately', () => {
    usePreviewStore.getState().openView(clip('hello'));
    usePreviewStore.getState().requestClose();
    expect(usePreviewStore.getState().isOpen).toBe(false);
    expect(usePreviewStore.getState().pendingClose).toBe(false);
  });

  it('markSaved clears the dirty state', () => {
    usePreviewStore.getState().openView(clip('hello'));
    usePreviewStore.getState().setEditedContent('saved text');
    usePreviewStore.getState().markSaved('saved text');
    expect(usePreviewStore.getState().isViewDirty()).toBe(false);
  });

  it('confirmClose discards and closes', () => {
    usePreviewStore.getState().openView(clip('hello'));
    usePreviewStore.getState().setEditedContent('changed');
    usePreviewStore.getState().requestClose();
    usePreviewStore.getState().confirmClose();
    expect(usePreviewStore.getState().isOpen).toBe(false);
    expect(usePreviewStore.getState().pendingClose).toBe(false);
  });
});
