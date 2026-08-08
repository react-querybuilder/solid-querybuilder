# Differences from React Query Builder

`solid-querybuilder` is a port, not a reimplementation. It is built on the same
`@react-querybuilder/core` that React Query Builder 8 is built on, and everything below is either a
deliberate divergence or a not-yet-ported feature. Nothing here is accidental.

## 1. Rendered output is identical

The port's defining constraint is full DOM parity with React Query Builder: tag name, document
order, `data-testid`, `data-path`, and byte-identical `class` attributes. The repo's conformance
suite asserts this against React Query Builder's own fixtures.

**Any DOM difference not documented on this page is a bug.** Please report it.

## 2. Not implemented

| Feature                                             | Status                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| Drag and drop                                       | Not ported. `data-dnd` is always `"disabled"`.                    |
| UI compatibility packages                           | Not ported (Bootstrap, MUI, AntD, Chakra, Fluent, Bulma, Tremor). |
| `expr` / `datetime` value editor UI                 | Not ported. The underlying query shapes still format correctly.   |
| Async option lists                                  | Not ported. `fields`/`values` must be resolved before rendering.  |
| Deprecated props                                    | Not ported; no legacy-prop fallbacks.                             |
| `ruleGroupHeaderElements` / `ruleGroupBodyElements` | Not ported.                                                       |
| `DragHandle` control                                | Absent from `Controls`, since it exists only for drag and drop.   |

`preserveQueryStateOnUnmount` is also absent — there is no global store whose state could survive an
unmount (see §3).

## 3. State management

React Query Builder keeps query state in a Redux store keyed by a `qbId`, and exposes
`useQueryBuilderQuery` / `dispatchQuery` for reading and writing it from outside the component tree.
None of that is ported: no Redux, no `qbId`, no `dispatchQuery`, and `Schema` carries neither.

The supported equivalent is core's `QueryManager`, passed in through the `manager` prop:

```tsx
import { QueryBuilder, QueryManager, formatQuery } from 'solid-querybuilder';
import { createSignal } from 'solid-js';

const manager = new QueryManager({ combinator: 'and', rules: [] }, { history: true });
const [query, setQuery] = createSignal(manager.getQuery());
manager.subscribe(() => setQuery(manager.getQuery()));

function App() {
  return (
    <>
      <QueryBuilder manager={manager} fields={fields} />
      <button onClick={() => manager.undo()}>Undo</button>
      <button onClick={() => manager.update('value', 'Steve', [0])}>Set rule 0</button>
      <pre>{formatQuery(query(), 'sql')}</pre>
    </>
  );
}
```

### The hybrid wiring, and what it means for you

Internally the port is **hybrid**: the `QueryManager` owns every write (history, guard callbacks,
`reconfigure`), and an internal Solid store — reconciled by `id` — is the read path.

The practical consequences:

- **Reads are fine-grained.** Editing one rule's value re-runs only the effects that read that
  value; sibling rules do not re-render. That is the whole reason for the store mirror.
- **Writes are not available to you at the store level.** The mirror is derived and read-only.
  Every mutation goes through the manager (or through the `actions` object the components receive),
  which is what keeps history, guards, and `onQueryChange` consistent.
- If you hand a query object to the manager yourself, hand it a plain object. The manager
  deep-freezes its inputs with Immer, and a Solid store proxy is rejected — inside the library this
  is handled by calling `snapshot()` before every manager write.

## 4. Query binding

Three ways to drive the query, as in React Query Builder:

| Prop                      | Mode                                               |
| ------------------------- | -------------------------------------------------- |
| `defaultQuery`            | Uncontrolled — the component owns the query.       |
| `query` + `onQueryChange` | Controlled.                                        |
| `manager`                 | External — a `QueryManager` instance that you own. |

⚠️ **Solid 2 defers writes, so a read immediately after a write returns the old value.** This is not
specific to effects: a plain signal read after its setter still sees the previous value until the
next microtask.

```tsx
setQuery(next);
console.log(query()); // still the PREVIOUS query
await Promise.resolve(); // or `flush()` from solid-js
console.log(query()); // now `next`
```

In tests, call `flush()`. Never paper over this with `setTimeout` or a fixed number of ticks.

## 5. Customization

`controlElements` works exactly as it does in React Query Builder — pass a component to replace any
control, or `null` to remove it. `QueryBuilderContext` provides `controlElements`,
`controlClassnames`, and `translations` to a subtree. See
[`customization.md`](./customization.md) for the full resolution order.

**There is no slot or snippet tier.** Svelte's port exposes snippets and Vue's exposes slots because
those are the idiomatic extension points in those frameworks. In Solid, a component _is_ the
idiomatic extension point, so `controlElements` is the only tier and there is nothing beneath it.

## 6. Type-level differences

| React Query Builder            | This port                             |
| ------------------------------ | ------------------------------------- |
| `ReactNode`                    | `LabelNode` (`JSX.Element \| string`) |
| `ComponentType<P>`             | Solid's `Component<P>`                |
| `JSX` from `react`             | `JSX` from `@solidjs/web`             |
| `React.MouseEvent`             | The DOM `MouseEvent`                  |
| `Schema.qbId`, `dispatchQuery` | Absent (see §3)                       |
| `Controls.dragHandle`          | Absent                                |
| `Controls.undoRedoActions`     | Non-nullable                          |
| `RuleProps.field`              | Absent; read it from `RuleProps.rule` |

