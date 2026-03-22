import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { reportError } from "./lib/errorReporter";
import "./i18n"; // Initialize i18n before App renders
import "./index.css";

// Configure Monaco Editor to use inline workers (no blob: URLs)
// This is required for App Store sandbox compatibility where blob: workers are blocked
// All Monaco features (syntax highlighting, diff, autocomplete) work identically
// Cross-platform: this configuration works on macOS, Windows, and Linux
(window as unknown as Record<string, unknown>).MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    // Use dynamic imports for each worker type — Vite bundles them inline
    if (label === 'json') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    // Default editor worker for all other languages
    return new Worker(
      new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
      { type: 'module' }
    );
  },
};

// Global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  reportError(error || new Error(String(message)), {
    action: 'global_error',
    component: `${source}:${lineno}:${colno}`,
  });
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = (event) => {
  let error: Error;
  if (event.reason instanceof Error) {
    error = event.reason;
  } else if (typeof event.reason === 'string') {
    error = new Error(event.reason);
  } else {
    // Try to extract useful info from non-Error reasons
    try {
      error = new Error(JSON.stringify(event.reason));
    } catch {
      error = new Error(`Unhandled rejection: ${typeof event.reason} - ${String(event.reason)}`);
    }
  }
  reportError(error, {
    action: 'unhandled_promise_rejection',
  });
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
