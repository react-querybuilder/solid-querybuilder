import { TestID, clsx, standardClassnames } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { Dynamic } from '@solidjs/web';
import { omit } from 'solid-js';
import type { InlineCombinatorProps } from '../types/props.js';

/**
 * Default `inlineCombinator` component: a small `<div>` around the `combinatorSelector`
 * component, rendered when either `showCombinatorsBetweenRules` or independent combinators are
 * in play.
 *
 * Port of React Query Builder's `InlineCombinator`. The selector to render arrives as the
 * `component` prop and everything else is forwarded to it, with `testID` overridden to
 * `TestID.combinators` — which is why callers render this with `createComponent` rather than
 * `<Dynamic>`: `<Dynamic>` consumes a prop named `component` for itself and can never forward
 * one.
 */
export const InlineCombinator = (props: InlineCombinatorProps): JSX.Element => {
  const className = () =>
    clsx(
      props.schema.suppressStandardClassnames || standardClassnames.betweenRules,
      props.schema.classNames.betweenRules
    );

  return (
    <div class={className()} data-testid={TestID.inlineCombinator}>
      {/* `omit` returns the rest only; the local half is read straight off `props`. */}
      <Dynamic
        component={props.component}
        {...omit(props, 'component')}
        testID={TestID.combinators}
      />
    </div>
  );
};
