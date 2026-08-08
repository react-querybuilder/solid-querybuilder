import { resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vite';

const pkgRoot = resolve(import.meta.dirname, '../../packages/solid-querybuilder');
const coreDist = resolve(import.meta.dirname, '../../node_modules/@react-querybuilder/core/dist');

export default defineConfig({
  plugins: [solid()],
  resolve: {
    // ⚠️ ORDER MATTERS. Vite's `alias` array is evaluated top-down and the first match wins, so
    // the CSS entry MUST precede the bare-specifier entry — otherwise `solid-querybuilder` is
    // rewritten first and `solid-querybuilder/dist/query-builder.css` becomes a path into
    // `src/index.tsx/dist/...`. [Vue hindsight]
    alias: [
      // The library's own CSS is a byte-identical copy of core's, produced by `build:css`. Aliasing
      // to core's prebuilt files lets `src/index.tsx` write the exact import line a real consumer
      // writes without requiring `bun run build` first.
      { find: /^solid-querybuilder\/dist\/(.*\.s?css)$/, replacement: `${coreDist}/$1` },
      // Source, not `dist` — HMR on the library without a build step.
      { find: /^solid-querybuilder$/, replacement: resolve(pkgRoot, 'src/index.tsx') },
    ],
  },
});
