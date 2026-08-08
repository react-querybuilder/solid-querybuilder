/**
 * Type-level tests. Not executed by Vitest; compiled by `tsc`, which is where the assertions
 * below are enforced. Any error here fails `bun run check`.
 *
 * This is a two-sided gate: a failed assertion is an error, and an `@ts-expect-error` that
 * stops erroring (because a removed member was quietly re-added) is *also* an error.
 */
import type {
  FullCombinator,
  FullField,
  FullOperator,
  QueryManager,
  RuleGroupType,
  RuleGroupTypeAny,
  RuleGroupTypeIC,
} from '@react-querybuilder/core';
import type { Component } from 'solid-js';
import type {
  ActionProps,
  ControlElementsProp,
  Controls,
  LabelNode,
  QueryBuilderProps,
  RuleGroupProps,
  RuleProps,
  Schema,
  ShiftActionsProps,
  SimpleQueryBuilderProps,
  SimpleQueryBuilderPropsIC,
  SimpleRuleGroupProps,
  SimpleRuleProps,
  Translations,
  ValueEditorProps,
} from './index.js';

declare function assertType<T>(value: T): void;

// #region QueryBuilderProps — independent combinators
type ICProps = QueryBuilderProps<RuleGroupTypeIC, FullField, FullOperator, FullCombinator>;

declare const icProps: ICProps;

assertType<RuleGroupTypeIC | undefined>(icProps.query);
assertType<RuleGroupTypeIC | undefined>(icProps.defaultQuery);
assertType<QueryManager<RuleGroupTypeIC, FullField, FullOperator, FullCombinator> | undefined>(
  icProps.manager
);
assertType<((query: RuleGroupTypeIC) => void) | undefined>(icProps.onQueryChange);

// The `combinator`-bearing variant is a distinct, non-assignable type.
type StdProps = QueryBuilderProps<RuleGroupType, FullField, FullOperator, FullCombinator>;
declare const stdProps: StdProps;
// @ts-expect-error `RuleGroupType` query is not a `RuleGroupTypeIC` query
assertType<RuleGroupTypeIC | undefined>(stdProps.query);

// All four type parameters default, so the bare form is usable.
assertType<QueryBuilderProps>(stdProps);
// #endregion

// #region Removed props
// @ts-expect-error `qbId` does not exist (no Redux store; use `manager`)
assertType<string | undefined>(stdProps.qbId);
// @ts-expect-error drag-and-drop is a non-goal
assertType<boolean | undefined>(stdProps.enableDragAndDrop);
// @ts-expect-error there is no store whose state could be preserved
assertType<boolean | undefined>(stdProps.preserveQueryStateOnUnmount);
// @ts-expect-error deprecated in React Query Builder, removed here
assertType<boolean | undefined>(stdProps.independentCombinators);
// #endregion

// #region Controls
declare const controls: Controls<FullField, string>;
// Every entry is present and non-nullable after finalization, including `undoRedoActions`.
assertType<Component<ActionProps>>(controls.actionElement);
assertType<NonNullable<typeof controls.undoRedoActions>>(controls.undoRedoActions);
assertType<NonNullable<typeof controls.valueEditor>>(controls.valueEditor);
// @ts-expect-error finalized controls are never nullish
assertType<null>(controls.valueEditor);

declare const controlElements: ControlElementsProp<FullField, string>;
// ...but `null` is accepted on the way in.
assertType<null | undefined | NonNullable<typeof controlElements.valueEditor>>(
  controlElements.valueEditor
);
// @ts-expect-error `dragHandle` is not a control element in this package
assertType<unknown>(controlElements.dragHandle);
// @ts-expect-error `ruleGroupHeaderElements` is not a control element in this package
assertType<unknown>(controlElements.ruleGroupHeaderElements);
// @ts-expect-error `ruleGroupBodyElements` is not a control element in this package
assertType<unknown>(controlElements.ruleGroupBodyElements);
// #endregion

// #region Rule/RuleGroup props — no deprecated per-prop fallbacks
declare const ruleProps: RuleProps;
// @ts-expect-error use `rule.field`
assertType<unknown>(ruleProps.field);
// @ts-expect-error use `rule.operator`
assertType<unknown>(ruleProps.operator);
// @ts-expect-error use `rule.value`
assertType<unknown>(ruleProps.value);
// @ts-expect-error use `rule.valueSource`
assertType<unknown>(ruleProps.valueSource);
assertType<Schema<FullField, string>>(ruleProps.schema);
assertType<Translations>(ruleProps.translations);

declare const ruleGroupProps: RuleGroupProps;
// @ts-expect-error use `ruleGroup.combinator`
assertType<unknown>(ruleGroupProps.combinator);
// @ts-expect-error use `ruleGroup.rules`
assertType<unknown>(ruleGroupProps.rules);
// @ts-expect-error use `ruleGroup.not`
assertType<unknown>(ruleGroupProps.not);
// @ts-expect-error drag-and-drop props are not part of this port
assertType<unknown>(ruleGroupProps.isDragging);
// #endregion

// #region Schema
declare const schema: Schema<FullField, string>;
assertType<() => RuleGroupTypeAny>(schema.manager.getQuery);
// @ts-expect-error no Redux store
assertType<unknown>(schema.dispatchQuery);
// @ts-expect-error no query builder registry
assertType<unknown>(schema.qbId);
// `enableDragAndDrop` survives: it feeds the root element's `data-dnd` attribute.
assertType<boolean>(schema.enableDragAndDrop);
// #endregion

// #region Labels are `LabelNode`; titles stay `string`
declare const actionProps: ActionProps;
assertType<LabelNode | undefined>(actionProps.label);
assertType<string | undefined>(actionProps.title);
assertType<(e?: MouseEvent, context?: unknown) => void>(actionProps.handleOnClick);

declare const shiftActionsProps: ShiftActionsProps;
// Shift handlers take an optional DOM `MouseEvent` and return nothing.
assertType<((event?: MouseEvent) => void) | undefined>(shiftActionsProps.shiftUp);
assertType<((event?: MouseEvent) => void) | undefined>(shiftActionsProps.shiftDown);
assertType<string | undefined>(shiftActionsProps.titles?.shiftUp);

declare const valueEditorProps: ValueEditorProps;
assertType<Schema<FullField, string>>(valueEditorProps.schema);
assertType<LabelNode | undefined>(valueEditorProps.separator);
assertType<boolean | undefined>(valueEditorProps.skipHook);
// #endregion

// #region Convenience aliases
assertType<SimpleQueryBuilderProps>(stdProps);
assertType<SimpleQueryBuilderPropsIC>(icProps);
assertType<SimpleRuleProps>(ruleProps);
assertType<SimpleRuleGroupProps>(ruleGroupProps);
// @ts-expect-error the aliases are not interchangeable
assertType<SimpleQueryBuilderPropsIC>(stdProps);
// #endregion
