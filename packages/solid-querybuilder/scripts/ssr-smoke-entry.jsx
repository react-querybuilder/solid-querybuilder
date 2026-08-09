/**
 * SSR smoke-test entry, loaded through Vite's SSR pipeline by `scripts/ssr-smoke.ts`.
 *
 * Both imports must be resolved *inside* Vite's module graph so the component and the renderer
 * share one instance of `solid-js` / `@solidjs/web` — see the comment at the `ssrLoadModule`
 * call. The library is imported by BARE SPECIFIER on purpose: that exercises the `solid` export
 * condition the same way a real SSR consumer does.
 *
 * `QueryBuilder` is the real component under test (not a placeholder): it uses `createContext`,
 * `createStore`, and `createEffect`, so it is also the thing that would break first if the two
 * module graphs ever stopped sharing one Solid instance.
 *
 * Plain `.jsx`, not `.tsx`, so it stays out of the typecheck project — `bun run check` must not
 * depend on `dist/` existing.
 */
import { renderToString } from '@solidjs/web';
import { QueryBuilder } from 'solid-querybuilder';

const fields = [{ name: 'f1', label: 'F1' }];

const query = {
  id: 'root',
  combinator: 'and',
  rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'v1' }],
};

export const render = () =>
  renderToString(() => <QueryBuilder fields={fields} query={query} onQueryChange={() => {}} />);
