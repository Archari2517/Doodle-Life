import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker so the browser recognizes Planda as an
// installable PWA (Chrome's `beforeinstallprompt` won't fire without one —
// see SettingsView's install button). Runs after load so it never delays
// first paint, and only in production builds served over HTTPS/localhost.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}
