# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Retargeted the port to Solid 2.0 exclusively.** `peerDependencies` is now
  `solid-js@^2.0.0-beta.32` **and `@solidjs/web@^2.0.0-beta.32`** — in Solid 2 the DOM runtime is
  its own package. The `^1.9` peer leg and the non-gating `solid-next` CI job are both gone; CI is
  a single gating job on the pinned beta, preceded by a `check:versions` step that asserts the
  resolved prerelease toolchain has not drifted. `jsxImportSource` is now `@solidjs/web`, and the
  SSR smoke test renders through Solid 2's synchronous `renderToString`. The `exports` map is
  unchanged. A v1-target port, should demand warrant one, will be a separate repo publishing as
  `@react-querybuilder/solid1`; this package will not carry `solid-js@1` compatibility shims.
- `0.1.0` still publishes to the `latest` dist-tag. The prerelease peer is documented here and in
  `README.md` rather than encoded in the version.

### Added

- Repo bootstrap: Bun workspaces, root tooling config (`oxfmt`, `oxlint`, `.editorconfig`,
  `.npmrc`), root `vitest.config.ts` with `v8` coverage (80% lines), and CI.
- `packages/solid-querybuilder` scaffold: the Solid triple `exports` map (`solid` → `types` →
  `import`), build pipeline (`vite build` dom bundle, `tsc --jsx preserve` source bundle, types,
  css), `check:exports` specifier guard, and `scripts/ssr-smoke.ts` as a real gate from day one —
  it asserts the `solid` condition is **first** in the exports map and confirms that with Node's
  real resolver run with and without `--conditions=solid`, then renders through Vite's SSR
  pipeline inside a single Solid instance and asserts the exact markup.
- `examples/demo` — a Vite + Solid 2 playground aliased to the library's **source** (HMR without a
  build). Eight fields covering all seven value editors, two separately bound queries
  (`RuleGroupType` and `RuleGroupTypeIC`) behind an independent-combinators toggle that swaps query
  _shapes_, every display flag, undo/redo, and live `formatQuery` in `sql`/`json`/`mongodb`/`cel`.
- `examples/ssr` — a hand-rolled Vite SSR consumer that depends on `solid-querybuilder` by
  workspace specifier, so it exercises the publishable `dist` through the real `exports` map. It
  server-renders a nested independent-combinators query with `renderToString`, passes one control
  through `controlElements`, prints a server-side `formatQuery` result into the markup, and
  hydrates on the client.
- `examples/ssr/ssr-smoke-test.ts`, wired into root `test:ssr` after (not instead of)
  `scripts/ssr-smoke.ts`. It builds both bundles, serves them programmatically on an ephemeral
  port, asserts the status code **and** 20 markup claims, then loads the served page into jsdom,
  runs the client entry, and asserts hydration produced no errors and left the conformance surface
  unchanged.
- Root `check` now fans out to `@solid-querybuilder/example-*`, so an example type error breaks CI.
- `README.md` gains a prominent "Requires Solid 2.0" note, documentation links, and an examples
  section; new `docs/differences-from-react-querybuilder.md`, `docs/styling.md`, and
  `docs/customization.md`.
- Accessibility suite (`src/components/a11y.test.tsx`): `vitest-axe` over all eight conformance
  scenarios plus an all-controls independent-combinator case (nine cases), each asserted twice —
  WCAG 2.0/2.1 A+AA must be empty, and best-practice must equal exactly `['label-title-only']`, so
  any _other_ best-practice regression still fails. Plus keyboard tests: tab order through a rule
  row, Enter/Space activation, and the not-toggle label association. It imports
  `test/conformance/{scenarios,queries}` rather than duplicating them, so a11y is asserted against
  exactly the prop combinations DOM parity is, and it still runs in a fresh clone (both modules are
  fixture-independent).

### Known limitations

- **`label-title-only` (axe best-practice) fires on every selector and text editor.** React Query
  Builder labels these controls with `title` alone, and full DOM parity is a locked decision for
  this port, so adding `aria-label` would break the conformance harness. It is not a WCAG failure:
  `title` produces an accessible name, and the level-A `label`/`aria-*` rules pass across all nine
  a11y cases. Consumers who need a visible label can supply one through `controlElements`.

### Fixed

- `src/index.tsx` re-exports `@react-querybuilder/core` **at runtime**, not just at the type level.
  Step 3 called for this and it was never landed; `examples/ssr` found it by failing to build on
  `import { formatQuery } from 'solid-querybuilder'`. Consumers can now use core's formatters,
  defaults, and `QueryManager` without depending on core directly, as React Query Builder's own
  barrel allows.

### Changed (divergences from React Query Builder)

Authoritative list: [`docs/differences-from-react-querybuilder.md`](./docs/differences-from-react-querybuilder.md).

- **No SolidStart SSR gate.** `@solidjs/start@2.0.0` is a Solid **1** release (it depends on
  `solid-js@^1.9.14`) and there is no Solid-2 line on any dist-tag, so the planned SolidStart
  example is replaced by `examples/ssr`. Known gap: no router, no server functions, no
  meta-framework build pipeline, and the server-side `formatQuery` call is a plain call in the SSR
  entry rather than a server function or API route. `examples/ssr` is replaced by SolidStart when a
  Solid-2 line ships; tracked post-`0.1.0`, and `0.1.0` is not held for it.
- No Redux store, no `qbId`, no `dispatchQuery`, no `preserveQueryStateOnUnmount`. External control
  is the `manager` prop plus the veto callbacks.
- No slot or snippet customization tier — `controlElements` is the only one, because a component is
  the Solid idiom.
- Not ported: drag and drop, UI compatibility packages, `expr`/`datetime` value editor UI, async
  option lists, deprecated props, `ruleGroupHeaderElements`/`ruleGroupBodyElements`, `DragHandle`.
- Type substitutions: `ReactNode` → `LabelNode`, `ComponentType` → Solid's `Component`, `JSX` from
  `@solidjs/web`, React synthetic `MouseEvent` → the DOM `MouseEvent`, `Controls.undoRedoActions`
  non-nullable, `RuleProps.field` absent.
