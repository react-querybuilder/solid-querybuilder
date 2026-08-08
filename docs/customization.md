# Customization

Four things are customizable, in increasing order of invasiveness: **translations**, **class
names**, **replacement components** (`controlElements`), and **external control** of the query
itself. All four can be supplied per-`QueryBuilder` or, for a whole subtree, through
`QueryBuilderContext`.

## Translations

Every visible string is a translation entry. Override any subset:

```tsx
<QueryBuilder
  fields={fields}
  defaultQuery={query}
  translations={{
    addRule: { label: '+ Rule', title: 'Add a rule' },
    addGroup: { label: '+ Group', title: 'Add a group' },
    removeRule: { title: 'Delete this rule' },
  }}
/>
```

Labels are `LabelNode` — a `string` **or** a `JSX.Element`, this port's replacement for React Query
Builder's `ReactNode`. Titles are always `string`.

```tsx
translations={{ addRule: { label: <span aria-hidden>➕</span>, title: 'Add a rule' } }}
```

Partial entries merge with the defaults, key by key: overriding only `title` leaves `label` alone.

## Class names

`controlClassnames` adds class names without replacing the standard ones, which is what keeps the
port's DOM parity intact. See [`styling.md`](./styling.md#overriding-class-names).

## Replacement components — `controlElements`

Pass a component to replace any control, or `null` to remove it entirely:

```tsx
import type { ActionProps } from 'solid-querybuilder';

const AddRuleButton = (props: ActionProps) => (
  <button type="button" class={props.className} onClick={e => props.handleOnClick(e)}>
    {props.label}
  </button>
);

<QueryBuilder
  fields={fields}
  defaultQuery={query}
  controlElements={{ addRuleAction: AddRuleButton, lockRuleAction: null }}
/>;
```

### Bulk overrides

Two entries are _fallbacks_ rather than single controls:

- `actionElement` — the default for every button-type control (`addRuleAction`, `addGroupAction`,
  `cloneRuleAction`, `removeRuleAction`, `lockGroupAction`, …).
- `valueSelector` — the default for every `<select>`-type control (`fieldSelector`,
  `operatorSelector`, `combinatorSelector`, `valueSourceSelector`).

Replacing one of those swaps a whole family at once:

```tsx
controlElements={{ actionElement: MyButton, valueSelector: MyDropdown }}
```

### Resolution order

For each control, the first of these that is defined wins:

1. The specific entry on the component's own `controlElements` prop (`addRuleAction`).
2. The general entry on the component's own `controlElements` prop (`actionElement`).
3. The specific entry from `QueryBuilderContext`.
4. The general entry from `QueryBuilderContext`.
5. The package default.

`null` is a value, not an absence: it wins over anything further down the list and removes the
control.

### Not customizable

- **`ruleGroupHeaderElements` / `ruleGroupBodyElements`** are not ported. To restructure a group's
  header or body, replace the whole `ruleGroup` component.
- **A subquery's group header and body** render as bare `<div>`s rather than a `rule-group` element,
  matching React Query Builder, and are not customizable.
- **`dragHandle`** does not exist; drag and drop is a non-goal.

## Applying overrides to a subtree — `QueryBuilderContext`

`QueryBuilderContext` carries `controlElements`, `controlClassnames`, `translations`, and the
display flags. Solid 2 removed `.Provider`, so the context component is used directly:

```tsx
import { QueryBuilderContext, QueryBuilder } from 'solid-querybuilder';

const config = {
  controlElements: { actionElement: MyButton },
  controlClassnames: { queryBuilder: 'my-qb' },
  translations: { addRule: { label: '+ Rule' } },
  showNotToggle: true,
};

<QueryBuilderContext value={config}>
  <QueryBuilder fields={fields} defaultQuery={q1} />
  <QueryBuilder fields={fields} defaultQuery={q2} />
</QueryBuilderContext>;
```

Props always beat context (see the resolution order above). Contexts nest, and an inner one merges
over an outer one the same way.

## Writing a replacement component

Replacement components receive the same props React Query Builder's do, with the type substitutions
listed in
[`differences-from-react-querybuilder.md`](./differences-from-react-querybuilder.md#6-type-level-differences).
Two Solid-specific rules matter far more than the rest:

⚠️ **Never destructure `props`.** This severs reactivity silently and type-checks perfectly.

```tsx
// WRONG — `value` is read once, at setup, and never updates.
const MyEditor = ({ value, handleOnChange }: ValueEditorProps) => (
  <input value={value} onInput={e => handleOnChange(e.currentTarget.value)} />
);

// RIGHT — `props.value` is read through on every render of the expression.
const MyEditor = (props: ValueEditorProps) => (
  <input value={props.value} onInput={e => props.handleOnChange(e.currentTarget.value)} />
);
```

Use Solid 2's `merge` and `omit` where you would have reached for `splitProps`/`mergeProps`.

⚠️ **`merge` overrides a default with an explicit `undefined`.** Solid 1's `mergeProps` skipped
`undefined` values; Solid 2's `merge` does not. So this is a defaults-erasure bug waiting for a
caller that passes `title={undefined}`:

```tsx
const props = merge({ title: 'Default title' }, incoming); // title becomes undefined
```

A _missing_ key still falls through to the default — it is only an explicitly-passed `undefined`
that overrides. `merge` is also lazy (a getter object), not a snapshot. Where "skip undefined" is
what you want, filter the object explicitly or use core's `preferProp` / `preferFlagProps`, which is
what this package does internally.

Two smaller notes:

- `handleOnClick` takes a **DOM `MouseEvent`**, not a React synthetic event.
- Build class strings with core's `clsx`, not template interpolation, if you care about matching
  React Query Builder's output byte for byte.

## External control

Pass a `QueryManager` you own and drive the query from anywhere:

```tsx
import { QueryBuilder, QueryManager, formatQuery } from 'solid-querybuilder';
import { createSignal } from 'solid-js';

const manager = new QueryManager({ combinator: 'and', rules: [] }, { history: true });
const [query, setQuery] = createSignal(manager.getQuery());
manager.subscribe(() => setQuery(manager.getQuery()));

<>
  <QueryBuilder manager={manager} fields={fields} />
  <button disabled={!manager.canUndo()} onClick={() => manager.undo()}>
    Undo
  </button>
  <button onClick={() => manager.add(manager.createRule())}>Add rule</button>
  <pre>{formatQuery(query(), 'sql')}</pre>
</>;
```

The manager owns every write; the component subscribes. ⚠️ Hand the manager **plain objects** — it
deep-freezes its inputs with Immer, which rejects a Solid store proxy. If a query came out of a
Solid store, `snapshot()` it first.

Between the `manager` prop and the veto callbacks (`onAddRule`, `onAddGroup`, `onRemove`,
`onMoveRule`, `onMoveGroup`, `onGroupRule`, `onGroupGroup` — each of which can cancel or rewrite the
pending change), this replaces everything React Query Builder's Redux store was used for. See
[`differences-from-react-querybuilder.md`](./differences-from-react-querybuilder.md#3-state-management).
