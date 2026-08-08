/**
 * Full DOM parity: the verbatim `class` attribute of every element with one, in document order,
 * for all 50 scenario × query pairs.
 *
 * ## Why this suite renders server-side
 *
 * The fixtures were produced with `renderToStaticMarkup`, so no React effect has run. Solid's
 * client `render()` runs effects, so "extract before the scheduler flushes" — the trick both
 * prior ports used — is not available. `renderToString` runs no effects at all, which makes this
 * an *exact* match for the fixture generation mode rather than an approximation of it.
 *
 * The post-flush surface is asserted separately, against its own fixture layer, in
 * `classnames-post-flush.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { caseAlignment, loadFixture, renderPairs } from './cases.js';
import type { ClassNameEntry } from './extract.js';
import { renderAndExtract } from './render-ssr.jsx';
import { scenarios } from './scenarios.jsx';

interface ClassNamesFixture {
  scenarios: { name: string; description: string; props: Record<string, unknown> }[];
  cases: { scenario: string; query: string; classNames: ClassNameEntry[] }[];
}

const fixture = await loadFixture<ClassNamesFixture>('classnames.json');

describe('conformance: classnames', () => {
  it('renders the same number of cases the fixture recorded, in the same order', () => {
    const { local, recorded } = caseAlignment(fixture.cases);
    expect(renderPairs).toHaveLength(fixture.cases.length);
    expect(local).toEqual(recorded);
  });

  it('reproduces the recorded scenario definitions', () => {
    // Function-valued props serialize as `null`, so this compares the JSON projection of the
    // local scenarios against the recorded one. It catches a scenario renamed, reordered, or
    // given a different boolean prop upstream — the drift a bumped `CONFORMANCE_TAG` can hide
    // behind 50 opaque diffs.
    const local = scenarios.map(({ name, description, props }) => ({
      name,
      description,
      props: JSON.parse(JSON.stringify(props, (_k, v) => (typeof v === 'function' ? null : v))),
    }));

    expect(local).toEqual(fixture.scenarios);
  });

  for (const [i, pair] of renderPairs.entries()) {
    const expected = fixture.cases[i];

    it(`${expected.scenario} × ${expected.query}`, () => {
      const { classNames } = renderAndExtract(pair);

      expect(classNames).toEqual(expected.classNames);
    });
  }
});