`Schema` retains `enableDragAndDrop`, because it feeds the root element's `data-dnd` attribute — it
is always `"disabled"`.

`jsxImportSource` is `@solidjs/web`: `solid-js@2` owns no JSX namespace and no `jsx-runtime`.
Consumers writing replacement components need the same setting.

Generic parameters are defaulted (`QueryBuilderProps<RuleGroupType, FullField, FullOperator,
FullCombinator>`), and `QueryBuilderProps` is the same conditional type React Query Builder writes —
Solid components are plain functions with no compile-time prop enumeration, so there is no
non-conditional base interface.

`QueryBuilder` is generic over `RG`, `F`, `O`, and `C`; `Rule` and `RuleGroup` over `F` and `O`
(`RuleProps`/`RuleGroupProps` carry no `RG` parameter upstream either — the group type is fixed by
`RuleGroupTypeAny` on `RuleGroupProps.ruleGroup`). `SimpleQueryBuilderProps`,
`SimpleQueryBuilderPropsIC`, `SimpleRuleProps`, and `SimpleRuleGroupProps` are the
default-parameter aliases.

Two problems the Vue port had do **not** arise here, because a Solid component is a plain generic
function rather than a compiled single-file component: there is no compiler macro or `generic=`
attribute to declare the parameters, and the emitted props carry no `Record<string, unknown>` index
signature — so no component needs a `widenedProps` re-widening cast.

## 7. Reactivity

React Query Builder's hooks (`useQueryBuilder`, `useRule`, `useRuleGroup`, `useValueEditor`, …) are
not ported under those names. The Solid equivalents live in the `reactive/` layer and are exported:
`createQueryBuilderState`, `createRuleState`, `createRuleGroupState`, `createRuleActions`,
`createValueEditorReset`, and the `QueryBuilderContext` / `useQueryBuilderConfig` pair. The `create*`
naming disambiguates from core's own `createRule` / `createRuleGroup` / `createQueryActions`, which
this package re-exports.

React's `useMemo` graphs are largely unnecessary here: Solid tracks reads, so derived values are
plain getters and only recompute when something they read changes.

Effects are written as **split effects** — `createEffect(compute, apply)`, dependencies declared by
the compute phase and writes performed in the apply phase. Solid 2 removed `on()`; the split shape
enforces what `on()` used to be a convention for. `{ defer: true }` is still available and is used
where an effect must not fire on its initial run (the value-editor reset, chiefly).

Writes from an apply phase need no special treatment — the apply phase is unowned, so the
owned-write rule does not apply and `ownedWrite` is not needed anywhere in this port.

### If you write a replacement component

⚠️ **Never destructure `props`.** A destructure at the top of a Solid component severs reactivity
silently and passes every type check. Use Solid 2's `merge` / `omit`.

⚠️ **`merge` treats an explicit `undefined` as a real value** and will override a default with it,
unlike Solid 1's `mergeProps`. `merge(defaults, props)` is therefore a latent defaults-erasure bug
whenever a caller passes `foo={undefined}` explicitly. A _missing_ key still falls through. Where
"skip undefined" is what you want, filter explicitly or use core's `preferProp` / `preferFlagProps`.

## 8. Known behavioral notes

- **The Solid 2 peer is a beta.** `solid-js` and `@solidjs/web` are pinned to `^2.0.0-beta.32`.
  Breaking changes in the Solid 2 line before its final release may require a patch here.
- **There is no SolidStart gate.** The original plan called for a SolidStart 2.0 example as this
  repo's SSR gate. `@solidjs/start@2.0.0` — despite the major version, and despite being the
  `latest` tag — depends on `solid-js@^1.9.14` and is a **Solid 1** framework release; there is no
  Solid-2 line on any dist-tag. Installing it would drag Solid 1 into the workspace.

  The replacement is `examples/ssr`, a hand-rolled Vite SSR consumer. It preserves the three
  properties that mattered: it consumes the published `dist` through the real `exports` map, it
  renders through `renderToString` in a real Vite SSR build with `vite-plugin-solid` compiling for
  `generate: 'ssr'`, and it hydrates so mismatches are observable rather than inferred.

  **What is lost, and is a known gap rather than a solved problem:** no router, no server functions,
  no meta-framework build pipeline, and therefore no evidence about how this package behaves under
  one. The server-side `formatQuery` call is a plain call in the SSR entry rather than a server
  function or API route — weaker, though it still proves core's formatter runs server-side with no
  DOM globals.

  **Promotion path:** when a Solid-2 SolidStart ships, `examples/ssr` is replaced by it. Tracked as
  a post-`0.1.0` item; `0.1.0` is not held for it.

- **Hydration requires the hydration script.** As with any hand-rolled Solid SSR setup, the document
  must include `generateHydrationScript()` output. SolidStart would do this for you.
