import type {
  FullCombinator,
  FullField,
  FullOperator,
  Path,
  QueryManager,
  RuleContext,
  RuleGroupTypeAny,
} from '@react-querybuilder/core';
import type { Accessor } from 'solid-js';
import { createMemo } from 'solid-js';

/**
 * The resolved {@link RuleContext} for the rule at `path`, recomputed whenever the query
 * identity changes.
 *
 * The single-call form of the derivation: `QueryManager.getRuleContext` resolves field data,
 * operators, value editor type, value list, value sources, match modes, and the validation
 * result in one pass. Decomposing it into granular accessors buys nothing unless profiling says
 * otherwise.
 *
 * This is the path-based entry point, intended for external callers. `createRuleState`
 * deliberately does *not* use it: a rule rendered by a replacement component, or a subquery rule
 * that is not in the manager's query at all, has no resolvable path.
 *
 * @param manager - The manager driving the query.
 * @param path - The rule's path.
 * @param query - The reactive query. Read only to establish a dependency on query identity; the
 * manager holds the authoritative copy.
 */
export const createRuleContext = <F extends FullField = FullField>(
  manager: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>,
  path: Accessor<Path>,
  query: Accessor<RuleGroupTypeAny>
): Accessor<RuleContext<F> | null> =>
  createMemo(() => {
    // Establishes the dependency on query identity.
    query();
    return manager.getRuleContext(path());
  });
