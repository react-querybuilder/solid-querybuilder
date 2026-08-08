import type { JSX } from '@solidjs/web';
import type { LabelNode } from '../types/translations.js';

/**
 * Renders a {@link LabelNode} — a plain string or a JSX element.
 *
 * Every translatable label in this package accepts `JSX.Element | string`, so every render site
 * needs the same handling; this is that, factored out. Emits no wrapper element and no
 * whitespace, so it is safe inline where the surrounding DOM structure matters (which is
 * everywhere: element order and text nodes are the conformance contract).
 *
 * Solid renders a string and an element identically, so the two branches React and Svelte need
 * collapse into one expression — but the component still exists, so that a change to
 * {@link LabelNode} has exactly one render site to update.
 */
export const Label = (props: { label?: LabelNode | null }): JSX.Element => <>{props.label}</>;
