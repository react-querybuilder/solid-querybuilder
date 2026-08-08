/**
 * The nine canonical fixture queries, ported from `utils/testing/queryFixtures.ts` upstream.
 *
 * These must be reproduced rather than imported: `utils/` is not published, and the recorded
 * fixtures were generated against exactly these shapes. Every node carries an `id` equal to the
 * stringified path it started at, which is what makes fixture entries such as `"[1,0]"` legible
 * and makes ID-vs-stale-path targeting testable in `actions.test.ts`.
 */

import type {
  RuleGroupType,
  RuleGroupTypeAny,
  RuleGroupTypeIC,
  RuleType,
} from '@react-querybuilder/core';
import { defaultCombinators, transformQuery } from '@react-querybuilder/core';

/** Assigns each rule/group an `id` equal to `JSON.stringify(path)`. */
const pathsAsIDs = <RG extends RuleGroupTypeAny>(query: RG): RG =>
  transformQuery(query as RuleGroupType, {
    ruleProcessor: r => ({ ...r, id: JSON.stringify(r.path) }),
    ruleGroupProcessor: rg => ({ ...rg, id: JSON.stringify(rg.path) }),
  }) as RG;

const [and, or] = defaultCombinators.map(c => c.name);

const r = (i: number, extra: Partial<RuleType> = {}): RuleType => ({
  field: `f${i}`,
  operator: '=',
  value: `v${i}`,
  ...extra,
});

export interface QueryFixtures {
  empty: RuleGroupType;
  singleRule: RuleGroupType;
  flat: RuleGroupType;
  nested: RuleGroupType;
  ic: RuleGroupTypeIC;
  icNested: RuleGroupTypeIC;
  withDisabled: RuleGroupType;
  withoutDisabled: RuleGroupType;
  rootDisabled: RuleGroupType;
}

export const queries: QueryFixtures = {
  /** `{ combinator: 'and', rules: [] }` */
  empty: pathsAsIDs<RuleGroupType>({ combinator: and, rules: [] }),

  /** One rule at `[0]`. */
  singleRule: pathsAsIDs<RuleGroupType>({ combinator: and, rules: [r(1)] }),

  /** Three sibling rules, no nesting. */
  flat: pathsAsIDs<RuleGroupType>({ combinator: and, rules: [r(1), r(2), r(3)] }),

  /** Four levels deep: rule, group > rule, group > group > rule, group > group > group > rule. */
  nested: pathsAsIDs<RuleGroupType>({
    combinator: and,
    rules: [
      r(1),
      {
        combinator: or,
        rules: [r(2), { combinator: and, rules: [r(3), { combinator: or, rules: [r(4), r(5)] }] }],
      },
      r(6),
    ],
  }),

  /** Independent combinators, flat. */
  ic: pathsAsIDs<RuleGroupTypeIC>({ rules: [r(1), and, r(2), or, r(3)] }),

  /** Independent combinators, with a nested IC group at index 2. */
  icNested: pathsAsIDs<RuleGroupTypeIC>({
    rules: [r(1), and, { rules: [r(2), or, r(3)] }, and, r(4)],
  }),

  /** A disabled rule at `[1]` and a disabled group at `[2]` (whose children inherit it). */
  withDisabled: pathsAsIDs<RuleGroupType>({
    combinator: and,
    rules: [
      r(1),
      r(2, { disabled: true }),
      { combinator: or, disabled: true, rules: [r(3), r(4)] },
      r(5),
    ],
  }),

  /** Nothing disabled, but shaped identically to `withDisabled` for A/B comparisons. */
  withoutDisabled: pathsAsIDs<RuleGroupType>({
    combinator: and,
    rules: [r(1), r(2), { combinator: or, rules: [r(3), r(4)] }, r(5)],
  }),

  /** The entire query is disabled at the root. */
  rootDisabled: pathsAsIDs<RuleGroupType>({ combinator: and, disabled: true, rules: [r(1), r(2)] }),
};

export type QueryFixtureName = keyof QueryFixtures;

/** A counter-based ID generator, so a replay produces the IDs the fixtures recorded. */
export const createIdGenerator = (prefix = 'gen'): (() => string) => {
  let n = 0;
  return () => `${prefix}-${++n}`;
};
