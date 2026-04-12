import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getCurrentWindow, LogicalPosition, type CloseRequestedEvent } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { Sidebar } from './components/layout/Sidebar';
import { SearchBar } from './components/layout/DragBar';
import { HintBar } from './components/layout/HintBar';
import { Splitter } from './components/layout/Splitter';
import { ResizeBorder } from './components/layout/ResizeBorder';
import { OnboardingBanner } from './components/layout/OnboardingBanner';
import { HistoryList } from './components/history/HistoryList';
import { SnippetList } from './components/snippets/SnippetList';
import { VaultList } from './components/vault/VaultList';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { SettingsPanel } from './components/settings/SettingsDialog';
import { SnippetEditorPanel } from './components/snippets/SnippetEditorPanel';
import { WindowHeader } from './components/layout/WindowHeader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorReportingOptIn } from './components/feedback/ErrorReportingOptIn';
import { EulaDialog } from './components/legal/EulaDialog';
import { useAppStore } from './stores/appStore';
import { useHistoryStore } from './stores/historyStore';
import { usePreviewStore } from './stores/previewStore';
import { useSnippetStore } from './stores/snippetStore';
import { useFeedbackStore } from './stores/feedbackStore';
import { useClipboardListener } from './hooks/useClipboardListener';
import { useGlobalShortcut } from './hooks/useGlobalShortcut';
import { useAutostart } from './hooks/useAutostart';
import { useDiffMode } from './hooks/useDiffMode';
import { useTriggerEngine } from './hooks/useTriggerEngine';
import { useTheme } from './hooks/useTheme';
import { useSettingsStore } from './stores/settingsStore';
import { useTagStore } from './stores/tagStore';
import { useLicenseStore } from './stores/licenseStore';
import { initDatabase } from './lib/database';
import i18n from './i18n';
import { showWindow, hideWindow } from './lib/window';
import { cn } from './lib/utils';

const DEFAULT_LIST_WIDTH = 300;
const MIN_LIST_WIDTH = 200;
const MAX_LIST_WIDTH = 500;

function App() {
  const { activeTab } = useAppStore();
  const { loadItems } = useHistoryStore();
  const { loadSettings } = useSettingsStore();
  const eulaAccepted = useSettingsStore((s) => s.settings.eulaAccepted);
  const { isOpen: previewOpen } = usePreviewStore();
  const { editorOpen: snippetEditorOpen } = useSnippetStore();
  const showSidePanel = activeTab !== 'settings' && (previewOpen || snippetEditorOpen);
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

      // Settings must load before cleanup; feedback settings are independent
      await Promise.all([loadSettings(), loadFeedbackSettings()]);

      // Sync i18n language from persisted settings
      const { language } = useSettingsStore.getState().settings;
      if (language === 'system') {
        const detected = navigator.language.split('-')[0];
        const supported = ['en', 'tr', 'ar', 'de', 'fr', 'es', 'pt', 'zh', 'ja', 'ko', 'ru', 'it', 'hi', 'nl', 'pl'];
        i18n.changeLanguage(supported.includes(detected) ? detected : 'en');
      } else {
        i18n.changeLanguage(language);
      }

      // Cleanup expired clips, then load data in parallel
      const { expirationDays } = useSettingsStore.getState().settings;
      if (expirationDays > 0) {
        await useHistoryStore.getState().cleanupExpired(expirationDays);
      }

      await Promise.all([
        loadItems(),
        useTagStore.getState().loadTags(),
        useTagStore.getState().loadItemTags(),
        useLicenseStore.getState().checkEntitlement(),
      ]);
      setIsInitialized(true);
    };
    init();
  }, [loadItems, loadSettings, loadFeedbackSettings]);

  // Show opt-in dialog on first run after EULA is accepted
  useEffect(() => {
    if (isInitialized && eulaAccepted && !hasSeenOptIn) {
      // Small delay to let the UI settle after EULA acceptance
      const timer = setTimeout(() => setShowOptIn(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, eulaAccepted, hasSeenOptIn]);

  // Listen for tray icon "Show" event from Rust
  useEffect(() => {
    const unlisten = listen('tray-show', () => {
      showWindow();
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  // Clear unpinned history on quit if setting is enabled
  useEffect(() => {
    const window = getCurrentWindow();
    const unlisten = window.onCloseRequested(async (_event: CloseRequestedEvent) => {
      const clearOnQuit = useSettingsStore.getState().settings.clearHistoryOnQuit;
      if (clearOnQuit) {
        await useHistoryStore.getState().clearUnpinned();
      }
    });
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  // On startup, if window is not visible, move it offscreen to prevent input capture
  // This is critical for autostart scenarios
  useEffect(() => {
    const ensureOffscreenWhenHidden = async () => {
      const window = getCurrentWindow();
      const visible = await window.isVisible();
      if (!visible) {
        await window.setPosition(new LogicalPosition(-10000, -10000));
      }
    };
    ensureOffscreenWhenHidden();
  }, []);

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
  useTriggerEngine();
  useTheme();

  // Global Escape handler: hide window when no popup/panel is open
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Don't hide if focus is in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      // Don't hide if preview/editor is open (those handle their own Escape)
      if (previewOpen || snippetEditorOpen) return;
      // Don't hide if on settings tab
      if (activeTab === 'settings') return;
      hideWindow();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewOpen, snippetEditorOpen, activeTab]);

  if (!isInitialized) {
    return (
      <div className={cn('h-screen w-screen flex items-center justify-center', 'glass rounded-lg border border-foreground/[0.04] dark:border-white/[0.03] shadow-[0_25px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]')}>
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!eulaAccepted) {
    return (
      <div className={cn('h-screen w-screen', 'glass rounded-lg border border-foreground/[0.04] dark:border-white/[0.03] shadow-[0_25px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]')}>
        <EulaDialog />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ResizeBorder />
      <div className={cn('h-screen w-screen flex flex-col overflow-hidden', 'glass rounded-lg border border-foreground/[0.04] dark:border-white/[0.03] shadow-[0_25px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]')}>
        {/* Window Header — thin draggable strip with platform controls */}
        <WindowHeader />

        <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar with Brand */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab !== 'settings' && <SearchBar />}
          {activeTab !== 'settings' && <OnboardingBanner />}
          <div className="flex flex-1 overflow-hidden">
            <div
              className="overflow-hidden"
              style={{ width: showSidePanel ? listWidth : '100%' }}
            >
              <ErrorBoundary>
                {activeTab === 'history' && <HistoryList />}
                {activeTab === 'snippets' && <SnippetList />}
                {activeTab === 'vault' && <VaultList />}
                {activeTab === 'settings' && <SettingsPanel />}
              </ErrorBoundary>
            </div>
            {showSidePanel && (
              <Splitter
                onResize={handleSplitterResize}
                minListWidth={MIN_LIST_WIDTH}
                maxListWidth={MAX_LIST_WIDTH}
              />
            )}
            <AnimatePresence mode="wait">
              {previewOpen && (
                <ErrorBoundary>
                  <PreviewPanel />
                </ErrorBoundary>
              )}
              {snippetEditorOpen && !previewOpen && (
                <ErrorBoundary>
                  <SnippetEditorPanel />
                </ErrorBoundary>
              )}
            </AnimatePresence>
          </div>
          <HintBar />
        </div>
        </div>
      </div>

      <ErrorReportingOptIn isOpen={showOptIn} onClose={() => setShowOptIn(false)} />
    </ErrorBoundary>
  );
}

export default App;
