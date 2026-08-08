/**
 * The class surface *after* effects have flushed, asserted against the `schemaVersion` 2
 * `classnames-post-flush.json` layer.
 *
 * Rendered **uncontrolled** (`defaultQuery`, no `onQueryChange`), exactly as upstream generated
 * the layer, so effect-driven query changes land instead of being reverted by the
 * controlled-prop sync.
 *
 * Each fixture case carries `differsFromStatic`, which makes this a two-directional assertion:
 *
 * - `false` — the post-flush surface must equal the corresponding `classnames.json` entry. This
 *   doubles as the SSR-vs-DOM equality assertion: the static layer is rendered by
 *   `renderToString` in the sibling project, this one by the client renderer, and the fixture is
 *   what authorizes the comparison rather than an invariant this port invented.
 * - `true` — it must *not* equal the static entry, so a port whose reset effect never runs fails
 *   here rather than passing both layers. No case sets this today (upstream's mount-query-change
 *   effect clobbers the mount-time reset), but the branch stays wired.
 */

import { cleanup } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { caseAlignment, loadFixture, renderPairs } from './cases.js';
import type { ClassNameEntry } from './extract.js';
import { renderAndExtractPostFlush } from './render-dom.jsx';

interface PostFlushCase {
  scenario: string;
  query: string;
  differsFromStatic: boolean;
  classNames: ClassNameEntry[];
}

interface StaticCase {
  scenario: string;
  query: string;
  classNames: ClassNameEntry[];
}

const fixture = await loadFixture<{ cases: PostFlushCase[] }>('classnames-post-flush.json');
const staticFixture = await loadFixture<{ cases: StaticCase[] }>('classnames.json');

afterEach(cleanup);

describe('conformance: classnames (post-flush)', () => {
  it('renders the same number of cases the fixture recorded, in the same order', () => {
    const { local, recorded } = caseAlignment(fixture.cases);
    expect(renderPairs).toHaveLength(fixture.cases.length);
    expect(local).toEqual(recorded);
  });

  it('is aligned case for case with the static layer', () => {
    expect(fixture.cases.map(c => [c.scenario, c.query])).toEqual(
      staticFixture.cases.map(c => [c.scenario, c.query])
    );
  });

  for (const [i, pair] of renderPairs.entries()) {
    const expected = fixture.cases[i];
    const staticExpected = staticFixture.cases[i];

    it(`${expected.scenario} × ${expected.query}`, () => {
      const { classNames } = renderAndExtractPostFlush(pair);

      expect(classNames).toEqual(expected.classNames);

      if (expected.differsFromStatic) {
        // The reset (or some other effect) must actually change the surface here.
        expect(classNames).not.toEqual(staticExpected.classNames);
      } else {
        expect(classNames).toEqual(staticExpected.classNames);
      }
    });
  }
});
