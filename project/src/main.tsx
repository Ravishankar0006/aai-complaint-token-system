import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { initDb } from "./db/mockDb.ts";
import "./index.css";

// Clear stale localStorage from previous versions to prevent runtime errors.
// (Data itself now lives in Supabase — this only ever touched the old
// local cache keys and the app-version marker, so it's safe to keep.)
const APP_VERSION = "2.0.0";
const storedVersion = localStorage.getItem("cts_app_version");
if (storedVersion !== APP_VERSION) {
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

const root = ReactDOM.createRoot(document.getElementById("root")!);

// Show a lightweight loading state while the initial data loads from
// Supabase, then render the real app. This replaces the old instant
// (synchronous, localStorage-only) startup with one quick network fetch.
root.render(
  <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm font-medium">
    Loading…
  </div>
);

initDb()
  .catch((err) => {
    // Log and continue — the app will still render, just with an empty
    // cache, so the person isn't stuck on a blank loading screen forever.
    console.error("Failed to initialize database from Supabase:", err);
  })
  .finally(() => {
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  });
