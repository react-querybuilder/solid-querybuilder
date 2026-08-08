import type {
  Classnames,
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
  QueryActions,
  QueryManagerOptions,
  RuleGroupTypeAny,
  RuleType,
  ValueEditorType,
  ValueSourceFullOptions,
} from '@react-querybuilder/core';
import {
  QueryManager,
  deriveQueryBuilderClassNames,
  generateAccessibleDescription,
  getRuleDefaultValue,
  isRuleGroupTypeIC,
  prepareOptionList,
  resolveCandidateQuery,
  resolveDefaultOperator,
  toFlatOptionArray,
  unchangedSignature,
} from '@react-querybuilder/core';
import type { Accessor, Store } from 'solid-js';
import {
  createEffect,
  createMemo,
  createProjection,
  createSignal,
  onCleanup,
  snapshot,
  untrack,
} from 'solid-js';
import type { Controls } from '../types/controls.js';
import type { QueryBuilderContextProps, QueryBuilderProps } from '../types/props.js';
import type { Schema } from '../types/schema.js';
import type { LabelNode, TranslationsFull } from '../types/translations.js';
import type { MergedQueryBuilderConfig } from './context.js';
import { emptyValidationMap, mergeQueryBuilderConfig, useQueryBuilderConfig } from './context.js';
import { createRuleActions } from './createRuleActions.js';

const emptyDisabledPaths: Path[] = [];
const defaultGetValueEditorSeparator = (): LabelNode => '';
const defaultGetRuleOrGroupClassname = (): string => '';

