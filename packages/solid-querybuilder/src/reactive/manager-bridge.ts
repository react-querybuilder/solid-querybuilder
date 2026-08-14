import type {
  FullCombinator,
  FullField,
  FullOperator,
  GetOptionIdentifierType,
  QueryManagerOptions,
  RuleGroupTypeAny,
} from '@react-querybuilder/core';
import { QueryManager, resolveCandidateQuery, unchangedSignature } from '@react-querybuilder/core';
import type { Accessor, Store } from 'solid-js';
import {
  createEffect,
  createProjection,
  createSignal,
  onCleanup,
  snapshot,
  untrack,
} from 'solid-js';
import type { QueryBuilderProps } from '../types/props.js';
import type { MergedQueryBuilderConfig } from './context.js';
import { valuesEqual } from './manager-options.js';

/** The store mirror's shape. The query is nested so the mirror itself is a stable object. */
export interface QueryTree {
  root: RuleGroupTypeAny;
}

/** What {@link createManagerBridge} returns. */
export interface ManagerBridge<F extends FullField> {
  readonly manager: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>;
  /** The current query, by identity. Reassigned whenever the manager notifies. */
  readonly query: Accessor<RuleGroupTypeAny>;
  /** The store mirror of the query, reconciled by `id`. The read path for components. */
  readonly tree: Store<QueryTree>;
  /** Bumped on every manager notification, including a reconfigure. */
  readonly configVersion: Accessor<number>;
}

/** Everything {@link createManagerBridge} needs from the rest of the state. */
export interface ManagerBridgeOptions<F extends FullField, O extends FullOperator> {
  getProps: Accessor<QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>>;
  config: Accessor<MergedQueryBuilderConfig<F, GetOptionIdentifierType<O>>>;
  /** The props as read once, untracked, at initialization. */
  initialProps: QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>;
  buildManagerOptions: () => QueryManagerOptions<F, O, FullCombinator>;
  structuralOptions: () => Record<string, unknown>;
}

/**
 * Owns the {@link QueryManager} and the reactive mirror of its query: construction, initial-query
 * seeding, the version signals, the store projection, the subscription, and the three effects
 * (mount `onQueryChange`, controlled `query` push-down, and `reconfigure`).
 *
 * This is the whole non-reactive-to-reactive boundary; nothing else in the reactive layer talks
 * to the manager's notification channel.
 */
export const createManagerBridge = <F extends FullField, O extends FullOperator>({
  getProps,
  config,
  initialProps,
  buildManagerOptions,
  structuralOptions,
}: ManagerBridgeOptions<F, O>): ManagerBridge<F> => {
  // ⚠️ `untrack` wraps the *property* reads, not just the call that returns the props object.
  // Solid props are getters, so reading one outside a tracking scope is what raises
  // `[STRICT_READ_UNTRACKED]` — one warning per setup read, on every mount. These reads are
  // deliberately one-time (this is initialization), so declaring that is the fix.
  const initialManager = untrack(() => snapshot(initialProps.manager)) as
    | QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>
    | undefined;

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

  // Keyed on by the option-list memos, so that a reconfigure (see below) refreshes them.
  const [configVersion, setConfigVersion] = createSignal(manager.getConfigVersion());

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

  return { manager, query, tree, configVersion };
};
