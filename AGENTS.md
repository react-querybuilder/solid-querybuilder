# solid-querybuilder Development Guide

**COMMUNICATION STYLE**: Be aggressively concise. Prioritize brevity over grammar.

## Project overview

The package `solid-querybuilder` is a **Solid 2.0** port of
[React Query Builder](https://react-querybuilder.js.org), built on the published
`@react-querybuilder/core`. The port's defining constraint is **full DOM parity**: tag name,
document order, `data-testid`, `data-path`, and byte-identical `class` attributes must match
React Query Builder's output for all conformance cases.

Blueprints: `svelte-querybuilder@0.1.1` and `@react-querybuilder/vue@0.2.0`.
Deviate only where Solid idiom demands.

```
solid-querybuilder/
├── packages/solid-querybuilder/   # the library
│   ├── src/                       # components, reactive layer, types, styles
│   ├── test/conformance/          # DOM-parity harness (fixtures gitignored)
│   └── scripts/                   # build/check/ssr-smoke helpers
└── examples/
    ├── demo/                      # Vite + Solid 2, aliased to the library's src
    └── ssr/                       # hand-rolled Vite SSR consumer; the SSR gate
```

**Target is Solid 2 only.** Peers are `solid-js@^2.0.0-rc.0` **and
`@solidjs/web@^2.0.0-rc.0`** — in Solid 2 the DOM runtime is its own package. There is no
`^1.9` leg anywhere: in the manifest, in CI, or in the source. A v1-target port, if it ever
happens, is a separate repo publishing as `@react-querybuilder/solid1`; do not add compatibility
shims or `solid-js@1` code paths here.

Wiring strategy is **hybrid**: `QueryManager` owns every write (history, guards, `reconfigure`);
an internal store mirror (`reconcile`d by `id`) is the read path. See
`~/git/SOLID_QB_PLAN.md` for the full rationale; this file only records the standing rules.

## Commands

- `bun install`
- `bun run build` — vite lib build (dom), then `tsc --jsx preserve` (source), then types, then css
- `bun run test` / `bun run test:coverage` — Vitest. **Never `bun test`**; that is Bun's builtin
  runner and bypasses Vitest entirely.
- `bun run conformance` — fetch fixtures, then run the DOM-parity suites
- `bun run check:versions` — asserts the resolved prerelease toolchain has not drifted; runs
  first in CI
- `bun run test:ssr` — **two halves, in sequence.** First `packages/solid-querybuilder`'s
  `scripts/ssr-smoke.ts` (export-condition order in isolation, plus a markup assertion). Then
  `examples/ssr`'s `ssr-smoke-test.ts` (builds the example against the published `dist`, serves
  it, asserts status + markup, then hydrates in jsdom). The second **supersedes but does not
  replace** the first — keep both; only the first checks the export condition in isolation.
- `bun run check` — `tsc --noEmit`, then `check:examples`, which fans the same out to
  `@solid-querybuilder/example-*` so an example type error breaks CI
- `bun run lint`, `bun run fmt`, `bun run fmt:check`
- `bun run check:all` — everything CI runs

## Authoring constraints

### The Solid export condition

`exports['.']` is the Solid triple: `solid` (raw JSX, resolved first) → `types` → `import`
(dom-compiled fallback). **`"solid"` must come first** in the conditions object — Node picks the
_first_ matching key, so a `solid` entry that merely exists but sits after `import` is silently
dead. A consumer's `vite-plugin-solid` (or SolidStart) resolves it and compiles the raw JSX for
its own target (`dom` in the browser, `ssr` on the server). Getting the order wrong ships a
package that renders fine in the browser and silently breaks SSR/hydration.

`scripts/ssr-smoke.ts` is the gate, and it checks order two ways: a literal
`Object.keys(exports['.'])[0] === 'solid'` assertion, and Node's real resolver invoked twice
(`--conditions=solid` must give `dist/source/index.jsx`, no conditions must give `dist/index.js`).
A key _lookup_ (`exports['.'].solid`) is order-blind and does not gate anything — do not
regress it back to that.

Keep the script even though the SolidStart gate would supersede it; it is the only thing
that checks the export condition in isolation. (There is no Solid 2 SolidStart yet — the
example's gate is a plain Vite SSR example — but the export condition is what that gate rests on
either way.)

### The SSR smoke test runs one Solid instance

