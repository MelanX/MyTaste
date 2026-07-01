import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import reportWebVitals from './reportWebVitals';
import './index.css';
import { loadConfig } from './config';
import { registerSW } from 'virtual:pwa-register';
import { fetchAndCache } from './utils/recipesCache';

navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'recipes-updated') {
    // The SW only broadcasts this after its own cache was revalidated against
    // the network, so re-fetching now is guaranteed to pick up the fresh data
    // (as opposed to just re-reading localStorage, which may still hold the
    // stale snapshot written by an in-flight StaleWhileRevalidate response).
    fetchAndCache().catch(() => {});
  }
});

// Register the service worker. Keep it quiet: rather than prompting, defer the
// SW swap until the user navigates (back/forward) or backgrounds the app, so an
// update never disrupts an in-progress session or loses unsaved form input —
// mirroring the legacy serviceWorkerRegistration deferred-activation flow.
const updateSW = registerSW({
  onNeedRefresh() {
    const applyUpdate = () => {
      updateSW(); // posts SKIP_WAITING; controllerchange reloads via the plugin
      unsubscribe();
    };
    // On pagehide (tab close / PWA backgrounded), activate the new SW. If the
    // page is later restored from bfcache, reload to resolve the old-JS /
    // new-SW mismatch (important on iOS Safari PWA).
    const onPageHide = () => {
      updateSW();
      window.addEventListener(
        'pageshow',
        (e) => {
          if (e.persisted) window.location.reload();
        },
        { once: true },
      );
      unsubscribe();
    };
    const unsubscribe = () => {
      window.removeEventListener('popstate', applyUpdate);
      window.removeEventListener('pagehide', onPageHide);
    };
    // popstate fires on back/forward navigation. Link clicks (React Router
    // pushState) are intentionally not intercepted to avoid turning SPA
    // navigations into hard reloads.
    window.addEventListener('popstate', applyUpdate, { once: true });
    window.addEventListener('pagehide', onPageHide, { once: true });
  },
});

const router = createBrowserRouter([{ path: '*', element: <App /> }]);

loadConfig()
  .then(() => {
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(
      <React.StrictMode>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </React.StrictMode>,
    );

    reportWebVitals();
  })
  .catch((error) => {
    console.error('Failed to load config:', error);
  });
