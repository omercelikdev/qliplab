import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Sidebar } from './components/layout/Sidebar';
import { SearchBar } from './components/layout/DragBar';
import { HintBar } from './components/layout/HintBar';
import { Splitter } from './components/layout/Splitter';
import { ResizeBorder } from './components/layout/ResizeBorder';
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

const DEFAULT_LIST_WIDTH = 300;
const MIN_LIST_WIDTH = 200;
const MAX_LIST_WIDTH = 500;

function App() {
  const { activeTab } = useAppStore();
  const { loadItems } = useHistoryStore();
  const { loadSettings } = useSettingsStore();
  const { isOpen: previewOpen } = usePreviewStore();
  const showSidePanel = previewOpen;
  const { hasSeenOptIn, loadSettings: loadFeedbackSettings } = useFeedbackStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showOptIn, setShowOptIn] = useState(false);
  const [listWidth, setListWidth] = useState(DEFAULT_LIST_WIDTH);

  const handleSplitterResize = useCallback((width: number) => {
    setListWidth(width);
  }, []);

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

  // Blur search field when window gains focus (so arrow keys work)
  useEffect(() => {
    const window = getCurrentWindow();
    const unlisten = window.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        // Small delay to let focus settle, then blur any input
        setTimeout(() => {
          if (document.activeElement instanceof HTMLInputElement) {
            document.activeElement.blur();
          }
        }, 10);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  useClipboardListener();
  useGlobalShortcut();
  useAutostart();
  useDiffMode();
  useTheme();

  if (!isInitialized) {
    return (
      <div className={cn('h-screen w-screen flex items-center justify-center', 'glass rounded-lg border border-border')}>
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ResizeBorder />
      <div className={cn('h-screen w-screen flex overflow-hidden', 'glass rounded-lg border border-border')}>
        {/* Left Sidebar with Brand */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <SearchBar />
          <div className="flex flex-1 overflow-hidden">
            <div
              className="overflow-hidden"
              style={{ width: showSidePanel ? listWidth : '100%' }}
            >
              {activeTab === 'history' && <HistoryList />}
              {activeTab === 'snippets' && <SnippetList />}
              {activeTab === 'vault' && <VaultList />}
            </div>
            {showSidePanel && (
              <Splitter
                onResize={handleSplitterResize}
                minListWidth={MIN_LIST_WIDTH}
                maxListWidth={MAX_LIST_WIDTH}
              />
            )}
            <AnimatePresence mode="wait">
              {showSidePanel && <PreviewPanel />}
            </AnimatePresence>
          </div>
          <HintBar />
        </div>
      </div>

      <ErrorReportingOptIn isOpen={showOptIn} onClose={() => setShowOptIn(false)} />
    </ErrorBoundary>
  );
}

export default App;
