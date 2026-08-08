import type {
  Classnames,
  FullField,
  QueryBuilderFlags,
  ValidationMap,
} from '@react-querybuilder/core';
import {
  defaultTranslations,
  mergeAnyTranslations,
  mergeClassnames,
  preferFlagProps,
  preferProp,
} from '@react-querybuilder/core';
import type { Component } from 'solid-js';
import { createContext, getOwner, useContext } from 'solid-js';
import type { ControlElementsProp, Controls } from '../types/controls.js';
import type { QueryBuilderContextProps } from '../types/props.js';
import type { Translations, TranslationsFull } from '../types/translations.js';

const emptyObject = {} as const;

/**
 * A component that renders nothing.
 *
 * Stands in for a `null` entry in the `controlElements` prop so that every key of
 * {@link Controls} is always a renderable component and no call site needs a null check.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export const nullComponent: Component<any> = () => null;

/**
 * An empty {@link ValidationMap}, for queries with no validator.
 *
 * A module-level constant so repeated derivations keep reference identity.
 */
export const emptyValidationMap: ValidationMap = {};

/**
 * The inherited configuration when there is no provider: nothing configured.
 *
 * An explicit default rather than a default-less context. In Solid 2 `useContext` on a
 * default-less context *throws* `ContextNotFoundError` outside a provider, where 1.x returned
 * `undefined`. The migration guide sanctions a default exactly for a context like this one,
 * which carries configuration only and no reactive state — and it keeps
 * {@link useQueryBuilderConfig} safe to call outside a component, as in a unit test.
 */
const defaultContextValue: QueryBuilderContextProps = emptyObject;

/**
 * Configuration inherited from a query builder ancestor.
 *
 * Configuration only — query state lives in the `QueryManager`. Provider syntax is
 * `<QueryBuilderContext value={…}>`; Solid 2 removed `.Provider`.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export const QueryBuilderContext =
  createContext<QueryBuilderContextProps<any, any>>(defaultContextValue);

/**
 * The inherited {@link QueryBuilderContextProps}, or an empty object when there is no provider.
 *
 * There is no throwing wrapper: the context has an explicit default, so the narrowing such
 * wrappers existed for is unnecessary.
 *
 * ⚠️ In Solid 2 `useContext` throws `Context can only be accessed under a reactive root` when
 * there is no owner on the stack — *independently* of whether the context has a default. The
 * `getOwner()` guard is what keeps this safe to call outside a component, as a unit test does.
 */
export const useQueryBuilderConfig = <
  F extends FullField = FullField,
  O extends string = string,
>(): QueryBuilderContextProps<F, O> =>
  (getOwner() ? useContext(QueryBuilderContext) : defaultContextValue) as QueryBuilderContextProps<
    F,
    O
  >;

/**
 * A control element key that is overridden in bulk by `actionElement`.
 */
const isActionKey = (key: string): boolean => key.endsWith('Action') || key.endsWith('Actions');

/**
 * A control element key that is overridden in bulk by `valueSelector`.
 */
const isSelectorKey = (key: string): boolean => key.endsWith('Selector');

/**
 * Every key of {@link Controls}, in a stable order.
 */
export const controlKeys = [
  'actionElement',
  'addGroupAction',
  'addRuleAction',
  'cloneGroupAction',
  'cloneRuleAction',
  'combinatorSelector',
  'fieldSelector',
  'inlineCombinator',
  'lockGroupAction',
  'lockRuleAction',
  'matchModeEditor',
  'muteGroupAction',
  'muteRuleAction',
  'notToggle',
  'operatorSelector',
  'removeGroupAction',
  'removeRuleAction',
  'rule',
  'ruleGroup',
  'shiftActions',
  'undoRedoActions',
  'valueEditor',
  'valueSelector',
  'valueSourceSelector',
] as const satisfies readonly (keyof Controls<FullField, string>)[];

