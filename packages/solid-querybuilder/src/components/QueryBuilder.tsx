import type {
  FullCombinator,
  FullField,
  FullOperator,
  RuleGroupType,
  RuleGroupTypeAny,
} from '@react-querybuilder/core';
import { rootPath } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { Dynamic } from '@solidjs/web';
import { QueryBuilderContext } from '../reactive/context.js';
import { createQueryBuilderState } from '../reactive/createQueryBuilderState.js';
import type { QueryBuilderProps } from '../types/props.js';
import { defaultControlElements } from './defaultControlElements.js';

/**
 * The query builder.
 *
 * Port of React Query Builder's `QueryBuilder`/`QueryBuilderInternal`. All state lives in a
 * `QueryManager`; see `createQueryBuilderState`. The query can be driven three ways:
 *
 * - `query` + `onQueryChange` — controlled.
 * - `defaultQuery` — uncontrolled.
 * - a `manager` prop — driven from outside the component tree entirely.
 *
 * This component stays deliberately thin: it builds the state, provides the context, and
 * renders the root `<div>` plus the root group. Everything else is derived.
 */
export const QueryBuilder = <
  RG extends RuleGroupTypeAny = RuleGroupType,
  F extends FullField = FullField,
  O extends FullOperator = FullOperator,
  C extends FullCombinator = FullCombinator,
>(
  props: QueryBuilderProps<RG, F, O, C>
): JSX.Element => {
  // Never destructured, never spread into a local: `props` is the reactive source, and it is
  // read through for the lifetime of the component.
  const p = props as QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>;

  const state = createQueryBuilderState<F, O>(p, { defaultControls: defaultControlElements });

  return (
    // Solid 2 removed `.Provider`. `state.context` is a getter object, so descendants read
    // through to the current configuration instead of freezing on the first one.
    <QueryBuilderContext value={state.context}>
      <div
        role="form"
        class={state.wrapperClassName}
        data-dnd={state.dndEnabledAttr}
        data-inlinecombinators={state.inlineCombinatorsAttr}>
        <Dynamic
          component={state.schema.controls.ruleGroup}
          translations={state.translations}
          ruleGroup={state.rootGroup as never}
          schema={state.schema}
          actions={state.actions}
          id={state.rootGroup.id}
          path={rootPath}
          disabled={state.rootGroupDisabled}
          shiftUpDisabled
          shiftDownDisabled
          parentDisabled={state.queryDisabled}
          context={p.context}
        />
      </div>
    </QueryBuilderContext>
  );
};
