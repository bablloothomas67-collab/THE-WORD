import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

// Unit/component tests never touch a real backend, even if .env.local exists.
vi.mock('../src/services/supabase/client', () => ({ supabase: null, isSupabaseConfigured: false }));
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// jsdom has no matchMedia; the theme hook reads it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