/**
 * Merges `controlElements` from props, context, and defaults, giving precedence to props.
 *
 * Mirrors React Query Builder's `useMergedContext`: a `null` entry resolves to
 * {@link nullComponent} (rendering nothing), `actionElement` is a bulk override for every
 * `*Action`/`*Actions` key, and `valueSelector` is a bulk override for every `*Selector` key.
 * Bulk overrides never apply to `valueEditor`, `rule`, `ruleGroup`, `inlineCombinator`,
 * `notToggle`, or `matchModeEditor`. A `null` entry short-circuits at its own level, beating an
 * inherited component.
 *
 * With no slot tier this is a plain three-way merge, so it stays a legible loop; Vue and Svelte
 * both had to restructure it for a four-way order.
 *
 * Defaults are a parameter rather than an import so that this module — and the reactive layer as
 * a whole — stays free of component imports.
 */
export const mergeControlElements = <F extends FullField, O extends string>(
  propsCE: ControlElementsProp<F, O> = emptyObject,
  contextCE: ControlElementsProp<F, O> = emptyObject,
  defaults: Partial<Controls<F, O>> = emptyObject
): Controls<F, O> => {
  const merged: Record<string, unknown> = {};

  for (const key of controlKeys) {
    /**
     * Resolves one level (props or context) to a component, {@link nullComponent}, or
     * `undefined` meaning "fall through to the next level".
     */
    // oxlint-disable-next-line typescript/no-explicit-any
    const resolveLevel = (ce: ControlElementsProp<F, O>): Component<any> | undefined => {
      const comp = ce[key];
      if (comp === null) return nullComponent;
      if (comp) return comp;
      return (
        (isActionKey(key) ? ce.actionElement : undefined) ??
        (isSelectorKey(key) ? ce.valueSelector : undefined)
      );
    };

    const comp = resolveLevel(propsCE) ?? resolveLevel(contextCE) ?? defaults[key];

    if (comp) merged[key] = comp;
  }

  return merged as Controls<F, O>;
};

/**
 * Merged translations: props > context > `defaultTranslations`.
 */
export const mergeTranslations = (
  propsT?: Partial<Translations>,
  contextT?: Partial<Translations>
): TranslationsFull =>
  mergeAnyTranslations(
    defaultTranslations as unknown as Record<string, Record<string, unknown>>,
    contextT as Record<string, Record<string, unknown>> | undefined,
    propsT as Record<string, Record<string, unknown>> | undefined
  ) as unknown as TranslationsFull;

/**
 * The fully resolved configuration for a query builder.
 */
export interface MergedQueryBuilderConfig<F extends FullField, O extends string> extends Required<
  Omit<QueryBuilderFlags, 'preserveQueryStateOnUnmount'>
> {
  classNames: Classnames;
  controls: Controls<F, O>;
  translations: TranslationsFull;
}

/**
 * Merges props, inherited context, and package defaults into a single configuration object,
 * with props taking precedence.
 *
 * Core's `preferFlagProps`/`preferProp` do the "unset falls through to the default" work rather
 * than Solid's `merge`, which overrides with an explicit `undefined` and would therefore erase
 * defaults for any caller spreading an optional prop.
 *
 * `enableDragAndDrop` is always `false`; drag-and-drop is a non-goal. The flag is retained only
 * because it feeds the `data-dnd` attribute on the wrapper element, which DOM parity requires.
 */
export const mergeQueryBuilderConfig = <F extends FullField, O extends string>({
  props = emptyObject,
  context,
  defaultControls,
}: {
  props?: QueryBuilderContextProps<F, O>;
  context?: QueryBuilderContextProps<F, O>;
  defaultControls?: Partial<Controls<F, O>>;
}): MergedQueryBuilderConfig<F, O> => {
  const flags = preferFlagProps(props, context, true) as Required<QueryBuilderFlags>;

  return {
    ...flags,
    // Never enabled: drag-and-drop is a non-goal for this package.
    enableDragAndDrop: false,
    debugMode: preferProp(false, props.debugMode, context?.debugMode),
    classNames: mergeClassnames(context?.controlClassnames, props.controlClassnames),
    controls: mergeControlElements(
      props.controlElements,
      context?.controlElements,
      defaultControls
    ),
    translations: mergeTranslations(props.translations, context?.translations),
  };
};
