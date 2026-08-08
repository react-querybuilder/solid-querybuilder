import type {
  BaseTranslation,
  BaseTranslations,
  BaseTranslationWithLabel,
  BaseTranslationWithPlaceholders,
} from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';

/**
 * Anything that can be rendered as a label.
 *
 * React Query Builder's `ReactNode` becomes this type throughout the port. Solid's
 * `JSX.Element` already admits `string`, but the union is spelled out to document that a bare
 * string is the expected value for the overwhelming majority of labels.
 *
 * Note that `title` properties are *not* widened to `LabelNode`: they become `title`
 * attributes, which can only hold text.
 *
 * @group Props
 */
export type LabelNode = JSX.Element | string;

/**
 * A translation for a component with `title` and `label`.
 *
 * @group Props
 */
export interface TranslationWithLabel extends BaseTranslationWithLabel<LabelNode> {}

/**
 * A translation for a component with `title` only.
 *
 * @group Props
 */
export interface Translation extends BaseTranslation {}

/**
 * A translation for a component with `title` and a placeholder.
 *
 * @group Props
 */
export interface TranslationWithPlaceholders extends BaseTranslationWithPlaceholders {}

/**
 * The shape of the `translations` prop.
 *
 * @group Props
 */
export interface Translations extends BaseTranslations<LabelNode> {}

/**
 * The full `translations` interface with all properties required.
 *
 * @group Props
 */
export type TranslationsFull = {
  [K in keyof Translations]: { [T in keyof Translations[K]]-?: Translations[K][T] };
};
