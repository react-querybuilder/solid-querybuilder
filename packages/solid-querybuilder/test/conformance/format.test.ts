/**
 * Round-trip conformance: a nested independent-combinator query survives
 * `formatQuery` → `parseSQL` → `formatQuery`.
 *
 * It asserts nothing about rendering — it asserts that the
 * barrel re-export is complete enough for a consumer to do the whole round trip without a direct
 * `@react-querybuilder/core` dependency, and that IC queries survive it. `parseSQL` is a
 * subpath export of core rather than a barrel export, so it is imported the way a consumer
 * would have to.
 */

import type { RuleGroupType, RuleGroupTypeIC } from '@react-querybuilder/core';
import { parseSQL } from '@react-querybuilder/core/parseSQL';
import { describe, expect, it } from 'vitest';
import { formatQuery } from '../../src/index.js';
import { queries } from './queries.js';

describe('conformance: formatQuery round trip', () => {
  it('formats a nested IC query to SQL', () => {
    expect(formatQuery(queries.icNested, 'sql')).toBe(
      "(f1 = 'v1' and (f2 = 'v2' or f3 = 'v3') and f4 = 'v4')"
    );
  });

  it('round-trips a nested IC query through parseSQL', () => {
    const sql = formatQuery(queries.icNested, 'sql');
    const parsed = parseSQL(sql, { independentCombinators: true }) as RuleGroupTypeIC;

    expect(formatQuery(parsed, 'sql')).toBe(sql);
    // The parsed query is structurally the original, minus the fixture's `id`s.
    expect(JSON.parse(formatQuery(parsed as unknown as RuleGroupType, 'json_without_ids'))).toEqual(
      JSON.parse(formatQuery(queries.icNested as unknown as RuleGroupType, 'json_without_ids'))
    );
  });

  it('round-trips every fixture query through SQL', () => {
    for (const [name, query] of Object.entries(queries)) {
      const sql = formatQuery(query as RuleGroupType, 'sql');
      // `parseSQL`'s return type is discriminated on the literal value of
      // `independentCombinators`, so the two calls cannot be collapsed into one.
      const parsed = name.startsWith('ic')
        ? (parseSQL(sql, { independentCombinators: true }) as unknown as RuleGroupType)
        : parseSQL(sql);

      expect(formatQuery(parsed, 'sql'), name).toBe(sql);
    }
  });
});
