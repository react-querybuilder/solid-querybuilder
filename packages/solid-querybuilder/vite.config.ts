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
      external: ['solid-js', /^solid-js\//, /^@solidjs\//, /^@react-querybuilder\/core/],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    // `build:source`/`build:types`/`build:css` write into the same directory afterward.
    emptyOutDir: true,
  },
  // No hand-written `resolve.conditions`: vite-plugin-solid@3 sets them per environment, and a
  // hand-maintained list only removes entries. `Placeholder.test.tsx` guards the result.
  test: {
    name: 'solid-querybuilder',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest-setup.ts'],
    // No `server.deps.inline: [/solid-js/]` — a fallback for when Vitest externalizes `solid-js`,
    // and inlining speculatively risks a second Solid instance. Symptoms that would justify it:
    // an empty render container, or diverging `createContext`/`createStore` identities.
  },
});
