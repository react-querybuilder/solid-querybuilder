import type {
  AccessibleDescriptionGenerator,
  BaseOptionMap,
  Classname,
  Classnames,
  CommonRuleSubComponentProps,
  FlexibleOption,
  FlexibleOptionListProp,
  FullCombinator,
  FullField,
  FullOperator,
  FullOption,
  FullOptionList,
  GenericizeRuleGroupType,
  GetOptionIdentifierType,
  GroupOptions,
  InputType,
  MatchConfig,
  MatchMode,
  MoveOptions,
  Option,
  ParseNumbersPropConfig,
  Path,
  QueryActions,
  QueryBuilderFlags,
  QueryManager,
  QueryValidator,
  RuleGroupType,
  RuleGroupTypeAny,
  RuleGroupTypeIC,
  RuleOrGroupArray,
  RuleType,
  ToFullOption,
  ValidationResult,
  ValueEditorType,
  ValueSource,
  ValueSourceFlexibleOptions,
  ValueSources,
} from '@react-querybuilder/core';
import type { Component } from 'solid-js';
import type { ControlElementsProp } from './controls.js';
import type { Schema } from './schema.js';
import type { LabelNode, Translations, TranslationWithLabel } from './translations.js';

/**
 * Base interface for all subcomponents.
 *
 * @group Props
 */
export interface CommonSubComponentProps<
  F extends FullOption = FullField,
  O extends string = string,
> {
  /**
   * CSS classNames to be applied.
   *
   * This is `string` and not {@link Classname} because the `Rule` and `RuleGroup` components
   * run `clsx()` to produce the `className` that gets passed to each subcomponent.
   */
  className?: string;
  /**
   * Path to this subcomponent's rule/group within the query.
   */
  path: Path;
  /**
   * The level of the current group. Always equal to `path.length`.
   */
  level: number;
  /**
   * The title/tooltip for this control.
   */
  title?: string;
  /**
   * Disables the control.
   */
  disabled?: boolean;
  /**
   * Container for custom props that are passed to all components.
   */
  context?: any;
  /**
   * Validation result of the parent rule/group.
   */
  validation?: boolean | ValidationResult;
  /**
   * Test ID for this component.
   */
  testID?: string;
  /**
   * All subcomponents receive the configuration schema as a prop.
   */
  schema: Schema<F, O>;
}

/**
 * Base interface for selectors and editors.
 *
 * @group Props
 */
export interface SelectorOrEditorProps<
  F extends FullOption = FullField,
  O extends string = string,
> extends CommonSubComponentProps<F, O> {
  value?: string;
  handleOnChange(value: any): void;
}

/**
 * Base interface for selector components.
 */
interface BaseSelectorProps<OptType extends Option> extends SelectorOrEditorProps<
  ToFullOption<OptType>
> {
  options: FullOptionList<OptType>;
}

/**
 * Props for all `value` selector components.
 *
 * @group Props
 */
export interface ValueSelectorProps<
  OptType extends Option = FullOption,
> extends BaseSelectorProps<OptType> {
  multiple?: boolean;
  listsAsArrays?: boolean;
}

/**
 * Props for `combinatorSelector` components.
 *
 * @group Props
 */
export interface CombinatorSelectorProps extends BaseSelectorProps<FullOption> {
  options: FullOptionList<FullCombinator>;
  rules: RuleOrGroupArray;
  ruleGroup: RuleGroupTypeAny;
}

/**
 * Props for `fieldSelector` components.
 *
 * @group Props
 */
export interface FieldSelectorProps<F extends FullField = FullField>
  extends BaseSelectorProps<F>, CommonRuleSubComponentProps {
  operator?: F extends FullField<string, infer OperatorName> ? OperatorName : string;
}

/**
 * Props for `matchModeEditor` components.
 *
 * @group Props
 */
export interface MatchModeEditorProps
  extends BaseSelectorProps<FullOption>, CommonRuleSubComponentProps {
  match: MatchConfig;
  selectorComponent?: Component<ValueSelectorProps>;
  numericEditorComponent?: Component<ValueEditorProps>;
  thresholdPlaceholder?: string;
  classNames: { matchMode: string; matchThreshold: string };
  options: FullOptionList<FullOption<MatchMode>>;
  field: string;
  fieldData: FullField;
}

