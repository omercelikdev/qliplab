import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { reportError } from "./lib/errorReporter";
import "./i18n"; // Initialize i18n before App renders
import "./index.css";

// Configure Monaco Editor to use the locally bundled version instead of CDN.
// @monaco-editor/react's default loader fetches Monaco from jsdelivr CDN, which
// is blocked by WKWebView's CachedResourceLoader in App Store sandbox.
// By calling loader.config({ monaco }), we tell it to use the local monaco-editor
// package from node_modules, bundled by Vite. No CDN requests needed.
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
loader.config({ monaco });

// Configure Monaco Editor workers using Vite's ?worker&inline import.
// The &inline suffix inlines worker code as base64 in the main bundle and creates
// blob: URL workers at runtime. Without &inline, Vite emits separate chunk files
// that WKWebView's CachedResourceLoader blocks in App Store sandbox.
// blob: workers bypass the custom URL scheme entirely (CSP: worker-src 'self' blob:).
// Tradeoff: ~500KB larger bundle, but all Monaco features work identically.
// Cross-platform: this configuration works on macOS, Windows, and Linux.
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker&inline';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker&inline';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker&inline';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker&inline';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker&inline';

(window as unknown as Record<string, unknown>).MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
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
