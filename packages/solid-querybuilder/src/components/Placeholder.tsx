import type { Component } from 'solid-js';

/**
 * Step-1 placeholder — verifies the build pipeline and the `solid` export condition end to end.
 * Superseded by `QueryBuilder` at step 4; `scripts/ssr-smoke.ts` is repointed then too.
 */
export const Placeholder: Component<{ label?: string }> = props => {
  return <div data-testid="solid-querybuilder-placeholder">{props.label ?? 'placeholder'}</div>;
};
