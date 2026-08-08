# solid-querybuilder

Solid component for complex query building. A port of
[React Query Builder](https://react-querybuilder.js.org) built on
[`@react-querybuilder/core`](https://www.npmjs.com/package/@react-querybuilder/core), producing
byte-identical DOM output.

## Installation

```bash
npm install solid-querybuilder
```

`solid-js@^1.9 || ^2.0.0-0` is a peer dependency. `@react-querybuilder/core` is a regular
dependency and is re-exported in full, so you never need to depend on it directly.

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
`@use ... with (...)` overrides.

## Non-goals

Drag and drop, UI-framework compatibility packages, `expr`/`datetime` UI, async option lists,
a Redux store, and deprecated-prop fallbacks are all out of scope for v1.

## License

MIT
