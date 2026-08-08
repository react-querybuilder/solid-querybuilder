/**
 * Replays all 58 curated mutation sequences through `QueryManager` and asserts the resulting
 * query, per-op abort reasons, and refusal flags against the recorded fixtures.
 *
 * This exercises core rather than the port. It is here anyway because it pins the core version
 * the port is built against to the behavior the fixtures describe: a silent behavior change in a
 * patch release fails here rather than in a consumer's app. The port-side half — that
 * `createQueryBuilderState` maps props onto the manager's guard options correctly — is in
 * `actions.solid.test.ts`.
 */

import { QueryManager } from '@react-querybuilder/core';
import { describe, expect, it } from 'vitest';
import { loadFixture } from './cases.js';
import { createIdGenerator, queries, type QueryFixtureName } from './queries.js';
import { guardsOf, replay, type ActionCase } from './replay.js';

const fixture = await loadFixture<{ cases: ActionCase[] }>('actions.json');

describe('conformance: actions', () => {
  it('replays every recorded sequence', () => {
    expect(fixture.cases).toHaveLength(58);
  });

  for (const { name, fixture: fixtureName, ops, options, expected } of fixture.cases) {
    it(name, () => {
      const result = replay(
        ops,
        onInvalidTarget =>
          new QueryManager(structuredClone(queries[fixtureName as QueryFixtureName]), {
            idGenerator: createIdGenerator(),
            ...guardsOf(options),
            onInvalidTarget,
          })
      );

      expect(result.query).toEqual(expected.query);
      expect(result.aborts).toEqual(expected.aborts);
      expect(result.allAborts).toEqual(expected.allAborts);
      expect(result.refused).toEqual(expected.refused);
    });
  }
});
