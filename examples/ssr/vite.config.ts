import { resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vite';

// `ssr: true` — the *transforms only* mode: hydratable client output and `generate: 'ssr'` server
// output, with the entries and the server supplied by hand. Deliberately not the object form
// (`ssr: {}`), which would take over serving with the plugin's turnkey handler: the point of this
// example is that a plain consumer can wire SSR itself, and that the `solid` export condition is
// what makes that work.
export default defineConfig({
  plugins: [solid({ ssr: true })],
  // The library must be bundled into the server output rather than left as a bare import for
  // Node to resolve at runtime. Node has no `solid` condition, so an externalized
  // `solid-querybuilder` would resolve through `import` to the *dom-compiled* bundle and render
  // nothing server-side. Inlining it makes Vite resolve it — with the plugin's `solid`-first
  // condition list — and compile the raw JSX for `generate: 'ssr'`.
  ssr: { noExternal: ['solid-querybuilder', 'solid-js', '@solidjs/web'] },
  build: {
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/entry-client.tsx'),
      output: {
        // No content hashes: the server entry writes a fixed `<script src>` and the smoke test
        // reads a fixed path. A manifest lookup would add a moving part with nothing to prove.
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
});
