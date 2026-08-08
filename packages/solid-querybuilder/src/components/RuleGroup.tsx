import type { FullOption } from '@react-querybuilder/core';
import { TestID } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { RuleGroupBody } from '../internal/RuleGroupBody.jsx';
import { RuleGroupHeader } from '../internal/RuleGroupHeader.jsx';
import { createRuleGroupState } from '../reactive/createRuleGroupState.js';
import type { RuleGroupProps } from '../types/props.js';

/**
 * Default component for `RuleGroupType` and `RuleGroupTypeIC` objects.
 *
 * Port of React Query Builder's `RuleGroup`/`RuleGroupHeaderComponents`/
 * `RuleGroupBodyComponents`, and, like it, a small wrapper: the two `<div>`s and their contents
 * live in `RuleGroupHeader`/`RuleGroupBody`, which `RuleSubQuery` reuses for a subquery's root
 * group. Element order and conditional rendering are the contract — read React's `RuleGroup.tsx`
 * as the spec.
 *
 * Nested groups and rules render through `schema.controls`, never a self-import, which is what
 * makes a replacement `ruleGroup` component apply at every level.
 */
export const RuleGroup = <F extends FullOption = FullOption, O extends string = string>(
  props: RuleGroupProps<F, O>
): JSX.Element => {
  // Widened once, here: `createRuleGroupState` and the control elements are written against the
  // default type parameters, and Solid components have no compile-time prop enumeration to
  // narrow through.
  const p = props as unknown as RuleGroupProps;
  const state = createRuleGroupState(p);

  return (
    <div
      title={state.accessibleDescription}
      class={state.outerClassName}
      data-testid={TestID.ruleGroup}
      data-not={state.ruleGroup.not ? 'true' : undefined}
      data-rule-group-id={p.id}
      data-level={p.path.length}
      data-path={JSON.stringify(p.path)}>
      <div class={state.classNames.header}>
        <RuleGroupHeader groupProps={p} parts={state} />
      </div>
      <div class={state.classNames.body}>
        <RuleGroupBody groupProps={p} parts={state} />
      </div>
    </div>
  );
};