/**
 * Props for `operatorSelector` components.
 *
 * @group Props
 */
export interface OperatorSelectorProps
  extends BaseSelectorProps<FullOption>, CommonRuleSubComponentProps {
  options: FullOptionList<FullOperator>;
  field: string;
  fieldData: FullField;
}

/**
 * Props for `valueSourceSelector` components.
 *
 * @group Props
 */
export interface ValueSourceSelectorProps
  extends BaseSelectorProps<FullOption>, CommonRuleSubComponentProps {
  options: FullOptionList<FullOption<ValueSource>>;
  field: string;
  fieldData: FullField;
}

/**
 * Utility type representing props for selector components
 * that could potentially be any of the standard selector types.
 *
 * @group Props
 */
// Intersection type required; `interface extends` fails due to property conflicts
export type VersatileSelectorProps = ValueSelectorProps &
  Partial<FieldSelectorProps> &
  Partial<OperatorSelectorProps> &
  Partial<CombinatorSelectorProps>;

/**
 * Props passed to every action component (rendered as `<button>` by default).
 *
 * @group Props
 */
export interface ActionProps extends CommonSubComponentProps {
  /** Visible text. */
  label?: LabelNode;
  /**
   * Triggers the action, e.g. the addition of a new rule or group. The second parameter
   * will be forwarded to the `onAddRule` or `onAddGroup` callback if appropriate.
   */
  handleOnClick(e?: MouseEvent, context?: any): void;
  /**
   * Translation which overrides the regular `label`/`title` props when
   * the element is disabled.
   */
  disabledTranslation?: TranslationWithLabel;
  /**
   * The {@link RuleType} or {@link RuleGroupType}/{@link RuleGroupTypeIC}
   * associated with this element.
   */
  ruleOrGroup: RuleGroupTypeAny | RuleType;
  /**
   * Rules in this group (if the action element is for a group).
   */
  rules?: RuleOrGroupArray;
}

/**
 * Props for `notToggle` components.
 *
 * @group Props
 */
export interface NotToggleProps extends CommonSubComponentProps {
  checked?: boolean;
  handleOnChange(checked: boolean): void;
  label?: LabelNode;
  ruleGroup: RuleGroupTypeAny;
}

/**
 * Props passed to `undoRedoActions` components.
 *
 * @group Props
 */
export interface UndoRedoActionsProps extends CommonSubComponentProps {
  /**
   * Visible text for the "undo"/"redo" elements.
   */
  labels?: { undo?: LabelNode; redo?: LabelNode };
  /**
   * Tooltips for the "undo"/"redo" elements.
   */
  titles?: { undo?: string; redo?: string };
  /**
   * Classnames for the "undo"/"redo" elements. (The `className` prop applies to their
   * container.)
   */
  classNames?: { undo?: string; redo?: string };
  /**
   * The {@link RuleGroupType}/{@link RuleGroupTypeIC} associated with this element, i.e. the
   * outermost group.
   */
  ruleOrGroup: RuleGroupTypeAny;
}

/**
 * Props passed to `shiftActions` components.
 *
 * @group Props
 */
export interface ShiftActionsProps extends CommonSubComponentProps {
  /**
   * Visible text for "shift up"/"shift down" elements.
   */
  labels?: { shiftUp?: LabelNode; shiftDown?: LabelNode };
  /**
   * Tooltips for "shift up"/"shift down" elements.
   */
  titles?: { shiftUp?: string; shiftDown?: string };
  /**
   * The {@link RuleType} or {@link RuleGroupType}/{@link RuleGroupTypeIC}
   * associated with this element.
   */
  ruleOrGroup: RuleGroupTypeAny | RuleType;
  /**
   * Method to shift the rule/group up one place.
   *
   * `Rule`/`RuleGroup` read `event.altKey` to decide whether to shift the rule/group into or
   * out of the adjacent group, so a custom `shiftActions` component should forward the click
   * event. Omitting it performs a plain move. (React Query Builder types this parameter list
   * as `() => void`, which does not describe what its own components do with the argument.)
   */
  shiftUp?: (event?: MouseEvent) => void;
  /**
   * Method to shift the rule/group down one place. See {@link ShiftActionsProps.shiftUp}.
   */
  shiftDown?: (event?: MouseEvent) => void;
  /**
   * Whether shifting the rule/group up is disallowed.
   */
  shiftUpDisabled?: boolean;
  /**
   * Whether shifting the rule/group down is disallowed.
   */
  shiftDownDisabled?: boolean;
}

