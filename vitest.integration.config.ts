import { defineConfig } from 'vitest/config';

/** Integration tests hit a real Supabase project; kept separate from `npm test`. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
