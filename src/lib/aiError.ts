/**
 * Typed AI failures.
 *
 * `ai.ts` used to throw Errors carrying hardcoded English sentences that
 * duplicated the `ai.error.*` i18n strings, and the UI rendered the raw
 * exception. Throwing a code + params instead lets the component translate.
 */

export type AiErrorCode =
  | 'sensitiveBlocked'
  | 'noApiKey'
  | 'rateLimited'
  | 'invalidKey'
  | 'badRequest'
  | 'apiError'
  | 'generic';

export type AiErrorParams = Record<string, string | number>;

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    public readonly params: AiErrorParams = {},
  ) {
    super(code);
    this.name = 'AiError';
  }
}

/** The i18n key for an AiError, e.g. `ai.error.rateLimited`. */
export function aiErrorKey(code: AiErrorCode): string {
  return `ai.error.${code}`;
}

/** Map an HTTP failure from a provider onto a translatable error code. */
export function classifyApiError(provider: string, status: number, body: string): AiError {
  let message = '';
  try {
    const json = JSON.parse(body) as { error?: { message?: string }; message?: string };
    message = json.error?.message || json.message || '';
  } catch {
    // Not JSON — fall through to the status-only case.
  }

  if (status === 429) return new AiError('rateLimited', { provider });
  if (status === 401 || status === 403) return new AiError('invalidKey', { provider });
  if (status === 400) {
    return new AiError('badRequest', { provider, message: message.slice(0, 150) || 'Bad request' });
  }
  if (message) return new AiError('generic', { provider, message: message.slice(0, 150) });
  return new AiError('apiError', { provider, status });
}

/** Narrow an unknown thrown value to an AiError, defaulting to `generic`. */
export function toAiError(e: unknown, provider: string): AiError {
  if (e instanceof AiError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new AiError('generic', { provider, message: message.slice(0, 150) });
}
