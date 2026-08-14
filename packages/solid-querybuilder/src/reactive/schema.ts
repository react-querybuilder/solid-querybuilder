import type {
  FullCombinator,
  FullField,
  FullOperator,
  FullOption,
  FullOptionList,
  FullOptionRecord,
  GetOptionIdentifierType,
  InputType,
  MatchModeOptions,
  Option,
  Path,
  QueryManager,
  RuleGroupTypeAny,
  RuleType,
  ValidationMap,
  ValueEditorType,
  ValueSourceFullOptions,
} from '@react-querybuilder/core';
import {
  generateAccessibleDescription,
  getRuleDefaultValue,
  prepareOptionList,
  resolveDefaultOperator,
  toFlatOptionArray,
} from '@react-querybuilder/core';
import type { Accessor } from 'solid-js';
import { createMemo } from 'solid-js';
import type { QueryBuilderProps } from '../types/props.js';
import type { Schema } from '../types/schema.js';
import type { LabelNode } from '../types/translations.js';
import type { MergedQueryBuilderConfig } from './context.js';

const defaultGetValueEditorSeparator = (): LabelNode => '';
const defaultGetRuleOrGroupClassname = (): string => '';

/** Everything {@link createSchema} needs from the rest of the state. */
export interface CreateSchemaOptions<F extends FullField, O extends FullOperator> {
  getProps: Accessor<QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>>;
  config: Accessor<MergedQueryBuilderConfig<F, GetOptionIdentifierType<O>>>;
  manager: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>;
  /** Bumped on every manager notification; keys the option lists so a reconfigure refreshes them. */
  configVersion: Accessor<number>;
  maxLevels: () => number;
  disabledPaths: Accessor<Path[]>;
  independentCombinators: () => boolean;
  validationMap: () => ValidationMap;
}

/**
 * Builds the {@link Schema} every subcomponent renders from, along with the option lists and
 * resolvers it exposes.
 *
 * The result is a **getter object**, not a memo returning a fresh object: a Solid context value is
 * read once by descendants, so every field must be a getter or consumers freeze on the first value.
 */
