import type {
  FullCombinator,
  FullField,
  FullOperator,
  Path,
  QueryManager,
  RuleGroupContext,
  RuleGroupTypeAny,
} from '@react-querybuilder/core';
import type { Accessor } from 'solid-js';
import { createMemo } from 'solid-js';

/**
 * The resolved {@link RuleGroupContext} for the group at `path`, recomputed whenever the query
 * identity changes. The single-call counterpart to `createRuleContext`, and likewise the
 * path-based entry point for external callers rather than the derivation `createRuleGroupState`
 * uses.
 *
 * @param manager - The manager driving the query.
 * @param path - The group's path. The root group's path is `[]`.
 * @param query - The reactive query. Read only to establish a dependency on query identity.
 */
export const createRuleGroupContext = <F extends FullField = FullField>(
  manager: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>,
  path: Accessor<Path>,
  query: Accessor<RuleGroupTypeAny>
): Accessor<RuleGroupContext<FullCombinator> | null> =>
  createMemo(() => {
    // Establishes the dependency on query identity.
    query();
    return manager.getRuleGroupContext(path());
  });
