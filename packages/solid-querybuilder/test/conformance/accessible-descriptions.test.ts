/**
 * The `title` attribute of every rule group, for all 50 scenario × query pairs.
 *
 * This is where `accessibleDescriptionGenerator` surfaces. The `customized` scenario supplies a
 * non-default generator, so these assertions cover more than the identity function.
 *
 * Static layer only, rendered server-side like `classnames.test.ts`. Upstream deliberately
 * publishes no post-flush descriptions layer: `title` derives from `path` alone and never reads
 * `value`, so effects cannot change it.
 */

import { describe, expect, it } from 'vitest';
import { caseAlignment, loadFixture, renderPairs } from './cases.js';
import type { AccessibleDescriptionEntry } from './extract.js';
import { renderAndExtract } from './render-ssr.jsx';

interface AccessibleDescriptionsFixture {
  cases: {
    scenario: string;
    query: string;
    accessibleDescriptions: AccessibleDescriptionEntry[];
  }[];
}

const fixture = await loadFixture<AccessibleDescriptionsFixture>('accessible-descriptions.json');

describe('conformance: accessible descriptions', () => {
  it('renders the same number of cases the fixture recorded, in the same order', () => {
    const { local, recorded } = caseAlignment(fixture.cases);
    expect(renderPairs).toHaveLength(fixture.cases.length);
    expect(local).toEqual(recorded);
  });

  for (const [i, pair] of renderPairs.entries()) {
    const expected = fixture.cases[i];

    it(`${expected.scenario} × ${expected.query}`, () => {
      const { accessibleDescriptions } = renderAndExtract(pair);

      expect(accessibleDescriptions).toEqual(expected.accessibleDescriptions);
    });
  }
});