export const createSchema = <F extends FullField, O extends FullOperator>({
  getProps,
  config,
  manager,
  configVersion,
  maxLevels,
  disabledPaths,
  independentCombinators,
  validationMap,
}: CreateSchemaOptions<F, O>): Schema<F, GetOptionIdentifierType<O>> => {
  type OName = GetOptionIdentifierType<O>;
  type FName = GetOptionIdentifierType<F>;

  // Option lists are read off the manager, which prepares them from the same options — including
  // `translations`, which supplies the placeholder options when `autoSelect*` is `false`. Keyed
  // on `configVersion` so that a reconfigure refreshes them.
  const fields = createMemo(() => {
    configVersion();
    return manager.getFields();
  });
  const combinators = createMemo(() => {
    configVersion();
    return manager.getCombinators();
  });
  const fieldMap = createMemo(
    () =>
      Object.fromEntries(
        toFlatOptionArray(fields() as FullOptionList<FullOption>).map(f => [f.value ?? f.name, f])
      ) as Partial<FullOptionRecord<F>>
  );

  const getParameters = (
    field?: string,
    operator?: string,
    misc?: { fieldData: F }
  ): FullOptionList<FullOption> =>
    prepareOptionList<FullOption>({
      optionList: getProps().getParameters?.(field as FName, operator as OName, misc) ?? [],
      autoSelectOption: true,
    }).optionList;

  const getOperators = (field: string): FullOptionList<O> =>
    manager.getOperators(field) as FullOptionList<O>;

  const getValueEditorType = (field: string, operator: string): ValueEditorType =>
    manager.getValueEditorType(field, operator);

  const getValues = (field: string, operator: string): FullOptionList<Option> =>
    manager.getValues(field, operator);

  const getValueSources = (field: string, operator: string): ValueSourceFullOptions =>
    manager.getValueSources(field, operator);

  const getMatchModes = (field: string): MatchModeOptions => manager.getMatchModes(field);

  const getInputType = (
    field: string,
    operator: string,
    { fieldData }: { fieldData: F }
  ): InputType | null =>
    getProps().getInputType?.(field as FName, operator as OName, { fieldData }) ?? 'text';

  const getSubQueryBuilderProps = (
    field: string,
    misc: { fieldData: F }
    // oxlint-disable-next-line typescript/no-explicit-any
  ): any => getProps().getSubQueryBuilderProps?.(field as FName, misc) ?? {};

  // The manager computes rule defaults internally for `createRule`; these expose the same
  // derivation to the schema, so they must stay in sync with the manager's option lists.
  const getRuleDefaultValueMain = (rule: RuleType): unknown =>
    getRuleDefaultValue<F>(rule, {
      fieldData: manager.getFieldData(rule.field),
      fields: fields(),
      getParameters,
      getValueEditorType,
      getValues,
      listsAsArrays: config().listsAsArrays,
      getDefaultValue: getProps().getDefaultValue as never,
    });

  const getRuleDefaultOperator = (field: string): string =>
    resolveDefaultOperator<F>({
      field,
      fieldData: manager.getFieldData(field),
      getDefaultOperator: getProps().getDefaultOperator as never,
      getOperators,
    });

  return {
    manager,
    get fields() {
      return fields();
    },
    get fieldMap() {
      return fieldMap() as Schema<F, OName>['fieldMap'];
    },
    get classNames() {
      return config().classNames;
    },
    get combinators() {
      return combinators();
    },
    get controls() {
      return config().controls;
    },
    getParameters,
    createRule: () => manager.createRule(),
    createRuleGroup: (ic?: boolean) => manager.createRuleGroup(ic ?? independentCombinators()),
    getQuery: manager.getQuery,
    getOperators: getOperators as Schema<F, OName>['getOperators'],
    getValueEditorType,
    getValueEditorSeparator: (field, operator, misc) =>
      (getProps().getValueEditorSeparator ?? defaultGetValueEditorSeparator)(
        field as FName,
        operator as OName,
        misc
      ),
    getValueSources: (field, operator) => getValueSources(field, operator),
    getInputType,
    getValues,
    getRuleDefaultValue: getRuleDefaultValueMain,
    getRuleDefaultOperator,
    getMatchModes: (field: string) => getMatchModes(field),
    getSubQueryBuilderProps,
    getRuleClassname: (rule, misc) =>
      (getProps().getRuleClassname ?? defaultGetRuleOrGroupClassname)(rule as never, misc),
    getRuleGroupClassname: ruleGroup =>
      (getProps().getRuleGroupClassname ?? defaultGetRuleOrGroupClassname)(ruleGroup as never),
    get accessibleDescriptionGenerator() {
      return getProps().accessibleDescriptionGenerator ?? generateAccessibleDescription;
    },
    get showCombinatorsBetweenRules() {
      return config().showCombinatorsBetweenRules;
    },
    get showNotToggle() {
      return config().showNotToggle;
    },
    get showShiftActions() {
      return config().showShiftActions;
    },
    get showUndoRedo() {
      return config().showUndoRedo;
    },
    get showCloneButtons() {
      return config().showCloneButtons;
    },
    get showLockButtons() {
      return config().showLockButtons;
    },
    get showMuteButtons() {
      return config().showMuteButtons;
    },
    get autoSelectField() {
      return config().autoSelectField;
    },
    get autoSelectOperator() {
      return config().autoSelectOperator;
    },
    get autoSelectValue() {
      return config().autoSelectValue;
    },
    get addRuleToNewGroups() {
      return config().addRuleToNewGroups;
    },
    get enableDragAndDrop() {
      return config().enableDragAndDrop;
    },
    get validationMap() {
      return validationMap();
    },
    get independentCombinators() {
      return independentCombinators();
    },
    get listsAsArrays() {
      return config().listsAsArrays;
    },
    get parseNumbers() {
      return getProps().parseNumbers ?? false;
    },
    get disabledPaths() {
      return disabledPaths();
    },
    get suppressStandardClassnames() {
      return config().suppressStandardClassnames;
    },
    get maxLevels() {
      return maxLevels();
    },
    get resetOnFieldChange() {
      return config().resetOnFieldChange;
    },
    get resetOnOperatorChange() {
      return config().resetOnOperatorChange;
    },
  };
};
