# solid-querybuilder

Solid component for complex query building. A port of
[React Query Builder](https://react-querybuilder.js.org) built on
[`@react-querybuilder/core`](https://www.npmjs.com/package/@react-querybuilder/core), producing
byte-identical DOM output.

## ⚠️ Requires Solid 2.0

This package targets **Solid 2 only**. Its peer dependencies are `solid-js@^2.0.0-beta.32` **and**
`@solidjs/web@^2.0.0-beta.32` — in Solid 2 the DOM runtime ships as its own package, so both are
required.

Solid 2 is currently in **beta**, and this package tracks it deliberately rather than waiting: the
port is built on Solid 2 idiom (`merge`/`omit`, split effects, `createStore` from `solid-js`) that
has no faithful Solid 1 equivalent. It does not carry `solid-js@1` compatibility shims and it never
will. Should demand warrant a Solid 1.x port, it would be published separately as
`@react-querybuilder/solid1`.

## Installation

```bash
npm install solid-querybuilder
```

`solid-js@^2.0.0-beta.32` and `@solidjs/web@^2.0.0-beta.32` are peer dependencies. Install
`@solidjs/web` from the `next` dist-tag; its `latest` tag is `2.0.0-experimental.0`, an incompatible
line. `@react-querybuilder/core` is a regular dependency and is re-exported in full — `formatQuery`,
`defaultOperators`, `transformQuery`, `QueryManager` and the rest all import from
`solid-querybuilder` — so you never need to depend on it directly.

## Quick start

```tsx
import { createSignal } from 'solid-js';
import { formatQuery, QueryBuilder, type Field, type RuleGroupType } from 'solid-querybuilder';
import 'solid-querybuilder/dist/query-builder.css';

const fields: Field[] = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
  { name: 'age', label: 'Age', inputType: 'number' },
];

const [query, setQuery] = createSignal<RuleGroupType>({
  combinator: 'and',
  rules: [{ field: 'firstName', operator: 'beginsWith', value: 'Stev' }],
});

function App() {
  return (
    <>
      <QueryBuilder query={query()} onQueryChange={setQuery} fields={fields} />
      <pre>{formatQuery(query(), 'sql')}</pre>
    </>
  );
}
```

## Driving the query

| Approach                  | Use when                                                |
| ------------------------- | ------------------------------------------------------- |
| `defaultQuery`            | Uncontrolled; the component owns the query.             |
| `query` + `onQueryChange` | Explicit controlled mode.                               |
| `manager`                 | External control via a `QueryManager` instance you own. |

Veto callbacks — `onAddRule`, `onAddGroup`, `onRemove`, `onMoveRule`, `onMoveGroup`, `onGroupRule`,
`onGroupGroup` — are callback props that can cancel or rewrite the pending change.

External control:

```tsx
import { QueryManager, QueryBuilder } from 'solid-querybuilder';

const manager = new QueryManager({ combinator: 'and', rules: [] }, { history: true });

function App() {
  return (
    <>
      <QueryBuilder manager={manager} fields={fields} />
      <button onClick={() => manager.undo()}>Undo</button>
    </>
  );
}
```

## Styling

Two prebuilt stylesheets ship in `dist`: `query-builder.css` (full) and
`query-builder-layout.css` (structural only). Both are byte-identical to
`@react-querybuilder/core`'s. The `.scss` sources are published alongside them for
`@use ... with (...)` overrides. See [`docs/styling.md`](./docs/styling.md).

## Documentation

- [`docs/customization.md`](./docs/customization.md) — translations, `controlElements`, context,
  writing a replacement component, external control, class names.
- [`docs/differences-from-react-querybuilder.md`](./docs/differences-from-react-querybuilder.md) —
  what is and is not ported, and every intentional divergence.
- [`docs/styling.md`](./docs/styling.md) — stylesheets, custom properties, class-name overrides.
- [React Query Builder's documentation](https://react-querybuilder.js.org) applies to props,
  formatters, and query shapes; this port renders the same DOM from the same core.

## Examples

- `examples/demo` — every value editor, both query shapes, all display flags, undo/redo, and live
  `formatQuery` output. `bun run --filter @solid-querybuilder/example-demo dev`.
- `examples/ssr` — a hand-rolled Vite SSR consumer that server-renders and hydrates. It doubles as
  the repo's SSR gate; see `examples/ssr/ssr-smoke-test.ts`.

## Non-goals

Drag and drop, UI-framework compatibility packages, `expr`/`datetime` UI, async option lists,
a Redux store, and deprecated-prop fallbacks are all out of scope for v1.

## License

MIT
