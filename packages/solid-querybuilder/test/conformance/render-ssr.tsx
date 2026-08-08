/**
 * The static-layer renderer: `renderToString` from `@solidjs/web`, used by the `conformance-ssr`
 * project.
 *
 * The static fixtures (`classnames.json`, `accessible-descriptions.json`) were produced by
 * React's `renderToStaticMarkup` with a controlled `query` prop — **no effect has run**. Svelte
 * and Vue approximated that by extracting before their scheduler flushed; Solid's client
 * `render()` runs effects synchronously, so that escape hatch does not exist, and under Solid 2
 * (where writes settle on a microtask) a timing-based extraction would be less deterministic
 * still.
 *
 * Server rendering runs no effects at all, so this is an *exact* match for the fixture generation
 * mode rather than an approximation of it — and it exercises the `solid` condition's ssr path in
 * all 50 cases for free.
 *
 * `renderToString` requires components compiled with `generate: 'ssr'`, which is why this lives
 * in its own Vitest project (see `vitest.conformance.config.ts`). `hydratable: false` is set
 * there too: hydration keys land as *attributes* and would break the byte-identical `class`
 * comparison. (Marker comments would be ignored by extraction regardless, but the attributes
 * would not be.)
 */

import { renderToString } from '@solidjs/web';
import { QueryBuilder } from '../../src/components/index.js';
import type { QueryBuilderProps } from '../../src/types/index.js';
import type { RenderPair } from './cases.js';
import type { ExtractResult } from './extract.js';
import { extractFromMarkup } from './extract.js';

/**
 * Renders a pair and extracts its class surface and accessible descriptions.
 *
 * The props mirror `generate.tsx`: controlled `query`, no-op `onQueryChange`.
 */
export const renderAndExtract = ({ scenario, query }: RenderPair): ExtractResult => {
  // Scenario props are deliberately untyped (see `scenarios.tsx`), so the cast is where that
  // looseness is contained rather than something the component API is missing.
  const props = { ...scenario.props, query, onQueryChange: () => {} } as QueryBuilderProps;
  const markup = renderToString(() => <QueryBuilder {...props} />);

  return extractFromMarkup(markup);
};
