/**
 * The port-side half of the action conformance suite: the guard-sensitive sequences replayed
 * through the manager `createQueryBuilderState` builds from `QueryBuilderProps`, rather than
 * through a manager configured directly.
 *
 * This is what catches an option-mapping bug — a `disabled` array that never reaches
 * `disabledPaths`, or a `maxLevels` that defaults wrong. Two narrowings relative to
 * `actions.test.ts`, both deliberate:
 *
 * - Only the resulting query is asserted. `QueryBuilderProps` has no `onInvalidTarget`, so abort
 *   reasons are not observable here; a guard that fails to apply shows up anyway as a query that
 *   changed when it should not have.
 * - `id`s are stripped before comparing. `createQueryBuilderState` seeds its manager through
 *   `resolveCandidateQuery`, which draws from the injected generator, so generated `id`s are
 *   offset by the seeding draws by a constant. That offset is an artifact of construction, not of
 *   mutation.
 *
 * The state is built inside `createRoot(dispose => …)` — Solid's equivalent of Svelte's
 * `$effect.root` and Vue's `effectScope`. `createQueryBuilderState` registers an `onCleanup` for
 * its manager subscription and reads a context, both of which need an owner on the stack; a root
 * supplies one outside a component.
 *
 * ⚠️ The root body is an *owned* scope, so the replay itself runs outside it: a reactive write
 * made under an owner throws `REACTIVE_WRITE_IN_OWNED_SCOPE`. And `flush()` runs between ops,
 * because a plain read after a write still returns the old value until the next microtask.
 */

import type { RuleGroupType, RuleGroupTypeAny } from '@react-querybuilder/core';
import { formatQuery } from '@react-querybuilder/core';
import { createRoot, flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { createQueryBuilderState } from '../../src/reactive/index.js';
import type { QueryBuilderProps } from '../../src/types/index.js';
import { loadFixture } from './cases.js';
import { createIdGenerator, queries, type QueryFixtureName } from './queries.js';
import { applyOp, type ActionCase, type RunOptions } from './replay.js';

const fixture = await loadFixture<{ cases: ActionCase[] }>('actions.json');

const stripIDs = (query: RuleGroupTypeAny): unknown =>
  JSON.parse(formatQuery(query as RuleGroupType, 'json_without_ids'));

/** `respectDisabled: false` has no prop equivalent, so those cases are skipped. */
const eligible = fixture.cases.filter(
  c =>
    c.options.respectDisabled !== false &&
    (c.options.disabledPaths !== undefined ||
      c.options.maxLevels !== undefined ||
      c.fixture === 'rootDisabled' ||
      c.fixture === 'withDisabled')
);

const propsFor = (options: RunOptions): Partial<QueryBuilderProps> => ({
  ...(options.queryDisabled ? { disabled: true } : {}),
  ...(options.disabledPaths ? { disabled: options.disabledPaths } : {}),
  ...(options.maxLevels === undefined ? {} : { maxLevels: options.maxLevels }),
});

describe('conformance: actions through createQueryBuilderState', () => {
  it('has guard-sensitive cases to replay', () => {
    expect(eligible.length).toBeGreaterThan(5);
  });

  for (const { name, fixture: fixtureName, ops, options, expected } of eligible) {
    it(name, () => {
      const root = createRoot(dispose => {
        const state = createQueryBuilderState({
          ...propsFor(options),
          query: structuredClone(queries[fixtureName as QueryFixtureName]),
          idGenerator: createIdGenerator(),
          // The fixture corpus mixes `RuleGroupType` and `RuleGroupTypeIC`, which
          // `QueryBuilderProps` discriminates between. The cast collapses that here; the
          // discrimination itself is covered by `types.test-d.ts`.
        } as QueryBuilderProps);
        return { manager: state.manager, dispose };
      });

      // Settle the mount before replaying. Effects created inside a root are *queued*, not run
      // eagerly, so the controlled-`query` sync effect's first run happens at the next `flush()`
      // — which, without this, would be the one after the first op, silently reverting it. A
      // mounted component has already had that flush before a user can touch anything.
      flush();

      for (const op of ops) {
        applyOp(root.manager, op);
        flush();
      }

      expect(stripIDs(root.manager.getQuery())).toEqual(stripIDs(expected.query));
      root.dispose();
    });
  }
});
