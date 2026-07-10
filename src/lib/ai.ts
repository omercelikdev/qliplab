import { useSettingsStore } from '@/stores/settingsStore';
import { isSensitive } from '@/lib/formatDetector';
import { AiError, classifyApiError } from '@/lib/aiError';

export type AiAction = 'summarize' | 'fix_grammar' | 'translate' | 'explain_code' | 'rewrite_formal' | 'rewrite_casual';

export type AiProviderId = 'anthropic' | 'openai' | 'gemini';
export type AiProviderLabel = 'Anthropic' | 'OpenAI' | 'Google Gemini';

/** Human-facing provider names. Shown wherever we tell the user where their
 *  clipboard content is about to be sent — so it must never be wrong. */
export const AI_PROVIDER_LABELS: Record<AiProviderId, AiProviderLabel> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
};

export function aiProviderLabel(provider: AiProviderId): AiProviderLabel {
  return AI_PROVIDER_LABELS[provider];
}

const ACTION_PROMPTS: Record<AiAction, string> = {
  summarize: 'Summarize the following text concisely. Return only the summary, no preamble.',
  fix_grammar: 'Fix the grammar and spelling in the following text. Return only the corrected text, no explanations.',
  translate: 'Translate the following text to English. If it is already in English, translate it to the language it appears to be targeting. Return only the translation.',
  explain_code: 'Explain what this code does in plain English. Be concise.',
  rewrite_formal: 'Rewrite the following text in a formal, professional tone. Return only the rewritten text.',
  rewrite_casual: 'Rewrite the following text in a casual, friendly tone. Return only the rewritten text.',
};

export const AI_ACTIONS: { id: AiAction; label: string }[] = [
  { id: 'summarize', label: 'Summarize' },
  { id: 'fix_grammar', label: 'Fix Grammar' },
  { id: 'translate', label: 'Translate' },
  { id: 'explain_code', label: 'Explain Code' },
  { id: 'rewrite_formal', label: 'Formal Tone' },
  { id: 'rewrite_casual', label: 'Casual Tone' },
];

export function isAiConfigured(): boolean {
  const { aiApiKey } = useSettingsStore.getState().settings;
  return aiApiKey.length > 0;
}

export function isAiConsentGiven(): boolean {
  return useSettingsStore.getState().settings.aiConsentAccepted === true;
}

export async function runAiAction(action: AiAction, content: string): Promise<string> {
  // SECURITY: Block AI for sensitive content (defence in depth)
  if (isSensitive(content)) {
    throw new AiError('sensitiveBlocked');
  }

  const { aiApiKey, aiProvider } = useSettingsStore.getState().settings;

  if (!aiApiKey) {
    throw new AiError('noApiKey');
  }

  const systemPrompt = ACTION_PROMPTS[action];

  if (aiProvider === 'anthropic') {
    return callAnthropic(aiApiKey, systemPrompt, content);
  } else if (aiProvider === 'gemini') {
    return callGemini(aiApiKey, systemPrompt, content);
  } else {
    return callOpenAI(aiApiKey, systemPrompt, content);
  }
}

async function callAnthropic(apiKey: string, systemPrompt: string, content: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    throw classifyApiError('Anthropic', response.status, await response.text());
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

async function callGemini(apiKey: string, systemPrompt: string, content: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: content }] }],
      }),
    }
  );

  if (!response.ok) {
    throw classifyApiError('Gemini', response.status, await response.text());
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callOpenAI(apiKey: string, systemPrompt: string, content: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw classifyApiError('OpenAI', response.status, await response.text());
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}
