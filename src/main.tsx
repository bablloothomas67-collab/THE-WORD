import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts (no third-party font CDN): Latin + Malayalam.
import '@fontsource/noto-serif/400.css';
import '@fontsource/noto-serif/600.css';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans-malayalam/400.css';
import '@fontsource/noto-sans-malayalam/500.css';
import '@fontsource/noto-sans-malayalam/600.css';

import './styles/tokens.css';
import './styles/global.css';

import { initI18n } from './app/i18n';
import { App } from './app/App';

initI18n();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
