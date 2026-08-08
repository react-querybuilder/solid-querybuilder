import type { FullField } from '@react-querybuilder/core';
import type { Component } from 'solid-js';
import type {
  ActionProps,
  CombinatorSelectorProps,
  FieldSelectorProps,
  InlineCombinatorProps,
  MatchModeEditorProps,
  NotToggleProps,
  OperatorSelectorProps,
  RuleGroupProps,
  RuleProps,
  ShiftActionsProps,
  UndoRedoActionsProps,
  ValueEditorProps,
  ValueSelectorProps,
  ValueSourceSelectorProps,
} from './props.js';

/**
 * Subcomponents.
 *
 * There is no `dragHandle` entry: drag-and-drop is a non-goal. There are no
 * `ruleGroupHeaderElements`/`ruleGroupBodyElements` entries either; to customize the contents
 * of a group's header or body, use a replacement `ruleGroup` component.
 *
 * @group Props
 */
export type ControlElementsProp<F extends FullField, O extends string> = Partial<{
  /**
   * Default component for all button-type controls.
   *
   * @default ActionElement
   */
  actionElement: Component<ActionProps>;
  /**
   * Adds a sub-group to the current group.
   *
   * @default ActionElement
   */
  addGroupAction: Component<ActionProps> | null;
  /**
   * Adds a rule to the current group.
   *
   * @default ActionElement
   */
  addRuleAction: Component<ActionProps> | null;
  /**
   * Clones the current group.
   *
   * @default ActionElement
   */
  cloneGroupAction: Component<ActionProps> | null;
  /**
   * Clones the current rule.
   *
   * @default ActionElement
   */
  cloneRuleAction: Component<ActionProps> | null;
  /**
   * Selects the `combinator` property for the current group, or the current independent
   * combinator value.
   *
   * @default ValueSelector
   */
  combinatorSelector: Component<CombinatorSelectorProps> | null;
  /**
   * Selects the `field` property for the current rule.
   *
   * @default ValueSelector
   */
  fieldSelector: Component<FieldSelectorProps<F>> | null;
  /**
   * A small wrapper around the `combinatorSelector` component.
   *
   * @default InlineCombinator
   */
  inlineCombinator: Component<InlineCombinatorProps> | null;
  /**
   * Locks the current group (sets the `disabled` property to `true`).
   *
   * @default ActionElement
   */
  lockGroupAction: Component<ActionProps> | null;
  /**
   * Locks the current rule (sets the `disabled` property to `true`).
   *
   * @default ActionElement
   */
  lockRuleAction: Component<ActionProps> | null;
  /**
   * Mutes the current group (sets the `muted` property to `true`).
   *
   * @default ActionElement
   */
  muteGroupAction: Component<ActionProps> | null;
  /**
   * Mutes the current rule (sets the `muted` property to `true`).
   *
   * @default ActionElement
   */
  muteRuleAction: Component<ActionProps> | null;
  /**
   * Selects the `match` property for the current rule.
   *
   * @default MatchModeEditor
   */
  matchModeEditor: Component<MatchModeEditorProps> | null;
  /**
   * Toggles the `not` property of the current group between `true` and `false`.
   *
   * @default NotToggle
   */
  notToggle: Component<NotToggleProps> | null;
  /**
   * Selects the `operator` property for the current rule.
   *
   * @default ValueSelector
   */
  operatorSelector: Component<OperatorSelectorProps> | null;
  /**
   * Removes the current group from its parent group's `rules` array.
   *
   * @default ActionElement
   */
  removeGroupAction: Component<ActionProps> | null;
  /**
   * Removes the current rule from its parent group's `rules` array.
   *
   * @default ActionElement
   */
  removeRuleAction: Component<ActionProps> | null;
  /**
   * Rule layout component.
   *
   * @default Rule
   */
  rule: Component<RuleProps>;
  /**
   * Rule group layout component.
   *
   * @default RuleGroup
   */
  ruleGroup: Component<RuleGroupProps<F, O>>;
  /**
   * Shifts the current rule/group up or down in the query hierarchy.
   *
   * @default ShiftActions
   */
  shiftActions: Component<ShiftActionsProps> | null;
  /**
   * Undo/redo buttons for the outermost group, rendered when the `showUndoRedo` prop is
   * `true`.
   *
   * @default UndoRedoActions
   */
  undoRedoActions: Component<UndoRedoActionsProps> | null;
  /**
   * Updates the `value` property for the current rule.
   *
   * @default ValueEditor
   */
  valueEditor: Component<ValueEditorProps<F, O>> | null;
  /**
   * Default component for all value selector controls.
   *
   * @default ValueSelector
   */
  valueSelector: Component<ValueSelectorProps>;
  /**
   * Selects the `valueSource` property for the current rule.
   *
   * @default ValueSelector
   */
  valueSourceSelector: Component<ValueSourceSelectorProps> | null;
}>;

/**
 * All subcomponents, finalized: every key is present and non-nullable. `null` entries in
 * {@link ControlElementsProp} are replaced with a component that renders nothing, so no call
 * site needs a null check.
 *
 * Unlike React Query Builder, `undoRedoActions` is non-nullable: `QueryManager` owns the
 * history, so this package always ships a working implementation.
 *
 * @group Props
 */
export type Controls<F extends FullField, O extends string> = {
  [K in keyof Required<ControlElementsProp<F, O>>]-?: NonNullable<
    Required<ControlElementsProp<F, O>>[K]
  >;
};
