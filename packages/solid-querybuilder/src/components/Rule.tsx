import { TestID } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { Show } from 'solid-js';
import { RuleComponents } from '../internal/RuleComponents.jsx';
import { RuleSubQuery } from '../internal/RuleSubQuery.jsx';
import { createRuleState } from '../reactive/createRuleState.js';
import type { RuleProps } from '../types/props.js';

/**
 * Default component for `RuleType` objects.
 *
 * Port of React Query Builder's `Rule`, and, like it, a small wrapper: the controls themselves
 * live in `RuleComponents`, and a rule whose field supports match modes renders `RuleSubQuery`
 * instead — which needs its own `createQueryBuilder`, and therefore its own component.
 *
 * Element order and conditional rendering are the contract: read React's `Rule.tsx` as the spec.
 */
export const Rule = <F extends string = string, O extends string = string>(
  props: RuleProps<F, O>
): JSX.Element => {
  // Widened once, here: `createRuleState` and the control elements are written against the
  // default type parameters, and Solid components have no compile-time prop enumeration to
  // narrow through.
  const p = props as unknown as RuleProps;
  const state = createRuleState(p);

  return (
    <div
      data-testid={TestID.rule}
      class={state.outerClassName}
      data-rule-id={p.id}
      data-level={p.path.length}
      data-path={JSON.stringify(p.path)}>
      <Show when={state.hasSubQuery} fallback={<RuleComponents ruleProps={p} parts={state} />}>
        <RuleSubQuery ruleProps={p} parts={state} />
      </Show>
    </div>
  );
};
