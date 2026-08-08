/**
 * The post-flush renderer: `@solidjs/testing-library`'s `render` plus Solid 2's `flush()`, used
 * by the `conformance-dom` project.
 *
 * The opposite requirement to `render-ssr.tsx`: the same 50 cases rendered **uncontrolled**
 * (`defaultQuery`, no `onQueryChange`), exactly as upstream generated
 * `classnames-post-flush.json`, so effect-driven query changes land instead of being reverted by
 * the controlled-prop sync.
 */

import { render } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { QueryBuilder } from '../../src/components/index.js';
import type { QueryBuilderProps } from '../../src/types/index.js';
import type { RenderPair } from './cases.js';
import type { ExtractResult } from './extract.js';
import { extractFromContainer } from './extract.js';

/**
 * Flushes until the extracted surface stops changing, or throws.
 *
 * Bounded, not a fixed iteration count. Unlike the prior ports' tick counts, `flush()` is a real
 * settled point, so a single call is normally enough; the loop exists because a reset write can
 * schedule further effects, and the bound exists because a surface that never settles is an
 * effect loop and must fail loudly rather than hang.
 */
const drain = (container: Element, max = 10): void => {
  let previous = JSON.stringify(extractFromContainer(container));
  for (let i = 0; i < max; i++) {
    flush();
    const current = JSON.stringify(extractFromContainer(container));
    if (current === previous) return;
    previous = current;
  }
  throw new Error(`Surface did not stabilize within ${max} flushes — probable effect loop.`);
};

export const renderAndExtractPostFlush = ({
  scenario,
  query,
}: RenderPair): ExtractResult & { container: Element } => {
  const props = { ...scenario.props, defaultQuery: query } as QueryBuilderProps;
  const { container } = render(() => <QueryBuilder {...props} />);
  drain(container);

  return { container, ...extractFromContainer(container) };
};
