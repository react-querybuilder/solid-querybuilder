// Core is re-exported at runtime, not just at the type level: a consumer calls `formatQuery`,
// `defaultOperators`, `transformQuery` and friends from this package and never depends on
// `@react-querybuilder/core` directly, exactly as React Query Builder's own barrel does.
// `examples/ssr` is what proved this missing — the example imports
// `formatQuery` from the bare specifier and would not build without it.
//
// This is a star export, so it loses every name the port declares explicitly below; that is the
// intended precedence (the port's `Schema`, `RuleProps`, etc. are deliberate deltas).
export * from '@react-querybuilder/core';
export * from './actions.js';
export * from './components/index.js';
export { Label } from './internal/Label.jsx';
export * from './reactive/index.js';
// Two stars can't disambiguate themselves: core 8.23 added its own `controlKeys`, which collides
// with the port's (TS2308). The port's list is the deliberate delta — it omits `dragHandle`,
// `ruleGroupHeaderElements`, and `ruleGroupBodyElements`, matching this package's `Controls` —
// so it is re-exported explicitly to win.
export { controlKeys } from './reactive/context.js';
export type * from './types/index.js';
