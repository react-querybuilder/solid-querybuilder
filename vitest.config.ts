import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*/vite.config.ts'],
    // Coverage is resolved from the root config only; a `coverage` block in the package's
    // `vite.config.ts` is silently ignored when the suite runs through `test.projects`, which is
    // how CI runs it.
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**'],
      exclude: ['**/*.{test,spec,test-d}.*'],
      thresholds: {
        lines: 80,
        // The reactive layer is load-bearing for every component, so it is held to a higher bar
        // than the repo as a whole. A glob key is scoped to the files it matches and fails
        // independently of the global threshold above.
        'packages/*/src/reactive/**': {
          lines: 90,
        },
      },
    },
  },
});
