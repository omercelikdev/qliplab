import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSnippetStore } from '@/stores/snippetStore';
import { useVaultStore } from '@/stores/vaultStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { collectTriggers, expandTrigger } from '@/lib/triggerEngine';

interface TriggerMatchPayload {
  trigger: string;
  sourceId: string;
  triggerLen: number;
}

export function useTriggerEngine() {
  const snippets = useSnippetStore((s) => s.snippets);
  const vaultItems = useVaultStore((s) => s.items);
  const vaultLocked = useVaultStore((s) => s.isLocked);
  const snippetAutoExpand = useSettingsStore((s) => s.settings.snippetAutoExpand);

  // Start/stop the Rust keystroke watcher. Rust guards against spawning a second
  // watcher thread, so re-enabling never creates a duplicate event tap.
  useEffect(() => {
    if (!snippetAutoExpand) {
      invoke('stop_trigger_engine').catch(() => {});
      return;
    }
    invoke('start_trigger_engine').catch(() => {});
  }, [snippetAutoExpand]);

  // Keep trigger map in sync with ALL sources
  useEffect(() => {
    if (!snippetAutoExpand) return;

    const triggers = collectTriggers(snippets, vaultItems, vaultLocked);
    invoke('update_triggers', { triggers }).catch(() => {});
  }, [snippets, vaultItems, vaultLocked, snippetAutoExpand]);

  // Listen for trigger matches and expand
  useEffect(() => {
    if (!snippetAutoExpand) return;

    const unlisten = listen<TriggerMatchPayload>('trigger-matched', async (event) => {
      const { sourceId, triggerLen } = event.payload;
      await expandTrigger(sourceId, triggerLen);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [snippetAutoExpand]);
}
