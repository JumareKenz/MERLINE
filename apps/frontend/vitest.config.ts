import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * The app previously had no Vitest config at all, while `frontend-ci.yml`
 * called `npm run test:ci` — a script that did not exist. The job could only
 * ever fail, which is part of why CI was ignored.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
  },
});
