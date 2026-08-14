import type {
  Classnames,
  FullCombinator,
  FullField,
  FullOperator,
  GetOptionIdentifierType,
  QueryActions,
  QueryManager,
  RuleGroupTypeAny,
  ValidationMap,
} from '@react-querybuilder/core';
import { deriveQueryBuilderClassNames, isRuleGroupTypeIC } from '@react-querybuilder/core';
import type { Accessor, Store } from 'solid-js';
import { createMemo, untrack } from 'solid-js';
import { createRuleActions } from '../actions.js';
import type { Controls } from '../types/controls.js';
import type { QueryBuilderContextProps, QueryBuilderProps } from '../types/props.js';
import type { Schema } from '../types/schema.js';
import type { TranslationsFull } from '../types/translations.js';
import { createContextValue } from './context-value.js';
import type { MergedQueryBuilderConfig } from './context.js';
import { emptyValidationMap, mergeQueryBuilderConfig, useQueryBuilderConfig } from './context.js';
import type { QueryTree } from './manager-bridge.js';
import { createManagerBridge } from './manager-bridge.js';
import { createManagerOptions } from './manager-options.js';
import { createSchema } from './schema.js';

/**
 * Everything a `QueryBuilder` component needs to render, derived from its props and driven by a
 * {@link QueryManager}.
 *
 * Data members are **getters**, so the whole object can be read once by a Solid context or
 * passed as a prop without any consumer freezing on the first value.
 */
export interface QueryBuilderState<F extends FullField, O extends string> {
  /** The current query, by identity. Reassigned whenever the manager notifies. */
  readonly query: RuleGroupTypeAny;
  /**
   * The store mirror of the query, reconciled by `id`. Internal: it is the read path for
   * components, has no setter, and is not part of the public API.
   *
   * @internal
   */
  readonly tree: Store<QueryTree>;
  /** The root group, read from the store mirror so `<For>` sees stable identities. */
  readonly rootGroup: RuleGroupTypeAny;
  readonly manager: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>;
  readonly schema: Schema<F, O>;
  readonly actions: QueryActions;
  readonly translations: TranslationsFull;
  readonly controls: Controls<F, O>;
  readonly classNames: Classnames;
  readonly wrapperClassName: string;
  readonly dndEnabledAttr: string;
  readonly inlineCombinatorsAttr: string;
  readonly rootGroupDisabled: boolean;
  readonly queryDisabled: boolean;
  readonly independentCombinators: boolean;
  /** The config to hand to `<QueryBuilderContext value={…}>`. */
  readonly context: QueryBuilderContextProps<F, O>;
}

/**
 * Options for {@link createQueryBuilder} that cannot be expressed as `QueryBuilderProps`.
 */
export interface CreateQueryBuilderOptions<F extends FullField, O extends string> {
  /**
   * Default components for every control, applied last in the `controlElements` merge. Provided
   * by the component layer so this module stays free of component imports.
   */
  defaultControls?: Partial<Controls<F, O>>;
  /**
   * Inherited context. Defaults to {@link useQueryBuilderConfig}.
   */
  context?: QueryBuilderContextProps<F, O>;
}

/**
 * The headless query builder primitive: everything the `QueryBuilder` component renders from,
 * with no rendering of its own. Use it directly to drive a custom UI, or let `<QueryBuilder />`
 * call it for you.
 *
 * The query lives in a {@link QueryManager}. Pass an externally created manager as the `manager`
 * prop to drive the query from outside the component tree.
 *
 * Structural manager options (`fields`, `operators`, `combinators`, and the boolean flags) are
 * applied in place with `QueryManager#reconfigure` whenever the corresponding props change, so
 * the query, the undo/redo history, and every subscriber survive a config change. Function props
 * (`getOperators`, `getDefaultValue`, etc.) are forwarded through closures, so those stay live
 * without any reconfiguration at all. An externally supplied `manager` prop is never
 * reconfigured.
 *
 * @param props - The `QueryBuilder` props. Solid props are already reactive getters, so they can
 * be passed directly; an accessor is also accepted, for a synthesized props object.
 */
