import type {
  AccessibleDescriptionGenerator,
  Classname,
  Classnames,
  FullCombinator,
  FullField,
  FullOperator,
  FullOption,
  FullOptionList,
  GetOptionIdentifierType,
  InputType,
  MatchModeOptions,
  Option,
  ParseNumbersPropConfig,
  Path,
  QueryManager,
  RuleGroupTypeAny,
  RuleType,
  ValidationMap,
  ValueEditorType,
  ValueSourceFullOptions,
} from '@react-querybuilder/core';
import type { Controls } from './controls.js';
import type { QueryBuilderProps } from './props.js';
import type { LabelNode } from './translations.js';

/**
 * Configuration options passed in the `schema` prop from `QueryBuilder` to each subcomponent.
 *
 * React Query Builder's `qbId` and `dispatchQuery` are absent: there is no Redux store and no
 * query builder registry. The {@link QueryManager} driving this query builder is exposed as
 * `manager` instead; all query mutations go through it.
 *
 * @group Props
 */
export interface Schema<F extends FullField, O extends string> {
  /**
   * The {@link QueryManager} driving this query builder. All query mutations go through it.
   */
  manager: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>;
  fields: FullOptionList<F>;
  fieldMap: Partial<Record<GetOptionIdentifierType<F>, F>>;
  classNames: Classnames;
  combinators: FullOptionList<FullCombinator>;
  getParameters(
    field?: string,
    operator?: string,
    meta?: { fieldData: F }
  ): FullOptionList<FullOption>;
  controls: Controls<F, O>;
  createRule(): RuleType;
  createRuleGroup(ic?: boolean): RuleGroupTypeAny;
  getQuery(): RuleGroupTypeAny;
  getOperators(field: string, meta: { fieldData: F }): FullOptionList<FullOperator>;
  getValueEditorType(field: string, operator: string, meta: { fieldData: F }): ValueEditorType;
  getValueEditorSeparator(field: string, operator: string, meta: { fieldData: F }): LabelNode;
  getValueSources(field: string, operator: string, meta: { fieldData: F }): ValueSourceFullOptions;
  getInputType(field: string, operator: string, meta: { fieldData: F }): InputType | null;
  getValues(field: string, operator: string, meta: { fieldData: F }): FullOptionList<Option>;
  getRuleDefaultValue(rule: RuleType): unknown;
  getRuleDefaultOperator(field: string): string;
  getMatchModes(field: string, misc: { fieldData: F }): MatchModeOptions;
  getSubQueryBuilderProps(
    field: GetOptionIdentifierType<F>,
    misc: { fieldData: F }
  ): QueryBuilderProps<RuleGroupTypeAny, FullOption, FullOption, FullOption>;
  getRuleClassname(rule: RuleType, misc: { fieldData: F }): Classname;
  getRuleGroupClassname(ruleGroup: RuleGroupTypeAny): Classname;
  accessibleDescriptionGenerator: AccessibleDescriptionGenerator;
  showCombinatorsBetweenRules: boolean;
  showNotToggle: boolean;
  showShiftActions: boolean;
  showUndoRedo: boolean;
  showCloneButtons: boolean;
  showLockButtons: boolean;
  showMuteButtons: boolean;
  autoSelectField: boolean;
  autoSelectOperator: boolean;
  autoSelectValue: boolean;
  addRuleToNewGroups: boolean;
  /**
   * Always `false` in this package; drag-and-drop is a non-goal. Retained because it feeds the
   * root element's `data-dnd` attribute, which must be present for DOM parity.
   */
  enableDragAndDrop: boolean;
  validationMap: ValidationMap;
  independentCombinators: boolean;
  listsAsArrays: boolean;
  parseNumbers: ParseNumbersPropConfig;
  disabledPaths: Path[];
  suppressStandardClassnames: boolean;
  maxLevels: number;
  resetOnFieldChange: boolean;
  resetOnOperatorChange: boolean;
}