/** The store mirror's shape. The query is nested so the mirror itself is a stable object. */
interface QueryTree {
  root: RuleGroupTypeAny;
}

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
const valuesEqual = (a: unknown, b: unknown): boolean => {
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
 * Options for {@link createQueryBuilderState} that cannot be expressed as `QueryBuilderProps`.
 */
export interface CreateQueryBuilderStateOptions<F extends FullField, O extends string> {
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
 * Builds the reactive state for a query builder.
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
export const createQueryBuilderState = <
  F extends FullField = FullField,
  O extends FullOperator = FullOperator,
>(
  props:
    | QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>
    | Accessor<QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>>,
  options: CreateQueryBuilderStateOptions<F, GetOptionIdentifierType<O>> = {}
): QueryBuilderState<F, GetOptionIdentifierType<O>> => {
  type OName = GetOptionIdentifierType<O>;
  type FName = GetOptionIdentifierType<F>;

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

  // #region Manager
  // ⚠️ `untrack` wraps the *property* reads, not just the call that returns the props object.
  // Solid props are getters, so reading one outside a tracking scope is what raises
  // `[STRICT_READ_UNTRACKED]` — one warning per setup read, on every mount. These reads are
  // deliberately one-time (this is initialization), so declaring that is the fix.
  const initialProps = untrack(getProps);
  const initialManager = untrack(() => snapshot(initialProps.manager)) as
    | QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>
    | undefined;

  const maxLevels = createMemo(() =>
    (getProps().maxLevels ?? 0) > 0 ? Number(getProps().maxLevels) : Infinity
  );
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
  const structuralOptions = () => {
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

  const manager =
    initialManager ??
    new QueryManager<RuleGroupTypeAny, F, O, FullCombinator>(
      undefined,
      untrack(buildManagerOptions)
    );

  if (!initialManager) {
    const candidate = untrack(() =>
      resolveCandidateQuery(
        {
          // `snapshot` throughout: the manager deep-freezes what it is given, which throws on a
          // store proxy. A parent holding the query in its own `createStore` is the common case.
          query: snapshot(initialProps.query),
          defaultQuery: snapshot(initialProps.defaultQuery),
          fallbackQuery: manager.getQuery(),
        },
        { idGenerator: initialProps.idGenerator }
      )
    );
    if (!Object.is(candidate, manager.getQuery())) {
      manager.setQuery(snapshot(candidate));
      // Seeding the query is not a user action, so it must not be undoable. Without this,
      // `UndoRedoActions` would render an enabled "undo" button on first paint.
      manager.clearHistory();
    }
  }
  // #endregion

  // #region Option lists
  // Read off the manager, which prepares them from the same options — including `translations`,
  // which supplies the placeholder options when `autoSelect*` is `false`. Keyed on
  // `configVersion` so that a reconfigure (see below) refreshes them.
  const [configVersion, setConfigVersion] = createSignal(manager.getConfigVersion());

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
  // #endregion

  // #region Resolvers
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
  // #endregion

  // #region Query state — the hybrid
  // The identity signal: used for reference comparisons and as the dependency for the per-node
  // contexts. A plain signal, never a store — queries are immutable, replaced wholesale, and a
  // deep proxy would be rejected by the manager's deep freeze.
  const [query, setQuery] = createSignal<RuleGroupTypeAny>(manager.getQuery());

  // Bumped by the subscriber; read by the projection below. This is how a derived store is
  // driven from a non-reactive external source.
  const [queryVersion, setQueryVersion] = createSignal(0);

  // The store mirror, and the read path for components. `createProjection` reconciles by `id`
  // (its default key), so surviving rules and groups keep their proxy identity across a commit
  // and `<For each={…}>` sees stable identities. It is derived and read-only: there is no setter
  // path back into it.
  const tree = createProjection<QueryTree>(
    () => {
      queryVersion();
      return { root: manager.getQuery() };
    },
    { root: manager.getQuery() }
  );

  // A plain, non-reactive mirror of the committed query. The subscription callback runs
  // synchronously inside whichever effect triggered the mutation, so comparing against reactive
  // state there would make that effect depend on the state it just caused to change.
  let committed = manager.getQuery();

  /**
   * Publishes a committed query. Called from the manager subscription rather than from a
   * separate effect, so it fires exactly once per commit — including inside `manager.batch()`,
   * which notifies once for the whole batch. (`manager.batch()` is core's batching and is
   * unrelated to Solid 1's removed `batch()`.)
   */
  const commit = (nextQuery: RuleGroupTypeAny): void => {
    committed = nextQuery;
    setQuery(nextQuery);
    setQueryVersion(v => v + 1);
    getProps().onQueryChange?.(nextQuery as never);
  };

  onCleanup(
    manager.subscribe(() => {
      // A reconfigure notifies without touching the query. Refresh the config version
      // unconditionally, but only commit — and therefore only fire `onQueryChange` — when the
      // query actually changed.
      setConfigVersion(manager.getConfigVersion());
      const nextQuery = manager.getQuery();
      if (!Object.is(nextQuery, committed)) {
        commit(nextQuery);
      }
    })
  );

  if (untrack(() => config().enableMountQueryChange)) {
    // Matches React's post-commit mount effect: an effect with a constant compute phase runs
    // once, after render, and never during SSR.
    createEffect(
      () => undefined,
      () => {
        getProps().onQueryChange?.(untrack(query) as never);
      }
    );
  }

  // Controlled mode: a new `query` prop is pushed into the manager. The two-stage guard is what
  // prevents a feedback loop with the subscription above. Reference equality alone is not
  // enough: a parent that holds the query in its own store hands back a proxy of the very object
  // just emitted, which is never `Object.is`-equal to it.
  createEffect(
    () => getProps().query,
    nextQuery => {
      if (!nextQuery) return;
      const raw = snapshot(nextQuery);
      if (Object.is(raw, manager.getQuery())) return;
      if (manager.signatureOf(raw) === unchangedSignature) return;
      manager.setQuery(raw);
    }
  );

  // Structural options are applied in place, so the query, the undo/redo history, and every
  // subscriber survive a config change. Skipped entirely for an externally supplied manager:
  // that one belongs to the consumer, so the pass-through path stays pure.
  //
  // `{ defer: true }`: the constructor already applied these options, and a mount-time run would
  // bump `configVersion` and notify before first paint, which is a DOM-parity hazard.
  if (!initialManager) {
    let appliedSignature = untrack(structuralOptions);

    createEffect(
      // The compute phase reads the structural props and the parts of `config` the manager
      // consumes, which is what registers the dependencies. It returns a fresh object every run,
      // so `valuesEqual` — not identity — is what suppresses the apply phase.
      structuralOptions,
      next => {
        if (valuesEqual(next, appliedSignature)) return;
        appliedSignature = next;
        manager.reconfigure(buildManagerOptions());
      },
      { defer: true }
    );
  }
  // #endregion

  const actions = createRuleActions<F, O>(getProps, manager);

  // #region Derived config
  const independentCombinators = createMemo(() => isRuleGroupTypeIC(query()));
  const queryDisabled = createMemo(() => getProps().disabled === true);
  const rootGroupDisabled = createMemo(
    () => !!query().disabled || disabledPaths().some(p => p.length === 0)
  );

  const validationResult = createMemo(() => {
    const { validator } = getProps();
    return typeof validator === 'function' ? validator(query()) : emptyValidationMap;
  });
  const validationMap = createMemo(() => {
    const result = validationResult();
    return typeof result === 'boolean' ? emptyValidationMap : result;
  });

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

  const inlineCombinatorsAttr = createMemo(() =>
    independentCombinators() || config().showCombinatorsBetweenRules ? 'enabled' : 'disabled'
  );
  // #endregion

  // A getter object, not a memo returning a fresh object: a Solid context value is read once by
  // descendants, so every field must be a getter or consumers freeze on the first value.
  const schema: Schema<F, OName> = {
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

  const contextValue: QueryBuilderContextProps<F, OName> = {
    get controlElements() {
      return config().controls;
    },
    get controlClassnames() {
      return config().classNames;
    },
    get translations() {
      return config().translations;
    },
    get debugMode() {
      return config().debugMode;
    },
    get enableMountQueryChange() {
      return config().enableMountQueryChange;
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
    get resetOnFieldChange() {
      return config().resetOnFieldChange;
    },
    get resetOnOperatorChange() {
      return config().resetOnOperatorChange;
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
    get listsAsArrays() {
      return config().listsAsArrays;
    },
    get suppressStandardClassnames() {
      return config().suppressStandardClassnames;
    },
  };

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
