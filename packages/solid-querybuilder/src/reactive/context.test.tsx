import { defaultTranslations } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import type { Component } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { setupInRoot } from '../../test/reactive-harness.js';
import type { QueryBuilderContextProps } from '../types/props.js';
import {
  controlKeys,
  emptyValidationMap,
  mergeControlElements,
  mergeQueryBuilderConfig,
  mergeTranslations,
  nullComponent,
  QueryBuilderContext,
  useQueryBuilderConfig,
} from './context.js';

// oxlint-disable-next-line typescript/no-explicit-any
const noop: Component<any> = () => null;

/** A distinct component identity, labeled for readable failures. */
// oxlint-disable-next-line typescript/no-explicit-any
const named = (name: string): Component<any> =>
  Object.defineProperty(noop.bind(null), 'name', { value: name });

describe('QueryBuilderContext', () => {
  it('has an explicit default, so it is safe to read outside a provider or a root', () => {
    // Two separate Solid 2 hazards, both closed here. A default-less context *throws*
    // `ContextNotFoundError` outside a provider, where 1.x returned `undefined` — hence the
    // explicit default, and hence no throwing wrapper. And `useContext` throws "Context can only
    // be accessed under a reactive root" with no owner on the stack *regardless* of the default
    // — hence the `getOwner()` guard, which is what preserves "safe to call outside a
    // component".
    expect(() => useQueryBuilderConfig()).not.toThrow();
    expect(useQueryBuilderConfig()).toEqual({});
  });

  it('returns the default inside a root with no provider', () => {
    expect(setupInRoot(() => useQueryBuilderConfig())).toEqual({});
  });

  it('provides configuration to descendants', () => {
    let seen: QueryBuilderContextProps | undefined;
    const Child = () => {
      seen = useQueryBuilderConfig();
      return null;
    };

    render(() => (
      // `value=`, not `.Provider`: Solid 2 removed the `.Provider` member.
      <QueryBuilderContext value={{ showNotToggle: true }}>
        <Child />
      </QueryBuilderContext>
    ));

    expect(seen?.showNotToggle).toBe(true);
  });
});

describe('nullComponent', () => {
  it('renders nothing', () => {
    const { container } = render(() => nullComponent({}));
    expect(container.innerHTML).toBe('');
  });
});

describe('emptyValidationMap', () => {
  it('keeps reference identity', () => {
    expect(emptyValidationMap).toBe(emptyValidationMap);
    expect(emptyValidationMap).toEqual({});
  });
});

describe('mergeControlElements', () => {
  it('defaults every key when nothing is configured', () => {
    const defaults = Object.fromEntries(controlKeys.map(k => [k, named(k)]));
    const merged = mergeControlElements(undefined, undefined, defaults);
    expect(Object.keys(merged).toSorted()).toEqual([...controlKeys].toSorted());
  });

  it('prefers props over context over defaults', () => {
    const fromProps = named('props');
    const fromContext = named('context');
    const fromDefaults = named('defaults');

    expect(
      mergeControlElements(
        { notToggle: fromProps },
        { notToggle: fromContext },
        { notToggle: fromDefaults }
      ).notToggle
    ).toBe(fromProps);

    expect(
      mergeControlElements({}, { notToggle: fromContext }, { notToggle: fromDefaults }).notToggle
    ).toBe(fromContext);

    expect(mergeControlElements({}, {}, { notToggle: fromDefaults }).notToggle).toBe(fromDefaults);
  });

  it('replaces a null entry with nullComponent, short-circuiting at its own level', () => {
    const fromContext = named('context');
    const merged = mergeControlElements(
      { addRuleAction: null },
      { addRuleAction: fromContext },
      { addRuleAction: named('defaults') }
    );
    expect(merged.addRuleAction).toBe(nullComponent);
  });

  it('applies actionElement in bulk to every *Action/*Actions key', () => {
    const actionElement = named('action');
    const merged = mergeControlElements({ actionElement }, {}, {});

    for (const key of controlKeys) {
      if (key === 'actionElement') continue;
      if (key.endsWith('Action') || key.endsWith('Actions')) {
        expect(merged[key], key).toBe(actionElement);
      } else {
        expect(merged[key], key).toBeUndefined();
      }
    }
  });

  it('applies valueSelector in bulk to every *Selector key, but never to valueEditor', () => {
    const valueSelector = named('selector');
    const merged = mergeControlElements({ valueSelector }, {}, {});

    for (const key of controlKeys) {
      if (key === 'valueSelector') continue;
      if (key.endsWith('Selector')) {
        expect(merged[key], key).toBe(valueSelector);
      } else {
        expect(merged[key], key).toBeUndefined();
      }
    }
    expect(merged.valueEditor).toBeUndefined();
    expect(merged.rule).toBeUndefined();
    expect(merged.ruleGroup).toBeUndefined();
    expect(merged.inlineCombinator).toBeUndefined();
    expect(merged.notToggle).toBeUndefined();
    expect(merged.matchModeEditor).toBeUndefined();
  });

  it('lets a keyed entry beat a bulk override at the same level', () => {
    const actionElement = named('action');
    const addRuleAction = named('addRule');
    const merged = mergeControlElements({ actionElement, addRuleAction }, {}, {});
    expect(merged.addRuleAction).toBe(addRuleAction);
    expect(merged.removeRuleAction).toBe(actionElement);
  });

  it('lets a bulk override in props beat a keyed entry in context', () => {
    const actionElement = named('action');
    const merged = mergeControlElements({ actionElement }, { addRuleAction: named('ctx') }, {});
    expect(merged.addRuleAction).toBe(actionElement);
  });
});