export const createQueryBuilder = <
  F extends FullField = FullField,
  O extends FullOperator = FullOperator,
>(
  props:
    | QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>
    | Accessor<QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>>,
  options: CreateQueryBuilderOptions<F, GetOptionIdentifierType<O>> = {}
): QueryBuilderState<F, GetOptionIdentifierType<O>> => {
  type OName = GetOptionIdentifierType<O>;

  const getProps: Accessor<QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>> =
    typeof props === 'function' ? props : () => props;

  const inheritedContext = options.context ?? useQueryBuilderConfig<F, OName>();

  const config = createMemo(
    () =>
      mergeQueryBuilderConfig<F, OName>({
        props: getProps(),
        context: inheritedContext,
        defaultControls: options.defaultControls,
      }) satisfies MergedQueryBuilderConfig<F, OName>
  );

  // ⚠️ `untrack` wraps the *property* reads, not just the call that returns the props object.
  // Solid props are getters, so reading one outside a tracking scope is what raises
  // `[STRICT_READ_UNTRACKED]` — one warning per setup read, on every mount. These reads are
  // deliberately one-time (this is initialization), so declaring that is the fix.
  const initialProps = untrack(getProps);

  const { maxLevels, disabledPaths, buildManagerOptions, structuralOptions } = createManagerOptions<
    F,
    O
  >(getProps, config);

  const { manager, query, tree, configVersion } = createManagerBridge<F, O>({
    getProps,
    config,
    initialProps,
    buildManagerOptions,
    structuralOptions,
  });

  const actions = createRuleActions<F, O>(getProps, manager);

  // Plain closures: each returns a primitive over reads that allocate nothing.
  const independentCombinators = (): boolean => isRuleGroupTypeIC(query());
  const queryDisabled = (): boolean => getProps().disabled === true;
  const rootGroupDisabled = (): boolean =>
    !!query().disabled || disabledPaths().some(p => p.length === 0);

  const validationResult = createMemo(() => {
    const { validator } = getProps();
    return typeof validator === 'function' ? validator(query()) : emptyValidationMap;
  });
  // `validationResult` stays memoized — it runs a user callback. This only reshapes its result.
  const validationMap = (): ValidationMap => {
    const result = validationResult();
    return typeof result === 'boolean' ? emptyValidationMap : result;
  };

  // A disabled root *group* does not disable the wrapper, so this reads `queryDisabled` rather
  // than `rootGroupDisabled`.
  const wrapperClassName = createMemo(() =>
    deriveQueryBuilderClassNames({
      classNames: config().classNames,
      suppressStandardClassnames: config().suppressStandardClassnames,
      disabled: queryDisabled(),
      validationResult: validationResult(),
    })
  );

  const inlineCombinatorsAttr = (): string =>
    independentCombinators() || config().showCombinatorsBetweenRules ? 'enabled' : 'disabled';

  const schema = createSchema<F, O>({
    getProps,
    config,
    manager,
    configVersion,
    maxLevels,
    disabledPaths,
    independentCombinators,
    validationMap,
  });

  const contextValue = createContextValue<F, O>(config);

  return {
    get query() {
      return query();
    },
    tree,
    get rootGroup() {
      return tree.root;
    },
    manager,
    schema,
    actions,
    get translations() {
      return config().translations;
    },
    get controls() {
      return config().controls;
    },
    get classNames() {
      return config().classNames;
    },
    get wrapperClassName() {
      return wrapperClassName();
    },
    // Drag-and-drop is a non-goal, but the attribute must be present for DOM parity.
    dndEnabledAttr: 'disabled',
    get inlineCombinatorsAttr() {
      return inlineCombinatorsAttr();
    },
    get rootGroupDisabled() {
      return rootGroupDisabled();
    },
    get queryDisabled() {
      return queryDisabled();
    },
    get independentCombinators() {
      return independentCombinators();
    },
    context: contextValue,
  };
};
