import type { FullField, RuleGroupType, RuleGroupTypeAny } from '@react-querybuilder/core';
import { isRuleGroup, prepareOptionList, rootPath } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { createMemo, merge, untrack } from 'solid-js';
import { defaultControlElements } from '../components/defaultControlElements.js';
import { createQueryBuilderState } from '../reactive/createQueryBuilderState.js';
import { createRuleGroupState } from '../reactive/createRuleGroupState.js';
import type { RuleState } from '../reactive/createRuleState.js';
import type { QueryBuilderProps, RuleGroupProps, RuleProps } from '../types/props.js';
import { RuleComponents } from './RuleComponents.jsx';

const defaultSubproperties: FullField[] = [{ name: '', value: '', label: '' }];

/**
 * A rule whose field supports match modes: the ordinary rule controls, plus a nested query
 * builder for the rule's value.
 *
 * Port of React Query Builder's `RuleComponentsWithSubQuery`. It exists as its own component for
 * the same reason React's does: the subquery needs its own `createQueryBuilderState`, which runs
 * during component setup and therefore cannot live behind a `<Show>` inside `Rule`.
 *
 * It provides no new context, matching React and both prior ports — a replacement control
 * element configured on the outer query builder applies to the subquery too.
 */
export const RuleSubQuery = (props: { ruleProps: RuleProps; parts: RuleState }): JSX.Element => {
  const p = () => props.ruleProps;
  const state = () => props.parts;

  /**
   * Read **once, untracked**. A re-evaluation would mint a fresh group and thrash the seeding
   * path. (Solid 2 removed `/*@once*&#47;`; `untrack` outside JSX is the sanctioned
   * replacement.)
   */
  const initialQuery = untrack(() => p().schema.createRuleGroup() as RuleGroupType);

  const subQueryBuilderProps = () => state().ctx.subQueryBuilderProps;

  /** React's `useFields` over the field's `subproperties`, which become the subquery's fields. */
  const subFields = createMemo(
    () =>
      prepareOptionList({
        placeholder: p().translations.fields as never,
        optionList: (state().fieldData?.subproperties ??
          subQueryBuilderProps().fields ??
          defaultSubproperties) as never,
        autoSelectOption: p().schema.autoSelectField || !!state().fieldData?.subproperties,
      }).optionList
  );

  const value = () => p().rule.value as unknown;

  // `merge`, not a spread: the props coming back from `getSubQueryBuilderProps` are overridden
  // by a handful of fixed values, and everything must stay lazy.
  const subProps = merge(subQueryBuilderProps, {
    enableDragAndDrop: false,
    get disabled() {
      return state().disabled;
    },
    get fields() {
      return subFields();
    },
    // Updates the value on first render when it is not already a valid rule group.
    get enableMountQueryChange() {
      return !isRuleGroup(value() as never) || !(value() as RuleGroupTypeAny).id;
    },
    get query() {
      return isRuleGroup(value() as never) ? (value() as RuleGroupType) : initialQuery;
    },
    get onQueryChange() {
      return state().onChangeValue;
    },
  }) as unknown as QueryBuilderProps<RuleGroupTypeAny>;

  const subState = createQueryBuilderState(() => subProps as never, {
    defaultControls: defaultControlElements as never,
  });

  const groupProps = {
    get ruleGroup() {
      return subState.rootGroup;
    },
    path: rootPath,
    get id() {
      return subState.rootGroup.id;
    },
    get disabled() {
      return state().disabled;
    },
    get parentDisabled() {
      return subState.queryDisabled;
    },
    shiftUpDisabled: true,
    shiftDownDisabled: true,
    get schema() {
      return subState.schema;
    },
    get actions() {
      return subState.actions;
    },
    get translations() {
      return subState.translations;
    },
    get context() {
      return p().context;
    },
  } as unknown as RuleGroupProps;

  // `groupProps` is a getter-object literal with a fixed identity, so passing it directly is
  // exactly as reactive as wrapping it in an accessor was.
  const groupState = createRuleGroupState(groupProps);

  return (
    <RuleComponents ruleProps={p()} parts={state()} subQuery={{ groupProps, parts: groupState }} />
  );
};