describe('mergeTranslations', () => {
  it('layers props over context over the defaults', () => {
    const merged = mergeTranslations(
      { fields: { title: 'from props' } },
      { fields: { title: 'from context', placeholderLabel: 'from context' } }
    );
    expect(merged.fields.title).toBe('from props');
    expect(merged.fields.placeholderLabel).toBe('from context');
    expect(merged.operators.title).toBe(defaultTranslations.operators.title);
  });

  it('returns the defaults when nothing is configured', () => {
    expect(mergeTranslations().fields.title).toBe(defaultTranslations.fields.title);
  });
});

describe('mergeQueryBuilderConfig', () => {
  it('applies flag precedence: props, then context, then defaults', () => {
    const config = mergeQueryBuilderConfig({
      props: { showNotToggle: true },
      context: { showNotToggle: false, showCloneButtons: true },
    });
    expect(config.showNotToggle).toBe(true);
    expect(config.showCloneButtons).toBe(true);
    expect(config.showLockButtons).toBe(false);
    // Defaults that are `true` unless turned off.
    expect(config.enableMountQueryChange).toBe(true);
    expect(config.autoSelectField).toBe(true);
    expect(config.resetOnFieldChange).toBe(true);
  });

  it('never enables drag-and-drop', () => {
    const config = mergeQueryBuilderConfig({
      // @ts-expect-error `enableDragAndDrop` is not part of `QueryBuilderContextProps`
      props: { enableDragAndDrop: true },
    });
    expect(config.enableDragAndDrop).toBe(false);
  });

  it('resolves debugMode independently of the flag set', () => {
    expect(mergeQueryBuilderConfig({}).debugMode).toBe(false);
    expect(mergeQueryBuilderConfig({ context: { debugMode: true } }).debugMode).toBe(true);
    expect(
      mergeQueryBuilderConfig({ props: { debugMode: false }, context: { debugMode: true } })
        .debugMode
    ).toBe(false);
  });

  it('merges classnames, controls, and translations', () => {
    const valueEditor = named('editor');
    const config = mergeQueryBuilderConfig({
      props: {
        controlClassnames: { queryBuilder: 'from-props' },
        controlElements: { valueEditor },
        translations: { fields: { title: 'from props' } },
      },
      context: { controlClassnames: { ruleGroup: 'from-context' } },
      defaultControls: { notToggle: named('default') },
    });

    expect(config.classNames.queryBuilder).toBe('from-props');
    expect(config.classNames.ruleGroup).toBe('from-context');
    expect(config.controls.valueEditor).toBe(valueEditor);
    expect(config.controls.notToggle).toBeDefined();
    expect(config.translations.fields.title).toBe('from props');
  });

  it('does not erase defaults when a prop is explicitly undefined', () => {
    // Solid 2's `merge` overrides with an explicit `undefined`; core's `preferProp`/
    // `preferFlagProps` do not, which is why this layer uses them instead.
    const config = mergeQueryBuilderConfig({ props: { autoSelectField: undefined } });
    expect(config.autoSelectField).toBe(true);
  });
});
