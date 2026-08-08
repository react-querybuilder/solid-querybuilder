# solid-querybuilder Development Guide

**COMMUNICATION STYLE**: Be aggressively concise. Prioritize brevity over grammar.

## Project overview

The package `solid-querybuilder` is a Solid 1.x/2.x port of
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
└── examples/                      # demo (Vite) and a SolidStart SSR gate
```

Wiring strategy is **hybrid**: `QueryManager` owns every write (history, guards, `reconfigure`);
an internal `createStore` mirror (`reconcile`d by `id`) is the read path. See
`~/git/SOLID_QB_PLAN.md` for the full rationale and step-by-step plan; this file only records the
standing rules that apply to every step.

## Commands

- `bun install`
- `bun run build` — vite lib build (dom), then `tsc --jsx preserve` (source), then types, then css
- `bun run test` / `bun run test:coverage` — Vitest. **Never `bun test`**; that is Bun's builtin
  runner and bypasses Vitest entirely.
- `bun run conformance` — fetch fixtures, then run the DOM-parity suites
- `bun run test:ssr` — resolves the `solid` export condition and renders through
  `renderToStringAsync`; a real gate from step 1, superseded (but not replaced) by the SolidStart
  gate at step 8
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
that checks the export condition in isolation.

### The SSR smoke test runs one Solid instance

`scripts/ssr-smoke-entry.jsx` imports **both** `solid-js/web` and the library, and is loaded
through `vite.ssrLoadModule`. That is load-bearing: `ssr.noExternal` gives Vite's module graph its
own copy of `solid-js`, so importing `renderToStringAsync` in the host process instead would
render with a _different instance_ than the component was compiled against. Solid keeps
owner/`sharedConfig` state at module scope, so the copies do not share it — a trivial component
survives this, but anything using `createContext`/`createStore`/`createEffect` (i.e.
`QueryBuilder`, from step 4) does not.

Vite's `ssr.resolve.conditions` must be `['solid', 'node', 'development']`: `solid` so the library
resolves to its raw-JSX entry, **`node` so `solid-js/web` resolves to its server build**. Listing
`solid` alone clobbers Vite's defaults and hands back the browser build, whose
`renderToStringAsync` is a stub that throws. Never add `browser`.

The entry is `.jsx`, not `.tsx`, deliberately: it stays out of the typecheck project so
`bun run check` does not depend on `dist/` existing.

### Relative import specifiers

Must end `.js`, not `.ts`, in `src/`. `rewriteRelativeImportExtensions` is off, so `tsc` copies
specifiers into the emitted `.d.ts` verbatim. `check-dist-specifiers.ts` additionally allows a
`./foo.js` specifier in a `.d.ts` to resolve to a sibling `foo.d.ts` with no `foo.js` beside it (a
type-only module erased by the bundler), and allows `./foo.jsx` under `dist/source`.

### Reactivity

- **Never destructure props.** `splitProps`/`mergeProps` only. A destructure at the top of a
  component silently severs reactivity and passes every type check. This is the single most likely
  Solid-specific defect class — check it at review of every component.
- **`unwrap()` before handing anything to the manager.** The manager's Immer deep-freeze rejects a
  store proxy.
- **`unwrap()` the manager itself** before reading its history (`UndoRedoActions`).
  `QueryManager` keeps history in private class fields, which a `Proxy` cannot read through.
- Effects that write back into state use `createEffect(on([...explicit deps], ...))`, never a bare
  auto-tracking effect — the tracked set changing across branches is exactly the loop failure mode.
  Writes go through `untrack`, plus a re-entrancy flag.
- Return getter objects (not objects of accessors, not memoized fresh objects) from composables
  whose result is read once by a Solid context or passed as a prop.

### DOM parity

- Build class strings with core's `clsx` exclusively. Never template interpolation.
- Element order and conditional rendering are specified by React's `Rule.tsx` / `RuleGroup.tsx`.
  Read them as a spec, not as code to translate.
- `Label` is a plain function component, not a fragment-returning helper with stray whitespace.

### Types

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

Current gates (step 1): `fmt:check`, `build`, `check`, `check:exports`, `lint`, `test:coverage`
(global 80% lines — vacuous until step 3 adds real executable code in `src/reactive/`), `test:ssr`.
(`conformance` is a stub that exits 0 until step 6; it is not a gate yet.)

All five were proven red at step 1 and reverted: coverage (threshold to 99 + an injected
uncovered function), export-condition **order** (`import` moved first), export-condition
**target** (`solid` repointed at `dist/index.js`), the SSR **markup** assertion (component's label
dropped), and `check-dist-specifiers` (a directory import appended to `dist/index.d.ts`).

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

**Local only.** No `git init`, no GitHub remote. `.gitignore` and `.github/workflows/ci.yml` exist
so they are in place whenever the repo is initialized.
