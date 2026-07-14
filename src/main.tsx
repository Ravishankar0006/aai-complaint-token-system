import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./index.css";

// Clear stale localStorage from previous versions to prevent runtime errors
const APP_VERSION = "2.0.0";
const storedVersion = localStorage.getItem("cts_app_version");
if (storedVersion !== APP_VERSION) {
  // Remove all app-specific keys (preserves theme preference)
  const keysToRemove = [
    "cts_users",
    "cts_tokens",
    "cts_tech_statuses",
    "cts_token_history",
    "cts_assignment_logs",
    "cts_last_assigned_pointers",
    "cts_notifications",
  ];
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem("cts_app_version", APP_VERSION);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
