import { defineConfig } from 'vitest/config';

/** Vitest configuration for the local Node API (the Angular app uses `ng test`). */
export default defineConfig({
  test: {
    name: 'api',
    root: './api',
    environment: 'node',
    globals: true,
    include: ['**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../coverage/api',
      include: ['**/*.ts'],
      // Entry-point scripts are exercised manually (see docs/facilitator-notes.md).
      exclude: ['**/*.spec.ts', 'server.ts', 'reset.ts', 'types.ts'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