`scripts/ssr-smoke-entry.jsx` imports **both** `@solidjs/web` and the library, and is loaded
through `vite.ssrLoadModule`. That is load-bearing: `ssr.noExternal` gives Vite's module graph its
own copy of `solid-js`, so importing `renderToString` in the host process instead would render
with a _different instance_ than the component was compiled against. Solid keeps
owner/`sharedConfig` state at module scope, so the copies do not share it — a trivial component
survives this, but anything using `createContext`/`createStore`/`createEffect` (i.e.
`QueryBuilder`) does not.

**Conditions are the plugin's job now, not the config's.** `vite-plugin-solid@3` gives the ssr
environment `['solid', 'development', 'module', 'node', 'development|production']` on its own, so
the script sets **no** `ssr.resolve.conditions`. Hand-maintaining a list on top of that only
_removes_ entries. The failure it guards against is unchanged: `@solidjs/web`'s exports map lists
`browser` **before** `node`, so any condition set carrying `browser` hands back the browser build,
whose `renderToString` is a stub. Never add `browser`.

The entry is `.jsx`, not `.tsx`, deliberately: it stays out of the typecheck project so
`bun run check` does not depend on `dist/` existing.

### The examples

`examples/demo` aliases the library's **source**, `examples/ssr` consumes the built **`dist`** by
workspace specifier. That split is deliberate: the demo gives HMR without a build, and the SSR
example is the only thing in the repo that exercises the publishable artifact end to end.

- **Demo alias order matters.** The `solid-querybuilder/dist/*.css` alias must come **before** the
  bare-specifier alias in the `resolve.alias` array, or the bare specifier rewrites first and the
  CSS path is swallowed **[Vue hindsight]**.
- **`examples/ssr` bundles the library into the server output** (`ssr.noExternal`). Node has no
  `solid` condition, so an externalized `solid-querybuilder` would resolve through `import` to the
  dom-compiled bundle and render nothing server-side.
- **The SSR server is started programmatically on an ephemeral port, never by spawning a CLI.** A
  spawned preview leaves an orphan holding the port and serving a stale build, silently poisoning
  the next run.
- **The hydration half runs both scripts in-process, not in jsdom.** `runScripts: 'dangerously'` is
  a dead end: jsdom's vm global trips Bun with "Proxy is not allowed in the global prototype
  chain", and it cannot execute the `type="module"` client bundle anyway. The inline
  `generateHydrationScript()` output runs through `new Function` (it assigns `_$HY` unqualified, so
  a sloppy-mode body lands it on `globalThis` — do not "fix" that by copying `window._$HY` over it,
  which overwrites it with `undefined`), and the client bundle runs through `import()` against
  jsdom's globals.
- **`generateHydrationScript()` must be in the document.** Without it the client entry dies on
  `_$HY.done` before it can report a mismatch, and the hydration gate passes vacuously.

### The barrel re-exports core at runtime

`src/index.tsx` does `export * from '@react-querybuilder/core'`, not just `export type *`. A
consumer calls `formatQuery` from `solid-querybuilder` and never depends on core directly, exactly
as React Query Builder's own barrel works. `examples/ssr` is what proved a gap here in review.

### Relative import specifiers

Must end `.js`, not `.ts`, in `src/`. `rewriteRelativeImportExtensions` is off, so `tsc` copies
specifiers into the emitted `.d.ts` verbatim. `check-dist-specifiers.ts` additionally allows a
`./foo.js` specifier in a `.d.ts` to resolve to a sibling `foo.d.ts` with no `foo.js` beside it (a
type-only module erased by the bundler), and allows `./foo.jsx` under `dist/source`.

### Reactivity (Solid 2)

- **Never destructure props.** `merge`/`omit` only — Solid 2's replacements for
  `mergeProps`/`splitProps`. A destructure at the top of a component silently severs reactivity
  and passes every type check. This is the single most likely Solid-specific defect class — check
  it at review of every component.
- ⚠️ **`merge` treats an explicit `undefined` as a real value** and overrides with it, where 1.x's
  `mergeProps` skipped it. Every `merge(defaults, props)` is therefore a latent defaults-erasure
  bug. A _missing_ key still falls through. Where "skip undefined" is wanted, filter explicitly,
  or prefer core's `preferProp`/`preferFlagProps`. `merge` is lazy (getters), not a snapshot.
- **`snapshot()` — not `unwrap()` — before handing anything to the manager.** The manager's Immer
  deep-freeze rejects a store proxy. Likewise `snapshot()` the manager itself before reading its
  history (`UndoRedoActions`): `QueryManager` keeps history in private class fields, which a
  `Proxy` cannot read through.
