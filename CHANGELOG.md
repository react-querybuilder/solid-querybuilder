# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Repo bootstrap: Bun workspaces, root tooling config (`oxfmt`, `oxlint`, `.editorconfig`,
  `.npmrc`), root `vitest.config.ts` with `v8` coverage (80% lines), and CI (`main` gating job on
  `solid-js@1.9`, `solid-next` non-gating leg on `solid-js@2.0.0-beta`).
- `packages/solid-querybuilder` scaffold: the Solid triple `exports` map (`solid` → `types` →
  `import`), build pipeline (`vite build` dom bundle, `tsc --jsx preserve` source bundle, types,
  css), `check:exports` specifier guard, and `scripts/ssr-smoke.ts` as a real gate from day one —
  it asserts the `solid` condition is **first** in the exports map and confirms that with Node's
  real resolver run with and without `--conditions=solid`, then renders through Vite's SSR
  pipeline inside a single Solid instance and asserts the exact markup.
