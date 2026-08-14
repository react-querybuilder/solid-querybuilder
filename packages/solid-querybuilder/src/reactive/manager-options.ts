import type {
  FullCombinator,
  FullField,
  FullOperator,
  GetOptionIdentifierType,
  Path,
  QueryManagerOptions,
  RuleGroupTypeAny,
} from '@react-querybuilder/core';
import type { Accessor } from 'solid-js';
import { createMemo, snapshot } from 'solid-js';
import type { QueryBuilderProps } from '../types/props.js';
import type { MergedQueryBuilderConfig } from './context.js';

const emptyDisabledPaths: Path[] = [];

/**
 * Structural equality for manager option values, used to decide whether a prop change is worth a
 * `reconfigure`. Arrays and plain objects are compared by value; everything else — functions
 * included — by identity, which is what makes a config object rebuilt on every render compare
 * equal as long as its data did not change.
 *
 * This is load-bearing, not an optimization: any caller that rebuilds its props object per render
 * (the conformance harness does, and so does every consumer passing object literals) hands the
 * effect a fresh identity for every structural read, so an identity-only gate would make the
 * effect self-perpetuating. A split effect narrows the *tracked set*, but its compute phase still
 * reads a fresh identity every run, so it does not solve this by itself.
 */
export const valuesEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => valuesEqual(v, b[i]))
    );
  }
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null ||
    Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)
  ) {
    return false;
  }
  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every(k =>
      valuesEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    )
  );
};

/** What {@link createManagerOptions} returns. */
export interface ManagerOptionsParts<F extends FullField, O extends FullOperator> {
  /** `maxLevels` as the manager wants it: `Infinity` when unset or non-positive. */
  readonly maxLevels: () => number;
  /** The `disabled` prop when it is a path array, memoized for `valuesEqual`. */
  readonly disabledPaths: Accessor<Path[]>;
  /** The full option set, for construction and for every `reconfigure`. */
  readonly buildManagerOptions: () => QueryManagerOptions<F, O, FullCombinator>;
  /** The reconfigure-worthy subset; doubles as the reconfigure effect's compute phase. */
  readonly structuralOptions: () => Record<string, unknown>;
}

/**
 * Derives everything the {@link QueryManager} is configured with from props and the merged config.
 *
 * @param getProps - Reads the current props.
 * @param config - The merged `QueryBuilder` config.
 * @param initialProps - The props as read once, untracked, at initialization. Used only to decide
 * which function props were supplied, which fixes the manager's precedence rules for the lifetime
 * of the manager.
 */
