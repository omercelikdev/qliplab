import { describe, it, expect } from 'vitest';
import { AI_PROVIDER_LABELS, aiProviderLabel, type AiProviderId } from './ai';

describe('aiProviderLabel', () => {
  it('names every provider correctly', () => {
    expect(aiProviderLabel('anthropic')).toBe('Anthropic');
    expect(aiProviderLabel('openai')).toBe('OpenAI');
    expect(aiProviderLabel('gemini')).toBe('Google Gemini');
  });

  // Regression: the AI consent dialog mapped anything non-Anthropic to "OpenAI",
  // so Gemini users were told their clipboard went to OpenAI.
  it('never labels Gemini as OpenAI', () => {
    expect(aiProviderLabel('gemini')).not.toBe('OpenAI');
  });

  it('covers every provider id with a distinct label', () => {
    const ids: AiProviderId[] = ['anthropic', 'openai', 'gemini'];
    const labels = ids.map(aiProviderLabel);
    expect(new Set(labels).size).toBe(ids.length);
    expect(Object.keys(AI_PROVIDER_LABELS).sort()).toEqual([...ids].sort());
  });
});
