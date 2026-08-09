// Core is re-exported at runtime, not just at the type level: a consumer calls `formatQuery`,
// `defaultOperators`, `transformQuery` and friends from this package and never depends on
// `@react-querybuilder/core` directly, exactly as React Query Builder's own barrel does.
// `examples/ssr` is what proved this missing — the example imports
// `formatQuery` from the bare specifier and would not build without it.
//
// This is a star export, so it loses every name the port declares explicitly below; that is the
// intended precedence (the port's `Schema`, `RuleProps`, etc. are deliberate deltas).
export * from '@react-querybuilder/core';
export * from './components/index.js';
export { Label } from './internal/Label.jsx';
export * from './reactive/index.js';
export type * from './types/index.js';
