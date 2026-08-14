import type {
  QueryActions,
  RuleGroupType,
  RuleGroupTypeAny,
  RuleType,
} from '@react-querybuilder/core';
import { defaultTranslations } from '@react-querybuilder/core';
import type { QueryBuilderState } from '../src/reactive/createQueryBuilder.js';
import type { QueryBuilderProps, RuleGroupProps, RuleProps } from '../src/types/index.js';

/**
 * Test support for the reactive suites. Lives outside `src/` so it is neither built into `dist`
 * nor counted against the coverage threshold.
 */

/** A deterministic id generator, so seeded queries are reproducible. */
export const createIdGenerator = (prefix = 'id'): (() => string) => {
  let i = 0;
  return () => `${prefix}-${i++}`;
};

export const testFields = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
  { name: 'age', label: 'Age', inputType: 'number' as const },
];

/** A no-op {@link QueryActions} whose calls are recorded, for the per-node state suites. */
export interface RecordedAction {
  name: string;
  // oxlint-disable-next-line typescript/no-explicit-any
  args: any[];
}

export const createRecordingActions = (): { actions: QueryActions; calls: RecordedAction[] } => {
  const calls: RecordedAction[] = [];
  const record =
    (name: string) =>
    // oxlint-disable-next-line typescript/no-explicit-any
    (...args: any[]) => {
      calls.push({ name, args });
    };

  return {
    calls,
    actions: {
      onRuleAdd: record('onRuleAdd'),
      onGroupAdd: record('onGroupAdd'),
      onPropChange: record('onPropChange'),
      onRuleRemove: record('onRuleRemove'),
      onGroupRemove: record('onGroupRemove'),
      moveRule: record('moveRule'),
      groupRule: record('groupRule'),
    } as unknown as QueryActions,
  };
};

/**
 * The default `QueryBuilder` props used across the suites.
 *
 * Overrides are loosely typed: `Partial<QueryBuilderProps<RuleGroupTypeAny>>` distributes over
 * the `RuleGroupType | RuleGroupTypeIC` conditional and collapses to the IC branch, which would
 * reject a standard query.
 */
export const baseProps = (
  overrides: Record<string, unknown> = {}
): QueryBuilderProps<RuleGroupTypeAny> =>
  ({
    fields: testFields,
    idGenerator: createIdGenerator(),
    enableMountQueryChange: false,
    ...overrides,
  }) as QueryBuilderProps<RuleGroupTypeAny>;

export const flatQuery: RuleGroupType = {
  combinator: 'and',
  rules: [
    { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' },
    { id: 'r1', field: 'lastName', operator: '=', value: 'Vai' },
  ],
};

/** Synthesizes {@link RuleProps} from a query builder state. */
export const ruleProps = (
  // oxlint-disable-next-line typescript/no-explicit-any
  state: QueryBuilderState<any, any>,
  rule: RuleType,
  overrides: Partial<RuleProps> = {}
): RuleProps => ({
  rule,
  path: [0],
  schema: state.schema as never,
  actions: state.actions,
  translations: defaultTranslations as never,
  ...overrides,
});

/** Synthesizes {@link RuleGroupProps} from a query builder state. */
export const ruleGroupProps = (
  // oxlint-disable-next-line typescript/no-explicit-any
  state: QueryBuilderState<any, any>,
  ruleGroup: RuleGroupTypeAny,
  overrides: Partial<RuleGroupProps> = {}
): RuleGroupProps => ({
  ruleGroup,
  path: [],
  schema: state.schema as never,
  actions: state.actions,
  translations: defaultTranslations as never,
  ...overrides,
});
