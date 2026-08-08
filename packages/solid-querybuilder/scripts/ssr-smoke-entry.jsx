/**
 * SSR smoke-test entry, loaded through Vite's SSR pipeline by `scripts/ssr-smoke.ts`.
 *
 * Both imports must be resolved *inside* Vite's module graph so the component and the renderer
 * share one instance of `solid-js` / `solid-js/web` — see the comment at the `ssrLoadModule`
 * call. The library is imported by BARE SPECIFIER on purpose: that exercises the `solid` export
 * condition the same way a real SSR consumer does.
 *
 * Plain `.jsx`, not `.tsx`, so it stays out of the typecheck project — `bun run check` must not
 * depend on `dist/` existing.
 */
import { renderToStringAsync } from 'solid-js/web';
import { Placeholder } from 'solid-querybuilder';

export const render = () => renderToStringAsync(() => <Placeholder label="ssr-smoke" />);
