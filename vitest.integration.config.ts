import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Integration tests hit a real Supabase project; kept separate from `npm test`.
 * Credentials are read from the gitignored .env.test.local (mode "test").
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    env: loadEnv('test', process.cwd(), ''),
  },
});