export const createManagerOptions = <F extends FullField, O extends FullOperator>(
  getProps: Accessor<QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>>,
  config: Accessor<MergedQueryBuilderConfig<F, GetOptionIdentifierType<O>>>,
  initialProps: QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>
): ManagerOptionsParts<F, O> => {
  // A plain closure: it returns a primitive, so there is no identity to stabilize.
  const maxLevels = (): number =>
    (getProps().maxLevels ?? 0) > 0 ? Number(getProps().maxLevels) : Infinity;
  // Memoized, unlike `maxLevels`: it returns an array, and `structuralOptions` compares it by
  // value. Identity stability is the point here, not the cost of the derivation.
  const disabledPaths = createMemo(() =>
    Array.isArray(getProps().disabled) ? (getProps().disabled as Path[]) : emptyDisabledPaths
  );

  /**
   * Forwards a function prop to the manager through a closure, so later changes to the prop take
   * effect without rebuilding the manager. Returns `undefined` when the prop is absent at
   * initialization, leaving the manager to apply its own precedence rules instead of treating
   * the option as configured.
   */
  const live = <A extends unknown[], R>(
    pick: (props: QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>) => unknown
  ): ((...args: A) => R) | undefined =>
    typeof pick(initialProps) === 'function'
      ? (...args: A) => (pick(getProps()) as (...args: A) => R)(...args)
      : undefined;

  /**
   * Builds the full option set for the manager. Used both for construction and for every
   * `reconfigure` call, so the two cannot drift — the same discipline the manager's own
   * `#applyOptions` enforces upstream.
   *
   * `snapshot` throughout: the manager deep-freezes what it is given, which throws on a store
   * proxy, and a consumer holding `fields` in a store is an ordinary case.
   */
  const buildManagerOptions = (): QueryManagerOptions<F, O, FullCombinator> => {
    const p = getProps();
    const c = config();
    return {
      fields: snapshot(p.fields),
      operators: snapshot(p.operators),
      combinators: snapshot(p.combinators),
      baseField: snapshot(p.baseField),
      baseOperator: snapshot(p.baseOperator),
      baseCombinator: snapshot(p.baseCombinator),
      autoSelectField: c.autoSelectField,
      autoSelectOperator: c.autoSelectOperator,
      autoSelectValue: c.autoSelectValue,
      // The manager prepares every option list, including the placeholder options, so it needs
      // the merged translations. Everything rendered here reads those lists back off the
      // manager; `prepareOptionList` is deliberately not reimplemented locally.
      translations: snapshot(c.translations),
      addRuleToNewGroups: c.addRuleToNewGroups,
      listsAsArrays: c.listsAsArrays,
      resetOnFieldChange: c.resetOnFieldChange,
      resetOnOperatorChange: c.resetOnOperatorChange,
      maxLevels: maxLevels(),
      disabledPaths: snapshot(disabledPaths()),
      queryDisabled: p.disabled === true,
      history: true,
      validator: p.validator,
      idGenerator: p.idGenerator,
      // Forwarded so that changes to these props take effect without a reconfigure.
      getDefaultField: (typeof initialProps.getDefaultField === 'function'
        ? live(pp => pp.getDefaultField)
        : p.getDefaultField) as never,
      getDefaultOperator: (typeof initialProps.getDefaultOperator === 'function'
        ? live(pp => pp.getDefaultOperator)
        : p.getDefaultOperator) as never,
      getDefaultValue: live(pp => pp.getDefaultValue) as never,
      getOperators: live(pp => pp.getOperators) as never,
      getValueEditorType: live(pp => pp.getValueEditorType) as never,
      getValues: live(pp => pp.getValues) as never,
      getValueSources: live(pp => pp.getValueSources) as never,
      getMatchModes: live(pp => pp.getMatchModes) as never,
      getParameters: live(pp => pp.getParameters) as never,
      getInputType: live(pp => pp.getInputType) as never,
      getSubQueryBuilderProps: live(pp => pp.getSubQueryBuilderProps) as never,
    };
  };

  /**
   * The subset of the manager's options that cannot be forwarded through a closure, and so has to
   * be re-applied with `reconfigure` when it changes. Doubles as the reconfigure effect's compute
   * phase, i.e. its dependency declaration. Function props are deliberately excluded — they reach
   * the manager through `live()` closures and stay current on their own, and comparing them would
   * defeat the equality gate for anyone passing inline arrows.
   */
  const structuralOptions = (): Record<string, unknown> => {
    const p = getProps();
    const c = config();
    return {
      fields: p.fields,
      operators: p.operators,
      combinators: p.combinators,
      baseField: p.baseField,
      baseOperator: p.baseOperator,
      baseCombinator: p.baseCombinator,
      autoSelectField: c.autoSelectField,
      autoSelectOperator: c.autoSelectOperator,
      autoSelectValue: c.autoSelectValue,
      translations: c.translations,
      addRuleToNewGroups: c.addRuleToNewGroups,
      listsAsArrays: c.listsAsArrays,
      resetOnFieldChange: c.resetOnFieldChange,
      resetOnOperatorChange: c.resetOnOperatorChange,
      maxLevels: maxLevels(),
      disabledPaths: disabledPaths(),
      queryDisabled: p.disabled === true,
    };
  };

  return { maxLevels, disabledPaths, buildManagerOptions, structuralOptions };
};
