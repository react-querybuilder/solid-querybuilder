# solid-querybuilder Development Guide

**COMMUNICATION STYLE**: Be aggressively concise. Prioritize brevity over grammar.

## Project overview

The package `solid-querybuilder` is a **Solid 2.0** port of
[React Query Builder](https://react-querybuilder.js.org), built on the published
`@react-querybuilder/core`. The port's defining constraint is **full DOM parity**: tag name,
document order, `data-testid`, `data-path`, and byte-identical `class` attributes must match
React Query Builder's output for all conformance cases.

Blueprints: `svelte-querybuilder@0.1.1` (Phase 1) and `@react-querybuilder/vue@0.2.0` (Phase 2).
Deviate only where Solid idiom demands.

```
solid-querybuilder/
├── packages/solid-querybuilder/   # the library
│   ├── src/                       # components, reactive layer, types, styles
│   ├── test/conformance/          # DOM-parity harness (fixtures gitignored)
│   └── scripts/                   # build/check/ssr-smoke helpers
└── examples/                      # demo (Vite) and an SSR gate
```

**Target is Solid 2 only.** Peers are `solid-js@^2.0.0-beta.32` **and
`@solidjs/web@^2.0.0-beta.32`** — in Solid 2 the DOM runtime is its own package. There is no
`^1.9` leg anywhere: in the manifest, in CI, or in the source. A v1-target port, if it ever
happens, is a separate repo publishing as `@react-querybuilder/solid1`; do not add compatibility
shims or `solid-js@1` code paths here.

Wiring strategy is **hybrid**: `QueryManager` owns every write (history, guards, `reconfigure`);
an internal store mirror (`reconcile`d by `id`) is the read path. See
`~/git/SOLID_QB_PLAN.md` for the full rationale and step-by-step plan; this file only records the
standing rules that apply to every step.

## Commands

- `bun install`
- `bun run build` — vite lib build (dom), then `tsc --jsx preserve` (source), then types, then css
- `bun run test` / `bun run test:coverage` — Vitest. **Never `bun test`**; that is Bun's builtin
  runner and bypasses Vitest entirely.
- `bun run conformance` — fetch fixtures, then run the DOM-parity suites
- `bun run check:versions` — asserts the resolved prerelease toolchain has not drifted; runs
  first in CI
- `bun run test:ssr` — resolves the `solid` export condition and renders through
  `renderToString`; a real gate from step 1, superseded (but not replaced) by the SSR gate at
  step 8
- `bun run check` — `tsc --noEmit`
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

Keep the script even after step 8 supersedes it with the SolidStart gate; it is the only thing
that checks the export condition in isolation. (There is no Solid 2 SolidStart yet — step 8's
gate is a plain Vite SSR example — but the export condition is what that gate rests on either
way.)

### The SSR smoke test runs one Solid instance

`scripts/ssr-smoke-entry.jsx` imports **both** `@solidjs/web` and the library, and is loaded
through `vite.ssrLoadModule`. That is load-bearing: `ssr.noExternal` gives Vite's module graph its
own copy of `solid-js`, so importing `renderToString` in the host process instead would render
with a _different instance_ than the component was compiled against. Solid keeps
owner/`sharedConfig` state at module scope, so the copies do not share it — a trivial component
survives this, but anything using `createContext`/`createStore`/`createEffect` (i.e.
`QueryBuilder`, from step 4) does not.

**Conditions are the plugin's job now, not the config's.** `vite-plugin-solid@3` gives the ssr
environment `['solid', 'development', 'module', 'node', 'development|production']` on its own, so
the script sets **no** `ssr.resolve.conditions`. Hand-maintaining a list on top of that only
_removes_ entries. The failure it guards against is unchanged: `@solidjs/web`'s exports map lists
`browser` **before** `node`, so any condition set carrying `browser` hands back the browser build,
whose `renderToString` is a stub. Never add `browser`.

The entry is `.jsx`, not `.tsx`, deliberately: it stays out of the typecheck project so
`bun run check` does not depend on `dist/` existing.

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
- **Apply-phase writes are legal — no `ownedWrite` needed** (proven at step 1.5). The owned-write
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
  callback) by bumping a version signal from that callback and reading the signal in `fn` — proven
  at step 1.5, and it is what `createQueryBuilderState` uses (step 3).
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
  (member quietly re-added) errors as `TS2578`. Both directions proven at step 2.
- **TypeScript is pinned to `^5.9`.** Neither `vite-plugin-solid`'s babel preset nor the
  declaration pipeline is validated against TypeScript 7.

## Gates

**Standing rule: every gate must be proven to fail.** When a step adds a gate, deliberately break
it, record that it went red, then revert. A gate that cannot fail is worse than none.

Current gates (step 3): `check:versions`, `fmt:check`, `build`, `check`, `check:exports`,
`lint`, `test:coverage` (global 80% lines, plus a per-directory 90% lines on
`packages/*/src/reactive/**` — both now non-vacuous, and both proved red at step 3 with no
injected dead code), `test:ssr`. (`conformance` is a stub that exits 0 until step 6; it is not a
gate yet.)

All five were proven red at step 1 and reverted: coverage (threshold to 99 + an injected
uncovered function), export-condition **order** (`import` moved first), export-condition
**target** (`solid` repointed at `dist/index.js`), the SSR **markup** assertion (component's label
dropped), and `check-dist-specifiers` (a directory import appended to `dist/index.d.ts`).

**Four of the five were re-proved red on the Solid 2 toolchain at step 1.5** — a gate proved red
under Solid 1 is not evidence about Solid 2, since the plugin, the resolver behavior and the SSR
renderer all changed. Coverage, condition **order** (both layers fired), condition **target**, and
SSR **markup** under the new synchronous `renderToString`. `check-dist-specifiers` is unaffected by
the runtime swap; it was re-run against the rebuilt `dist` instead.

⚠️ Two assertion shapes that look like gates but are not, both found and removed in review — do
not reintroduce them:

- Checking `exports['.'].solid` by key lookup instead of by position. Order is the bug; presence
  is not.
- Scanning `dist/index.js` for ssr-only specifiers to prove the dom and ssr builds differ.
  `dist/index.js` is a pure re-export barrel with no runtime code, so the check can never fire.
  Build distinctness is now covered properly by the two Node resolutions in `test:ssr`.

⚠️ Coverage-gate proof caveat: with `src/index.ts` a pure `export *`, v8 reports `0/0` and the
threshold passes vacuously. The step-1 proof must also inject an uncovered multi-line function
body to demonstrate the gate is live; non-vacuity is re-confirmed for real at step 3.

## Coverage

Coverage is configured in the **root** `vitest.config.ts` only. A `coverage` block in the
package's `vite.config.ts` is silently ignored when the suite runs through `test.projects`, which
is how CI runs it.

## Generated / fetched files

- `packages/solid-querybuilder/test/fixtures/` — downloaded by `scripts/fetch-fixtures.ts` (added
  at step 6), gitignored. A fresh clone must pass `bun run test` without them.

## Repo status

**Remote-less.** The repo is a local git repo with no GitHub remote and nothing pushed.
`.github/workflows/ci.yml` exists so it is in place whenever a remote is added.
