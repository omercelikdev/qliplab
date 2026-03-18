import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { reportError } from "./lib/errorReporter";
import "./i18n"; // Initialize i18n before App renders
import "./index.css";

// Global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  reportError(error || new Error(String(message)), {
    action: 'global_error',
    component: `${source}:${lineno}:${colno}`,
  });
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = (event) => {
  const error = event.reason instanceof Error
    ? event.reason
    : new Error(String(event.reason));
  reportError(error, {
    action: 'unhandled_promise_rejection',
  });
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
