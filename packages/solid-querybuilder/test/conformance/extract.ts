/**
 * The DOM counterpart to `utils/conformance/extract.ts` upstream.
 *
 * Upstream walks a markup *string* with Bun's `HTMLRewriter`, because React renders to a string.
 * This port needs **both** forms, and upstream now ships both itself (`extractFromMarkup` /
 * `extractFromContainer`, `schemaVersion` 2) with an equivalence test proving they agree:
 *
 * - The `conformance-ssr` project renders with `renderToString` and gets a markup string. That is
 *   an exact match for the fixture generation mode (`renderToStaticMarkup`, no effects run)
 *   rather than an approximation of it.
 * - The `conformance-dom` project renders with `@solidjs/testing-library` and gets a container.
 *
 * Both funnel into one walker, so the two projects cannot disagree about extraction semantics.
 * Upstream's ancestor stack and void-element workaround are `HTMLRewriter` artifacts and
 * unnecessary here: the DOM already materializes document order and ancestry.
 *
 * The output shape must match upstream's byte for byte, **including key insertion order**,
 * because the tests assert deep equality against the recorded fixtures.
 */

import { JSDOM } from 'jsdom';

/** One element's contribution to the rendered class surface, in document order. */
export interface ClassNameEntry {
  /** Lowercased tag name. */
  tag: string;
  /** `data-testid`, when present. */
  testID?: string;
  /**
   * The `data-path` of the nearest enclosing rule or rule group (or of the element itself, for
   * the rule/group element). Absent for chrome outside any rule, i.e. the root wrapper.
   */
  path?: string;
  /** The verbatim `class` attribute. Whitespace is preserved; this is a byte-level claim. */
  className: string;
  /**
   * The concatenation of this element's *own* direct text-node children, verbatim — no trimming,
   * no collapsing, no descendant text. `''` when there are none (present, not omitted, so the
   * key set is stable). Added by `schemaVersion` 3.
   *
   * Verbatim is the point: it catches a stray space in a label or a whitespace text node emitted
   * by a template compiler, both invisible under any normalization. Both walkers here go through
   * a real DOM, so character references are decoded for free — upstream's `decodeText` exists
   * only because its markup walker is `HTMLRewriter`, which reports raw source text.
   */
  text: string;
}

/** The accessible description (`title`) of one rule group. */
export interface AccessibleDescriptionEntry {
  path: string;
  description: string;
}

export interface ExtractResult {
  classNames: ClassNameEntry[];
  accessibleDescriptions: AccessibleDescriptionEntry[];
}

const RULE_GROUP_TESTID = 'rule-group';

/**
 * Extracts the class surface and the accessible descriptions from a rendered query builder.
 *
 * `container` is the wrapper element; it is not itself part of the rendered output, so only its
 * descendants are walked.
 */
export const extractFromContainer = (container: Element): ExtractResult => {
  const classNames: ClassNameEntry[] = [];
  const accessibleDescriptions: AccessibleDescriptionEntry[] = [];

  // `querySelectorAll('*')` is documented to return elements in document order, which is exactly
  // the order `HTMLRewriter` visits start tags in. Ancestry is read per element rather than via
  // a stack, since the DOM already has it.
  for (const element of container.querySelectorAll('*')) {
    const ownPath = element.getAttribute('data-path') ?? undefined;
    const path = ownPath ?? element.closest('[data-path]')?.getAttribute('data-path') ?? undefined;

    const tag = element.tagName.toLowerCase();
    const testID = element.getAttribute('data-testid') ?? undefined;
    const className = element.getAttribute('class');

    if (className !== null) {
      classNames.push({
        tag,
        ...(testID === undefined ? {} : { testID }),
        ...(path === undefined ? {} : { path }),
        className,
        // Direct text-node children only, in document order. `Node.TEXT_NODE` is spelled `3` so
        // this works against whatever DOM implementation is in play (jsdom in either project).
        text: [...element.childNodes]
          .filter(node => node.nodeType === 3)
          .map(node => node.nodeValue ?? '')
          .join(''),
      });
    }

    if (testID === RULE_GROUP_TESTID && ownPath !== undefined) {
      const description = element.getAttribute('title');
      if (description !== null) {
        accessibleDescriptions.push({ path: ownPath, description });
      }
    }
  }

  return { classNames, accessibleDescriptions };
};

/**
 * Parses a markup string and extracts from it. Used by the ssr project, whose `renderToString`
 * output never touches a live document.
 *
 * The ssr project runs in the `node` environment — deliberately, since a server render must not
 * need a document — so there is no global `DOMParser` there and jsdom is constructed explicitly.
 * The dom project has one already, and uses it rather than paying for a second jsdom instance.
 */
export const extractFromMarkup = (markup: string): ExtractResult => {
  const html = `<div id="root">${markup}</div>`;
  const document =
    typeof DOMParser === 'undefined'
      ? new JSDOM(html).window.document
      : new DOMParser().parseFromString(html, 'text/html');
  const container = document.querySelector('#root');
  if (!container) throw new Error('Failed to parse rendered markup.');
  return extractFromContainer(container);
};
