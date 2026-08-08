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