- **Split effects, not `on()`.** `on()` is gone; `createEffect(compute, apply)` makes the compute
  phase the dependency declaration, so the old "always use `on`" rule is now enforced by the API
  shape. Deps in compute, writes in apply. `{ defer: true }` survives as an option.
- **Apply-phase writes are legal — no `ownedWrite` needed.** The owned-write
  rule rejects writes made while an owner is on the stack, and the apply phase is unowned. Note
  `ownedWrite` is a **signal** option, not an effect option; `createEffect` has no such option.
- ⚠️ **The body of `createRoot(fn)` IS an owned scope.** A write there throws
  `REACTIVE_WRITE_IN_OWNED_SCOPE`. Test harnesses must set up inside the root and write from
  outside it.
- ⚠️ **A split effect's apply callback must return a cleanup function or `undefined`.** `v =>
setX(v)` returns the setter's return value and throws "invalid cleanup value". Use a block body.
- ⚠️ **An uncaught error inside an effect halts the entire reactive system** (`REACTIVITY_HALTED`)
  for the rest of the module. Intentionally-throwing tests need their own file.
- **`batch` is gone; reads lag writes.** Not just effects — a plain `signal()` read after
  `setSignal()` still returns the _old_ value until the next microtask or an explicit `flush()`.
  Every write-then-read must `flush()` first. Never paper over this with `setTimeout` or tick
  counts. `@solidjs/testing-library`'s `render` populates the container synchronously; subsequent
  updates need `flush()`.
- Return getter objects (not objects of accessors, not memoized fresh objects) from composables
  whose result is read once by a Solid context or passed as a prop.
- **There is no `onMount`.** Solid 2 does not export one. The post-commit-mount equivalent is
  `createEffect(() => undefined, () => { … })`: a constant compute phase runs the apply phase once,
  after render, and never under SSR — which is what React's mount `useEffect` does.
- **`useContext` needs an owner, default or not.** An explicit context default makes a read outside
  a _provider_ safe, but Solid 2 still throws `Context can only be accessed under a reactive root`
  with no owner on the stack. A hook that must be safe outside a component needs a `getOwner()`
  guard in addition to the default (`useQueryBuilderConfig` has one).

### Store mirror

`createStore` and `reconcile` are exported from **`solid-js`** now, not `solid-js/store`.

- `reconcile(value, key?)` — `key` is the **2nd positional argument** and defaults to `'id'`,
  which is exactly what this port needs. The 1.x `{ key, merge }` options object is not the 2.0
  shape and throws.
- `createProjection(fn, seed, options?)` is a derived, **read-only** store with the same `'id'`
  default key. It can be driven from a non-reactive external source (the manager's subscribe
  callback) by bumping a version signal from that callback and reading the signal in `fn`; this is
  what `createQueryBuilderState` uses.
- `createStore`'s setter takes a **draft callback** (`setStore(draft => { draft.x = … })`). There is
  no 1.x `setStore('key', value)` path-argument form; it throws `fn is not a function`.

### The manager's deep freeze is path-dependent

`snapshot()` before every manager write — but a test that asserts this needs two details right, or
it passes whether or not the `snapshot()` is there:

- `createStore` **declines to proxy an already-frozen object**, so a fixture that has been through a
  manager earlier in the same file is stored raw and there is no proxy to reject. Use a fresh
  object.
- Immer only sees the proxy when the manager does **not** re-prepare the input. A query whose rules
  have **no `id`** is re-prepared into plain objects and never throws; the same query **with `id`s**
  throws `'ownKeys' on proxy: trap result did not include 'v'`. Always give store fixtures explicit
  `id`s.

### DOM parity

- Build class strings with core's `clsx` exclusively. Never template interpolation.
- Element order and conditional rendering are specified by React's `Rule.tsx` / `RuleGroup.tsx`.
  Read them as a spec, not as code to translate.
- `Label` is a plain function component, not a fragment-returning helper with stray whitespace.
- **`defaultControlElements` is an object of getters, deliberately.** `Rule` → `RuleSubQuery` →
  `defaultControlElements` → `Rule` is a real import cycle (a subquery builds its own state, which
  needs the default controls). Eager entries throw a TDZ `ReferenceError` whenever `Rule.tsx` is
  the module the cycle is entered through. Do not "simplify" them back to plain properties.
- A subquery renders **bare `<div>`s** for its group header/body, not a `rule-group` element
  (React's `RuleWithSubQueryGroupComponentsWrapper`), and it is not customizable.

### The conformance harness

`vitest.conformance.config.ts` runs **two projects**, because the two fixture layers demand
opposite render modes. This is structural, not cosmetic — one plugin instance cannot serve both.

| Project           | Compilation                            | Environment | Renders                                                                                 |
| ----------------- | -------------------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| `conformance-ssr` | `generate: 'ssr'`, `hydratable: false` | `node`      | `renderToString`, controlled `query` — the **static** layer                             |
| `conformance-dom` | default `dom`                          | `jsdom`     | testing-library + `flush()`, **uncontrolled** `defaultQuery` — the **post-flush** layer |

- **The static layer is rendered server-side deliberately.** The fixtures come from
  `renderToStaticMarkup` with no effects run; Solid's client `render()` runs effects, so the
  "extract before the scheduler flushes" trick both prior ports used is unavailable. SSR runs no
  effects at all, so this is an _exact_ match rather than an approximation — and it exercises the
  ssr path in all 50 cases for free.
- ⚠️ **`solid({ ssr: true, … })` on the ssr project is load-bearing** and is _not_ redundant with
  `solid: { generate: 'ssr' }`. `vite-plugin-solid@3` injects a `browser` condition in test mode
  (`isTestMode && !options.ssr`), `@solidjs/web` lists `browser` before `node`, and the browser
  build's `renderToString` is a stub returning `undefined`. `ssr: true` suppresses the injection
  (and the plugin's forced `environment: 'jsdom'`); `options.solid` merges last, so the explicit
  `generate`/`hydratable` still win. Do **not** "fix" this by hand-writing `resolve.conditions`.
- **`hydratable: false`** — hydration keys land as _attributes_ and would break byte-identical
  `class` comparison. (Marker comments are ignored by extraction; attributes are not.)
- **`cases.ts` carries no rendering.** The render helpers are split into `render-ssr.tsx` and
  `render-dom.tsx` so the ssr project never imports `@solidjs/testing-library` and vice versa.
- **`scenarios.tsx`, not `.ts`** — `getValueEditorSeparator` returns JSX, which each project must
  compile for its own target.
- ⚠️ **`actions.solid.test.ts` must `flush()` once after `createRoot` before replaying.** Effects
  created inside a root are queued, not run eagerly, so the controlled-`query` sync effect's first
  run otherwise lands on the flush _after_ the first op and silently reverts it. Found the hard
  way: 4 of 19 cases failed with the ops apparently never applied.
- `extract.ts` exposes both `extractFromContainer` and `extractFromMarkup` (upstream's
  `schemaVersion` 2 split). The markup form builds its own `JSDOM` when there is no global
  `DOMParser`, which is what lets the ssr project run in the `node` environment and thereby prove
  a server render needs no document.

### Types

- **`jsxImportSource` is `"@solidjs/web"`.** `solid-js@2` owns no JSX namespace and no
  `jsx-runtime`. `JSX` and `ComponentProps` import from `@solidjs/web`; `Component` stays on
  `solid-js`.
- `ReactNode` → `LabelNode` (`JSX.Element | string`); titles stay `string`.
- `ComponentType<P>` → Solid's `Component<P>`.
- Use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- `ReactMouseEvent` → the DOM `MouseEvent`.
- `QueryBuilderProps` stays the **conditional type React writes**. Solid components are plain
  functions with no compile-time prop enumeration, so there is no `QueryBuilderPropsBase`, no
  `RuleTypeOf<RG>` helper, and no re-widening cast inside components (all of which Vue needed).
- `src/types/types.test-d.ts` is compiled by `tsc` (`bun run check`), **not** run by Vitest. It is
  a **two-sided** gate: a failed assertion errors, and an `@ts-expect-error` that stops erroring
  (member quietly re-added) errors as `TS2578`. Both directions are proven.
- **TypeScript is pinned to `^5.9`.** Neither `vite-plugin-solid`'s babel preset nor the
  declaration pipeline is validated against TypeScript 7.

## Gates

**Standing rule: every gate must be proven to fail.** When a gate is added, deliberately break
it, record that it went red, then revert. A gate that cannot fail is worse than none.

Current gates: `check:versions`, `fmt:check`, `build`, `check`, `check:exports`,
`lint`, `test:coverage` (global 80% lines, plus a per-directory 90% lines on `packages/*/src/**`,
which subsumes the narrower `packages/*/src/reactive/**` key; both
non-vacuous, both proved red with no injected dead code), **`conformance`** (237 assertions: 50
static classnames, 50 accessible descriptions, 50 post-flush classnames, 58 action sequences, 19
port-side action sequences, plus alignment/drift/format), `test:ssr` (**both halves**), and
`check` including the examples.

The a11y gate was proved red and reverted: deleting the `title` binding from
`ValueSelector.tsx` turned **all nine** axe cases red on the **WCAG** assertion (`select-name`, a
level-A violation, not merely a best-practice one) while all three keyboard tests stayed green.
Note the best-practice assertion is an **equality** check against `['label-title-only']`, not a
suppression — RQB labels selectors and text editors with `title` alone and DOM parity is locked, so
that one rule is accepted (recorded under "Known limitations" in `CHANGELOG.md`) while any _other_
best-practice regression still fails.

The four conformance gates were each proved red and reverted:

1. **DOM parity** — ` conformance-gate-probe` appended to `ActionElement.tsx`'s class turned
   exactly 100 cases red (50 static + 50 post-flush), which is the split the two projects promise.
2. **`schemaVersion`** — `EXPECTED_SCHEMA_VERSION = 3` made `conformance:fetch` exit 1 with the
   "update `test/conformance` before bumping the tag" message.
3. **Scenario drift** — renaming the local `allControls` scenario turned the drift test (and the
   three case-alignment tests) red while all 50 rendered cases stayed green.
4. **Value-editor reset** — an early `return` in `createValueEditorReset`'s apply phase left
   conformance at 237/237 green (as upstream predicts: every case is `differsFromStatic: false`)
   while turning 5 of the 9 post-mount unit assertions red. That asymmetry is exactly why this one
   cannot be proved through the post-flush fixture alone.

Separately confirmed: with `test/fixtures/` removed, `bun run test` still passes 284/284 and
`conformance:test` fails with the actionable "run `bun run conformance:fetch`" message rather than
an opaque parse error.

The example gate was proved red twice, independently, and reverted both times:
`document.title` injected into `QueryBuilder.tsx` turned the served response into a 500 and took
19 assertions with it; a one-attribute divergence in `examples/ssr/src/entry-client.tsx` turned the
hydration surface comparison red while every markup assertion stayed green. Those two failure
modes share no code, which is the point of having both.

All five were proven red once and reverted: coverage (threshold to 99 + an injected
uncovered function), export-condition **order** (`import` moved first), export-condition
**target** (`solid` repointed at `dist/index.js`), the SSR **markup** assertion (component's label
dropped), and `check-dist-specifiers` (a directory import appended to `dist/index.d.ts`).

**Four of the five were re-proved red on the Solid 2 toolchain** — a gate proved red
under Solid 1 is not evidence about Solid 2, since the plugin, the resolver behavior and the SSR
renderer all changed. Coverage, condition **order** (both layers fired), condition **target**, and
SSR **markup** under the synchronous `renderToString`. `check-dist-specifiers` is unaffected by
the runtime swap; it was re-run against the rebuilt `dist` instead.

⚠️ Two assertion shapes that look like gates but are not, both found and removed in review — do
not reintroduce them:

- Checking `exports['.'].solid` by key lookup instead of by position. Order is the bug; presence
  is not.
- Scanning `dist/index.js` for ssr-only specifiers to prove the dom and ssr builds differ.
  `dist/index.js` is a pure re-export barrel with no runtime code, so the check can never fire.
  Build distinctness is now covered properly by the two Node resolutions in `test:ssr`.

⚠️ Coverage-gate proof caveat: with `src/index.ts` a pure `export *`, v8 reports `0/0` and the
threshold passes vacuously. The proof must also inject an uncovered multi-line function
body to demonstrate the gate is live; non-vacuity is re-confirmed against real reactive-layer code.

## Coverage

Coverage is configured in the **root** `vitest.config.ts` only. A `coverage` block in the
package's `vite.config.ts` is silently ignored when the suite runs through `test.projects`, which
is how CI runs it.

## Generated / fetched files

- `packages/solid-querybuilder/test/fixtures/` — downloaded by `scripts/fetch-fixtures.ts`,
  gitignored. A fresh clone must pass `bun run test` without them.

## Repo status

**Remote-less.** The repo is a local git repo with no GitHub remote and nothing pushed.
`.github/workflows/ci.yml` exists so it is in place whenever a remote is added.
