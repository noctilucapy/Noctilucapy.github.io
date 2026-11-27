import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/jost/latin-400.css';
import '@fontsource/jost/latin-500.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import App from './App';
import { mountIosHaptics } from './haptics';
import './styles/tokens.css';
import './styles/base.css';
import './styles/home.css';
import './styles/play.css';
import './styles/screens.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

mountIosHaptics();

// Offline support + instant updates (production only; the dev server must not be cached).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* non-fatal */ });
  });
}
