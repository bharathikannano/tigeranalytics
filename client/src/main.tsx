// ─────────────────────────────────────────────────────────────────────────────
// main.tsx  —  Application entry point
// Sets up React, the global query cache (TanStack Query), and mounts the app.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// QueryClient holds the global cache for all server data.
// staleTime  — how long cached data is considered "fresh" (no re-fetch for 30s)
// retry      — retry a failed request once before showing an error
// refetchOnWindowFocus — don't silently refetch when the user switches tabs
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* QueryClientProvider makes the cache available to every component */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
