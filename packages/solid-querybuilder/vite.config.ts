import { resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `solid: { generate: 'dom' }` — this is the dom-compiled fallback bundle (the `import`
  // condition). The `solid` condition itself is served from `dist/source`, built separately by
  // `tsc --jsx preserve` (see `build:source`), never from this plugin.
  plugins: [solid({ solid: { generate: 'dom' } })],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.tsx'),
      formats: ['es'],
    },
    rollupOptions: {
      external: ['solid-js', /^solid-js\//, /^@react-querybuilder\/core/],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    // `build:source`/`build:types`/`build:css` write into the same directory afterward.
    emptyOutDir: true,
  },
  resolve: {
    // The test env must resolve the development, browser build of `solid-js`, or components
    // silently get the server runtime and nothing renders.
    conditions: ['development', 'browser'],
  },
  test: {
    name: 'solid-querybuilder',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest-setup.ts'],
    // NOTE: no `server.deps.inline: [/solid-js/]`. The plan designates that a *fallback* for
    // the case where Vitest externalizes `solid-js`; `resolve.conditions` above is sufficient,
    // and inlining speculatively risks a second Solid instance in the test env. If a component
    // ever renders an empty container, or `createContext`/`createStore` identities diverge,
    // that is the symptom to re-add it for.
  },
});
