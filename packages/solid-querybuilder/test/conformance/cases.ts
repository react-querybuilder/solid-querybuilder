/**
 * Shared plumbing for the conformance suites: fixture loading, and the scenario × query
 * flattening that `utils/conformance/generate.tsx` performed upstream.
 *
 * Deliberately free of any rendering: the two conformance projects render in opposite modes (ssr
 * compilation + `renderToString` for the static layer, dom compilation + testing-library for the
 * post-flush layer) and must not drag each other's runtime in. The render helpers therefore live
 * in `render-ssr.tsx` and `render-dom.tsx`; everything they share lives here.
 */

import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { QueryFixtureName } from './queries.js';
import { queries } from './queries.js';
import type { Scenario } from './scenarios.jsx';
import { scenarios } from './scenarios.jsx';

const fixturesDir = path.resolve(import.meta.dirname, '../fixtures');

export interface FixtureMeta {
  schemaVersion: number;
  generator: { package: string; version: string; source: string; renderMode: string };
}

/**
 * Reads one fixture file, with an actionable message when it is missing — the files are
 * gitignored and fetched on demand, so "not found" is the expected first-run failure.
 *
 * `node:fs` rather than `Bun.file`: Vitest runs these tests under Node, not Bun, where the
 * `Bun` global does not exist.
 */
export const loadFixture = async <T>(name: string): Promise<T & FixtureMeta> => {
  const file = path.join(fixturesDir, name);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new Error(
      `Conformance fixture ${name} could not be read. Run \`bun run conformance:fetch\` (or ` +
        `\`bun run conformance\`, which fetches first).`
    );
  }
};

/** One scenario × query pair, in the order `generate.tsx` flattened them. */
export interface RenderPair {
  scenario: Scenario;
  queryName: string;
  query: unknown;
}

/**
 * Flattens scenarios into render pairs. The order must match `generate.tsx` exactly, since the
 * fixture `cases` array is positional as well as keyed.
 */
export const renderPairs: RenderPair[] = scenarios.flatMap(scenario => {
  const cases: [string, unknown][] = scenario.query
    ? [['inline', scenario.query]]
    : (scenario.queries ?? []).map(name => [name, queries[name as QueryFixtureName]]);

  return cases.map(([queryName, query]) => ({ scenario, queryName, query }));
});

/**
 * Asserts that the local flattening lines up with a fixture layer's `cases`, positionally *and*
 * by name — a reordering upstream must fail loudly here rather than silently compare the wrong
 * pair in all 50 assertions below it.
 */
export const caseAlignment = (
  cases: { scenario: string; query: string }[]
): { local: [string, string][]; recorded: [string, string][] } => ({
  local: renderPairs.map(p => [p.scenario.name, p.queryName]),
  recorded: cases.map(c => [c.scenario, c.query]),
});