/**
 * Props passed to `inlineCombinator` components.
 *
 * @group Props
 */
export interface InlineCombinatorProps extends CombinatorSelectorProps {
  component: Component<CombinatorSelectorProps>;
}

/**
 * Props passed to `valueEditor` components.
 *
 * @group Props
 */
export interface ValueEditorProps<F extends FullField = FullField, O extends string = string>
  extends SelectorOrEditorProps<F, O>, CommonRuleSubComponentProps {
  field: GetOptionIdentifierType<F>;
  operator: O;
  value?: any;
  valueSource: ValueSource;
  /** The entire {@link FullField} object. */
  fieldData: F;
  type?: ValueEditorType;
  inputType?: InputType | null;
  values?: any[];
  listsAsArrays?: boolean;
  parseNumbers?: ParseNumbersPropConfig;
  separator?: LabelNode;
  selectorComponent?: Component<ValueSelectorProps>;
  /**
   * Only pass `true` if the value editor reset effect (`createValueEditorReset`) has already
   * run in a parent/ancestor component.
   */
  skipHook?: boolean;
  schema: Schema<F, O>;
}

/**
 * Common props between `Rule` and `RuleGroup`.
 */
interface CommonRuleAndGroupProps<F extends FullField = FullField, O extends string = string> {
  id?: string;
  path: Path;
  parentDisabled?: boolean;
  parentMuted?: boolean;
  translations: Translations;
  schema: Schema<F, O>;
  actions: QueryActions;
  disabled?: boolean;
  shiftUpDisabled?: boolean;
  shiftDownDisabled?: boolean;
  context?: any;
}

/**
 * `RuleGroup` props.
 *
 * @group Props
 */
export interface RuleGroupProps<
  F extends FullOption = FullOption,
  O extends string = string,
> extends CommonRuleAndGroupProps<F, O> {
  ruleGroup: RuleGroupTypeAny<RuleType<GetOptionIdentifierType<F>, O>>;
}

/**
 * `Rule` props.
 *
 * @group Props
 */
export interface RuleProps<
  F extends string = string,
  O extends string = string,
> extends CommonRuleAndGroupProps<FullOption<F>, O> {
  rule: RuleType<F, O>;
}

/**
 * Props passed down through {@link QueryBuilderContext} from a query builder ancestor.
 *
 * `enableDragAndDrop` and `preserveQueryStateOnUnmount` are omitted from
 * {@link QueryBuilderFlags}: drag-and-drop is a non-goal, and there is no store whose state
 * could be preserved. ({@link Schema} still carries `enableDragAndDrop`; it feeds the root
 * element's `data-dnd` attribute, which is always `"disabled"`.)
 *
 * @group Props
 */
export interface QueryBuilderContextProps<
  F extends FullField = FullField,
  O extends string = string,
> extends Omit<QueryBuilderFlags, 'enableDragAndDrop' | 'preserveQueryStateOnUnmount'> {
  /**
   * Defines replacement components.
   */
  controlElements?: ControlElementsProp<F, O>;
  /**
   * This can be used to assign specific CSS classes to various controls
   * that are rendered by `QueryBuilder`.
   */
  controlClassnames?: Partial<Classnames>;
  /**
   * This can be used to override translatable texts applied to the various
   * controls that are rendered by `QueryBuilder`.
   */
  translations?: Partial<Translations>;
}

