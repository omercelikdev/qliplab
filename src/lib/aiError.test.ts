import { describe, it, expect } from 'vitest';
import { AiError, aiErrorKey, classifyApiError, toAiError } from './aiError';

describe('aiErrorKey', () => {
  it('builds the i18n key for a code', () => {
    expect(aiErrorKey('rateLimited')).toBe('ai.error.rateLimited');
    expect(aiErrorKey('noApiKey')).toBe('ai.error.noApiKey');
  });
});

describe('classifyApiError', () => {
  it('maps 429 to rateLimited', () => {
    const e = classifyApiError('OpenAI', 429, '{}');
    expect(e.code).toBe('rateLimited');
    expect(e.params.provider).toBe('OpenAI');
  });

  it('maps 401 and 403 to invalidKey', () => {
    expect(classifyApiError('Anthropic', 401, '{}').code).toBe('invalidKey');
    expect(classifyApiError('Anthropic', 403, '{}').code).toBe('invalidKey');
  });

  it('maps 400 to badRequest and carries the provider message', () => {
    const e = classifyApiError('Gemini', 400, JSON.stringify({ error: { message: 'bad prompt' } }));
    expect(e.code).toBe('badRequest');
    expect(e.params.message).toBe('bad prompt');
  });

  it('falls back to badRequest with a default message when none is given', () => {
    const e = classifyApiError('Gemini', 400, 'not json');
    expect(e.code).toBe('badRequest');
    expect(e.params.message).toBe('Bad request');
  });

  it('uses generic when a message exists for an unmapped status', () => {
    const e = classifyApiError('OpenAI', 500, JSON.stringify({ message: 'overloaded' }));
    expect(e.code).toBe('generic');
    expect(e.params.message).toBe('overloaded');
  });

  it('uses apiError with the status when the body carries no message', () => {
    const e = classifyApiError('OpenAI', 503, '');
    expect(e.code).toBe('apiError');
    expect(e.params.status).toBe(503);
  });

  it('truncates long provider messages', () => {
    const long = 'x'.repeat(400);
    const e = classifyApiError('OpenAI', 400, JSON.stringify({ message: long }));
    expect(String(e.params.message)).toHaveLength(150);
  });
});

describe('toAiError', () => {
  it('passes an AiError through unchanged', () => {
    const original = new AiError('noApiKey');
    expect(toAiError(original, 'OpenAI')).toBe(original);
  });

  // Regression: the UI rendered `${e}` — a raw exception string — as the result.
  it('wraps an arbitrary throw into a translatable generic error', () => {
    const e = toAiError(new Error('socket hang up'), 'Anthropic');
    expect(e.code).toBe('generic');
    expect(e.params.provider).toBe('Anthropic');
    expect(e.params.message).toBe('socket hang up');
  });

  it('handles non-Error throws', () => {
    expect(toAiError('boom', 'OpenAI').params.message).toBe('boom');
  });
});
