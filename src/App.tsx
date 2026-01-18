import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DragBar } from './components/layout/DragBar';
import { SearchBar } from './components/layout/SearchBar';
import { TabBar } from './components/layout/TabBar';
import { HintBar } from './components/layout/HintBar';
import { HistoryList } from './components/history/HistoryList';
import { SnippetList } from './components/snippets/SnippetList';
import { VaultList } from './components/vault/VaultList';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorReportingOptIn } from './components/feedback/ErrorReportingOptIn';
import { useAppStore } from './stores/appStore';
import { useHistoryStore } from './stores/historyStore';
import { usePreviewStore } from './stores/previewStore';
import { useFeedbackStore } from './stores/feedbackStore';
import { useClipboardListener } from './hooks/useClipboardListener';
import { useGlobalShortcut } from './hooks/useGlobalShortcut';
import { useAutostart } from './hooks/useAutostart';
import { useDiffMode } from './hooks/useDiffMode';
import { useTheme } from './hooks/useTheme';
import { useSettingsStore } from './stores/settingsStore';
import { initDatabase } from './lib/database';
import { cn } from './lib/utils';

function App() {
  const { activeTab } = useAppStore();
  const { loadItems } = useHistoryStore();
  const { loadSettings } = useSettingsStore();
  const { isOpen: previewOpen } = usePreviewStore();
  const { hasSeenOptIn, loadSettings: loadFeedbackSettings } = useFeedbackStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showOptIn, setShowOptIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initDatabase();
      await loadSettings();
      await loadFeedbackSettings();
      await loadItems();
      setIsInitialized(true);
    };
    init();
  }, [loadItems, loadSettings, loadFeedbackSettings]);

  // Show opt-in dialog on first run after initialization
  useEffect(() => {
    if (isInitialized && !hasSeenOptIn) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => setShowOptIn(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, hasSeenOptIn]);

  useClipboardListener();
  useGlobalShortcut();
  useAutostart();
  useDiffMode();
  useTheme();

  if (!isInitialized) {
    return (
      <div className={cn('h-screen w-screen flex items-center justify-center', 'glass rounded-xl border border-border')}>
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={cn('h-screen w-screen flex flex-col overflow-hidden', 'glass rounded-xl border border-border')}>
        <DragBar />
        <SearchBar />
        <TabBar />
        <div className="flex flex-1 overflow-hidden">
          <div className={cn('flex-1 overflow-hidden transition-all', previewOpen ? 'w-1/2' : 'w-full')}>
            {activeTab === 'history' && <HistoryList />}
            {activeTab === 'snippets' && <SnippetList />}
            {activeTab === 'vault' && <VaultList />}
          </div>
          <AnimatePresence>
            {previewOpen && <PreviewPanel />}
          </AnimatePresence>
        </div>
        <HintBar />
      </div>

      <ErrorReportingOptIn isOpen={showOptIn} onClose={() => setShowOptIn(false)} />
    </ErrorBoundary>
  );
}

export default App;