/**
 * Props for `QueryBuilder`.
 *
 * Notes:
 * - Only one of `query` or `defaultQuery` should be provided. If `query` is present,
 * then `defaultQuery` should be undefined and vice versa.
 * - Unlike Vue, Solid components are plain functions with no compile-time prop enumeration, so
 * the conditional type is written exactly as React Query Builder writes it — there is no
 * non-conditional `*Base` interface and no `RuleTypeOf<RG>` helper.
 *
 * @typeParam RG - The type of the query object, inferred from either the `query` or
 * `defaultQuery` prop. Must extend {@link RuleGroupType} or {@link RuleGroupTypeIC}.
 * @typeParam F - The field type.
 * @typeParam O - The operator type.
 * @typeParam C - The combinator type.
 *
 * @group Props
 */
export type QueryBuilderProps<
  RG extends RuleGroupTypeAny = RuleGroupType,
  F extends FullField = FullField,
  O extends FullOperator = FullOperator,
  C extends FullCombinator = FullCombinator,
> = RG extends RuleGroupType<infer R> | RuleGroupTypeIC<infer R>
  ? QueryBuilderContextProps<F, GetOptionIdentifierType<O>> & {
      /**
       * An externally-created {@link QueryManager} to drive this query builder. When provided,
       * the query builder subscribes to it instead of creating its own manager, which allows
       * the query to be manipulated from outside the component tree.
       */
      manager?: QueryManager<RG, F, O, C>;
      /**
       * Initial query object for uncontrolled components.
       */
      defaultQuery?: RG;
      /**
       * Query object for controlled components.
       */
      query?: RG;
      /**
       * List of valid {@link FullField}s.
       *
       * @default []
       */
      fields?: FlexibleOptionListProp<F> | BaseOptionMap<F>;
      /**
       * List of valid {@link FullOperator}s.
       *
       * @default defaultOperators
       */
      operators?: FlexibleOptionListProp<O>;
      /**
       * List of valid {@link FullCombinator}s.
       *
       * @default defaultCombinators
       */
      combinators?: FlexibleOptionListProp<C>;
      /**
       * Default properties applied to all objects in the `fields` prop. Properties on
       * individual field definitions will override these.
       */
      baseField?: Record<string, unknown>;
      /**
       * Default properties applied to all objects in the `operators` prop. Properties on
       * individual operator definitions will override these.
       */
      baseOperator?: Record<string, unknown>;
      /**
       * Default properties applied to all objects in the `combinators` prop. Properties on
       * individual combinator definitions will override these.
       */
      baseCombinator?: Record<string, unknown>;
      /**
       * The default `field` value for new rules. This can be the field `name`
       * itself or a function that returns a valid {@link FullField} `name` given
       * the `fields` list.
       */
      getDefaultField?: GetOptionIdentifierType<F> | ((fieldsData: FullOptionList<F>) => string);
      /**
       * The default `operator` value for new rules. This can be the operator
       * `name` or a function that returns a valid {@link FullOperator} `name` for
       * a given field name.
       */
      getDefaultOperator?:
        | GetOptionIdentifierType<O>
        | ((field: GetOptionIdentifierType<F>, misc: { fieldData: F }) => string);
      /**
       * Returns the default `value` for new rules.
       */
      getDefaultValue?(rule: R, misc: { fieldData: F }): any;
      /**
       * This function should return the list of allowed {@link FullOperator}s
       * for the given {@link FullField} `name`. If `null` is returned, the
       * default operators are used.
       */
      getOperators?(
        field: GetOptionIdentifierType<F>,
        misc: { fieldData: F }
      ): FlexibleOptionListProp<FullOperator> | null;
      /**
       * This function should return the type of value editor (see {@link ValueEditorType}) for
       * the given field `name` and operator `name`.
       */
      getValueEditorType?(
        field: GetOptionIdentifierType<F>,
        operator: GetOptionIdentifierType<O>,
        misc: { fieldData: F }
      ): ValueEditorType;
      /**
       * This function should return the separator element for a given field `name` and operator
       * `name`. It will be placed in between value editors when multiple editors are rendered,
       * such as when the `operator` is `"between"`.
       */
      getValueEditorSeparator?(
        field: GetOptionIdentifierType<F>,
        operator: GetOptionIdentifierType<O>,
        misc: { fieldData: F }
      ): LabelNode;
      /**
       * This function should return the list of valid {@link ValueSources} for a given field
       * `name` and operator `name`.
       */
      getValueSources?(
        field: GetOptionIdentifierType<F>,
        operator: GetOptionIdentifierType<O>,
        misc: { fieldData: F }
      ): ValueSources | ValueSourceFlexibleOptions;
      /**
       * This function should return a list of named parameters to be presented as options when
       * a rule's `valueSource` is `"parameter"`.
       *
       * Prefer names _without_ the parameter prefix (e.g. `{ name: 'p1' }`, not
       * `{ name: ':p1' }`); `formatQuery` adds the appropriate prefix per dialect.
       */
      getParameters?(
        field?: GetOptionIdentifierType<F>,
        operator?: GetOptionIdentifierType<O>,
        misc?: { fieldData: F }
      ): FlexibleOptionListProp<FullOption>;
      /**
       * This function should return the `type` of `<input />` for the given field `name` and
       * operator `name`.
       */
      getInputType?(
        field: GetOptionIdentifierType<F>,
        operator: GetOptionIdentifierType<O>,
        misc: { fieldData: F }
      ): InputType | null;
      /**
       * This function should return the list of allowed values for the given field `name` and
       * operator `name`.
       */
      getValues?(
        field: GetOptionIdentifierType<F>,
        operator: GetOptionIdentifierType<O>,
        misc: { fieldData: F }
      ): FlexibleOptionListProp<Option>;
      /**
       * This function should return the list of valid {@link MatchMode}s or
       * {@link MatchConfig}s for a given field `name`.
       */
      getMatchModes?(
        field: GetOptionIdentifierType<F>,
        misc: { fieldData: F }
      ): boolean | MatchMode[] | FlexibleOption<MatchMode>[];
      /**
       * This function should return any props that a subquery (see {@link MatchMode}) should
       * override from the props provided to this query builder.
       */
      getSubQueryBuilderProps?(
        field: GetOptionIdentifierType<F>,
        misc: { fieldData: F }
      ): QueryBuilderProps<GenericizeRuleGroupType<RG>, FullOption, FullOption, FullOption>;
      /**
       * The return value of this function will be used to apply classnames to the outer
       * `<div>` of the given rule.
       */
      getRuleClassname?(rule: R, misc: { fieldData: F }): Classname;
      /**
       * The return value of this function will be used to apply classnames to the outer
       * `<div>` of the given rule group.
       */
      getRuleGroupClassname?(ruleGroup: RG): Classname;
      /**
       * This callback is invoked before a new rule is added. The function should either
       * manipulate the rule and return the new object, return `true` to allow the addition to
       * proceed as normal, or return `false` to cancel the addition of the rule.
       */
      onAddRule?(rule: R, parentPath: Path, query: RG, context?: any): RuleType | boolean;
      /**
       * This callback is invoked before a new group is added. The function should either
       * manipulate the group and return the new object, return `true` to allow the addition to
       * proceed as normal, or return `false` to cancel the addition of the group.
       */
      onAddGroup?(ruleGroup: RG, parentPath: Path, query: RG, context?: any): RG | boolean;
      /**
       * This callback is invoked before a rule is moved or shifted. The function should return
       * `true` to allow the move/shift to proceed as normal, `false` to cancel it, or a new
       * query object which will become the new query state.
       */
      onMoveRule?(
        /** The rule being moved. */
        rule: R,
        /** The original path of the rule. */
        fromPath: Path,
        /** The target path of the rule, or the direction of the shift. */
        toPath: Path | 'up' | 'down',
        /** The current query, before the move. */
        query: RG,
        /** The next query, if the move is allowed to proceed. */
        nextQuery: RG,
        /** The options passed to `move` to generate `nextQuery`. */
        options: MoveOptions,
        context?: any
      ): RG | boolean;
      /**
       * This callback is invoked before a group is moved or shifted. See
       * {@link QueryBuilderProps.onMoveRule}.
       */
      onMoveGroup?(
        /** The group being moved. */
        ruleGroup: RG,
        /** The original path of the group. */
        fromPath: Path,
        /** The target path of the group, or the direction of the shift. */
        toPath: Path | 'up' | 'down',
        /** The current query, before the move. */
        query: RG,
        /** The next query, if the move is allowed to proceed. */
        nextQuery: RG,
        /** The options passed to `move` to generate `nextQuery`. */
        options: MoveOptions,
        context?: any
      ): RG | boolean;
      /**
       * This callback is invoked before a rule is grouped with another object. The function
       * should return `true` to allow the grouping to proceed as normal, `false` to cancel it,
       * or a new query object which will become the new query state.
       */
      onGroupRule?(
        /** The rule being moved. */
        rule: R,
        /** The original path of the rule. */
        fromPath: Path,
        /** The path of the target object to group the rule with. */
        toPath: Path,
        /** The current query, before the group. */
        query: RG,
        /** The next query, if the group is allowed to proceed. */
        nextQuery: RG,
        /** The options passed to `group` to generate `nextQuery`. */
        options: GroupOptions,
        context?: any
      ): RG | boolean;
      /**
       * This callback is invoked before a group is grouped with another object. See
       * {@link QueryBuilderProps.onGroupRule}.
       */
      onGroupGroup?(
        /** The group being moved. */
        ruleGroup: RG,
        /** The original path of the group. */
        fromPath: Path,
        /** The path of the target object to group the group with. */
        toPath: Path,
        /** The current query, before the group. */
        query: RG,
        /** The next query, if the group is allowed to proceed. */
        nextQuery: RG,
        /** The options passed to `group` to generate `nextQuery`. */
        options: GroupOptions,
        context?: any
      ): RG | boolean;
      /**
       * This callback is invoked before a rule or group is removed. The function should return
       * `true` if the rule or group should be removed or `false` if it should not be removed.
       */
      onRemove?(ruleOrGroup: R | RG, path: Path, query: RG, context?: any): boolean;
      /**
       * This callback is invoked anytime the query state is updated.
       */
      onQueryChange?(query: RG): void;
      /**
       * Each log object will be passed to this function when `debugMode` is `true`.
       *
       * @default console.log
       */
      onLog?(obj: any): void;
      /**
       * Disables the entire query builder if true, or the rules and groups at the specified
       * paths (as well as all child rules/groups and subcomponents) if an array of paths is
       * provided. If the root path is specified (`disabled={[[]]}`), no changes to the query
       * are allowed.
       *
       * @default false
       */
      disabled?: boolean | Path[];
      /**
       * Store values as numbers whenever possible.
       *
       * _**TIP: Try `"strict-limited"` first.**_
       *
       * @default false
       */
      parseNumbers?: ParseNumbersPropConfig;
      /**
       * Query validation function.
       */
      validator?: QueryValidator;
      /**
       * `id` generator function. Should always produce a unique/random value.
       *
       * @default crypto.randomUUID
       */
      idGenerator?: () => string;
      /**
       * Generator function for the `title` attribute applied to the outermost `<div>` of each
       * rule group.
       */
      accessibleDescriptionGenerator?: AccessibleDescriptionGenerator;
      /**
       * Maximum number of levels deep the query is allowed to go. The minimum is 1; values
       * less than 1 will be ignored.
       */
      maxLevels?: number;
      /**
       * Container for custom props that are passed to all components.
       */
      context?: any;
    }
  : never;

/**
 * {@link QueryBuilderProps} for the common case: a standard {@link RuleGroupType} query with
 * the default field, operator, and combinator types.
 *
 * `QueryBuilder` is generic in all four type parameters, but they all have defaults, so this is
 * only a convenience name for the fully-defaulted form.
 *
 * @group Props
 */
export type SimpleQueryBuilderProps = QueryBuilderProps<RuleGroupType>;

/**
 * {@link QueryBuilderProps} for a query with independent combinators.
 *
 * @group Props
 */
export type SimpleQueryBuilderPropsIC = QueryBuilderProps<RuleGroupTypeIC>;

/**
 * {@link RuleProps} with the default type parameters.
 *
 * @group Props
 */
export type SimpleRuleProps = RuleProps;

/**
 * {@link RuleGroupProps} with the default type parameters.
 *
 * @group Props
 */
export type SimpleRuleGroupProps = RuleGroupProps;
