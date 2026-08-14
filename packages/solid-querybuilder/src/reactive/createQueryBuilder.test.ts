import type { RuleGroupType } from '@react-querybuilder/core';
import { QueryManager, defaultCombinators } from '@react-querybuilder/core';
import { createSignal, createStore, flush, snapshot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { setupInRoot } from '../../test/reactive-harness.js';
import { createQueryBuilder } from './createQueryBuilder.js';

const fields = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
];

const simpleQuery: RuleGroupType = {
  combinator: 'and',
  rules: [{ id: 'r1', field: 'firstName', operator: '=', value: 'Steve' }],
};

describe('createQueryBuilder', () => {
  it('seeds the manager from defaultQuery without making it undoable', () => {
    const state = setupInRoot(() => createQueryBuilder({ fields, defaultQuery: simpleQuery }));

    expect(state.query.rules).toHaveLength(1);
    expect(state.manager.canUndo()).toBe(false);
  });

  it('falls back to an empty group when neither query nor defaultQuery is given', () => {
    const state = setupInRoot(() => createQueryBuilder({ fields }));

    expect(state.query.rules).toHaveLength(0);
    expect(state.independentCombinators).toBe(false);
  });

  it('exposes option lists from the manager', () => {
    const state = setupInRoot(() => createQueryBuilder({ fields }));

    expect(state.schema.fields.map(f => (f as { name: string }).name)).toEqual([
      'firstName',
      'lastName',
    ]);
    expect(state.schema.combinators.map(c => (c as { name: string }).name)).toEqual(
      defaultCombinators.map(c => (c as { name: string }).name)
    );
    expect(state.schema.fieldMap.firstName?.label).toBe('First Name');
  });

  it('mirrors the query in a store keyed by id, preserving identity across a commit', () => {
    const state = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: {
          combinator: 'and',
          rules: [
            { id: 'r1', field: 'firstName', operator: '=', value: 'Steve' },
            { id: 'r2', field: 'lastName', operator: '=', value: 'Vai' },
          ],
        } satisfies RuleGroupType,
      })
    );

    const before = state.rootGroup.rules[1];
    state.manager.update('value', 'Morse', [0]);
    flush();

    // The untouched rule keeps its proxy identity; only the changed one is replaced.
    expect(state.rootGroup.rules[1]).toBe(before);
    expect((state.rootGroup.rules[0] as { value: string }).value).toBe('Morse');
  });

  it('fires onQueryChange exactly once per commit, before any reader observes it', () => {
    const onQueryChange = vi.fn();
    const state = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: simpleQuery,
        enableMountQueryChange: false,
        onQueryChange,
      })
    );

    state.manager.update('value', 'Vai', [0]);

    // The subscribe callback runs synchronously from the manager, outside Solid's scheduler, so
    // `onQueryChange` has already fired — while the reader still sees the old value, because
    // reads lag writes until the flush.
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(state.query.rules[0]).toMatchObject({ value: 'Steve' });

    flush();
    expect(state.query.rules[0]).toMatchObject({ value: 'Vai' });
  });

  it('fires onQueryChange once for a whole manager batch', () => {
    const onQueryChange = vi.fn();
    const state = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: simpleQuery,
        enableMountQueryChange: false,
        onQueryChange,
      })
    );

    state.manager.batch(() => {
      state.manager.update('value', 'a', [0]);
      state.manager.update('value', 'b', [0]);
      state.manager.update('value', 'c', [0]);
    });
    flush();

    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  it('fires onQueryChange on mount when enabled, and not when disabled', () => {
    const onQueryChange = vi.fn();
    setupInRoot(() => createQueryBuilder({ fields, defaultQuery: simpleQuery, onQueryChange }));
    expect(onQueryChange).not.toHaveBeenCalled();
    flush();
    expect(onQueryChange).toHaveBeenCalledTimes(1);

    const off = vi.fn();
    setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: simpleQuery,
        enableMountQueryChange: false,
        onQueryChange: off,
      })
    );
    flush();
    expect(off).not.toHaveBeenCalled();
  });

  it('pushes a new query prop into the manager (controlled mode)', () => {
    const [query, setQuery] = createSignal<RuleGroupType>(simpleQuery);
    const state = setupInRoot(() =>
      createQueryBuilder(() => ({ fields, query: query(), enableMountQueryChange: false }))
    );

    setQuery({
      combinator: 'or',
      rules: [{ id: 'r1', field: 'lastName', operator: '=', value: 'Vai' }],
    });
    flush();

    expect(state.manager.getQuery().combinator).toBe('or');
    expect(state.query.combinator).toBe('or');
  });

  it('does not loop when the query prop is fed back from the manager', () => {
    const onQueryChange = vi.fn();
    const [query, setQuery] = createSignal<RuleGroupType>(simpleQuery);
    const state = setupInRoot(() =>
      createQueryBuilder(() => ({
        fields,
        query: query(),
        enableMountQueryChange: false,
        onQueryChange: (q: RuleGroupType) => {
          onQueryChange(q);
          setQuery(q);
        },
      }))
    );

    state.manager.update('value', 'Vai', [0]);
    flush();

    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  it('accepts a query held in a consumer store without tripping the deep freeze', () => {
    // The manager's Immer deep-freeze throws on a store proxy, so every hand-off is
    // `snapshot()`ed — including the seed, which goes through `resolveCandidateQuery`. This is
    // the regression test for that rule; removing either `snapshot()` turns it red.
    const [store, setStore] = createStore<{ query: RuleGroupType }>({
      // The rules carry `id`s deliberately: without them the manager re-prepares the query
      // into plain objects on the way in, and the proxy never reaches Immer's freeze.
      query: {
        combinator: 'and',
        rules: [{ id: 'r1', field: 'firstName', operator: '=', value: 'Steve' }],
      },
    });

    const state = setupInRoot(() =>
      createQueryBuilder(() => ({ fields, query: store.query, enableMountQueryChange: false }))
    );

    expect(state.manager.getQuery().combinator).toBe('and');

    expect(() => {
      setStore(draft => {
        draft.query = {
          combinator: 'or',
          rules: [{ id: 'r2', field: 'lastName', operator: '=', value: 'Vai' }],
        };
      });
      flush();
    }).not.toThrow();
    expect(state.manager.getQuery().combinator).toBe('or');
  });

  it('seeds from a defaultQuery held in a consumer store', () => {
    const [store] = createStore<{ query: RuleGroupType }>({
      query: {
        combinator: 'or',
        rules: [{ id: 'r1', field: 'lastName', operator: '=', value: 'Vai' }],
      },
    });
    const state = setupInRoot(() =>
      createQueryBuilder({ fields, defaultQuery: store.query, enableMountQueryChange: false })
    );
    expect(state.manager.getQuery().combinator).toBe('or');
  });

  it('subscribes to an externally supplied manager and never reconfigures it', () => {
    const manager = new QueryManager<RuleGroupType>(simpleQuery, { fields });
    const [flds, setFlds] = createSignal(fields);
    const state = setupInRoot(() =>
      createQueryBuilder(() => ({ manager, fields: flds(), enableMountQueryChange: false }))
    );

    expect(state.manager).toBe(manager);

    const versionBefore = manager.getConfigVersion();
    setFlds([{ name: 'age', label: 'Age' }]);
    flush();
    expect(manager.getConfigVersion()).toBe(versionBefore);

    manager.update('value', 'Vai', [0]);
    flush();
    expect(state.query.rules[0]).toMatchObject({ value: 'Vai' });
  });

  it('reconfigures in place when a structural prop changes, keeping query and history', () => {
    const [flds, setFlds] = createSignal(fields);
    const state = setupInRoot(() =>
      createQueryBuilder(() => ({
        fields: flds(),
        defaultQuery: simpleQuery,
        enableMountQueryChange: false,
      }))
    );

    state.manager.update('value', 'Vai', [0]);
    flush();
    expect(state.manager.canUndo()).toBe(true);

    const queryBefore = state.manager.getQuery();
    setFlds([...fields, { name: 'age', label: 'Age' }]);
    flush();

    expect(state.schema.fields.map(f => (f as { name: string }).name)).toEqual([
      'firstName',
      'lastName',
      'age',
    ]);
    expect(state.manager.getQuery()).toBe(queryBefore);
    expect(state.manager.canUndo()).toBe(true);
  });

  it('does not reconfigure when a rebuilt props object is structurally identical', () => {
    const [tick, setTick] = createSignal(0);
    const state = setupInRoot(() =>
      createQueryBuilder(() => {
        tick();
        // A fresh object identity on every read, exactly as a consumer with inline literals —
        // or the conformance harness — produces. The deep compare is what stops this from
        // self-perpetuating.
        return {
          fields: [
            { name: 'firstName', label: 'First Name' },
            { name: 'lastName', label: 'Last Name' },
          ],
          defaultQuery: simpleQuery,
          enableMountQueryChange: false,
        };
      })
    );

    const versionBefore = state.manager.getConfigVersion();
    setTick(1);
    flush();
    setTick(2);
    flush();

    expect(state.manager.getConfigVersion()).toBe(versionBefore);
  });

  it('does not reconfigure on mount', () => {
    const state = setupInRoot(() => createQueryBuilder({ fields, defaultQuery: simpleQuery }));
    const versionAtInit = state.manager.getConfigVersion();
    flush();
    expect(state.manager.getConfigVersion()).toBe(versionAtInit);
  });

  it('refreshes option lists after a reconfigure without committing a query change', () => {
    const onQueryChange = vi.fn();
    const state = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: simpleQuery,
        enableMountQueryChange: false,
        onQueryChange,
      })
    );

    state.manager.reconfigure({ fields: [{ name: 'age', label: 'Age' }] });
    flush();

    expect(state.schema.fields.map(f => (f as { name: string }).name)).toEqual(['age']);
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('derives the wrapper class name from queryDisabled, not the root group', () => {
    const disabledRoot = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: { ...simpleQuery, disabled: true },
        enableMountQueryChange: false,
      })
    );
    expect(disabledRoot.rootGroupDisabled).toBe(true);
    expect(disabledRoot.queryDisabled).toBe(false);
    expect(disabledRoot.wrapperClassName).not.toContain('queryBuilder-disabled');

    const disabledAll = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: simpleQuery,
        disabled: true,
        enableMountQueryChange: false,
      })
    );
    expect(disabledAll.queryDisabled).toBe(true);
    expect(disabledAll.wrapperClassName).toContain('queryBuilder-disabled');
  });

  it('reports disabled paths and the inline-combinators attribute', () => {
    const state = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: simpleQuery,
        disabled: [[]],
        enableMountQueryChange: false,
      })
    );

    expect(state.rootGroupDisabled).toBe(true);
    expect(state.schema.disabledPaths).toEqual([[]]);
    expect(state.inlineCombinatorsAttr).toBe('disabled');
    expect(state.dndEnabledAttr).toBe('disabled');

    const between = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: simpleQuery,
        showCombinatorsBetweenRules: true,
        enableMountQueryChange: false,
      })
    );
    expect(between.inlineCombinatorsAttr).toBe('enabled');
  });

  it('detects independent combinators', () => {
    const state = setupInRoot(() =>
      createQueryBuilder({ fields, defaultQuery: { rules: [] }, enableMountQueryChange: false })
    );
    expect(state.independentCombinators).toBe(true);
    expect(state.inlineCombinatorsAttr).toBe('enabled');
  });

  it('routes a validation map through validationMap', () => {
    const state = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: simpleQuery,
        enableMountQueryChange: false,
        validator: () => ({ r1: { valid: false, reasons: ['nope'] } }),
      })
    );

    expect(state.schema.validationMap.r1).toEqual({ valid: false, reasons: ['nope'] });
    // A map is not a validation *result*, so the wrapper is not marked invalid by it.
    expect(state.wrapperClassName).not.toContain('queryBuilder-invalid');
  });

  it('marks the wrapper invalid for a boolean validator result', () => {
    const state = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: simpleQuery,
        enableMountQueryChange: false,
        validator: () => false,
      })
    );

    expect(state.wrapperClassName).toContain('queryBuilder-invalid');
    // A boolean result carries no per-rule detail, so the map falls back to empty.
    expect(state.schema.validationMap).toEqual({});
  });

  it('uses an empty validation map when there is no validator', () => {
    const state = setupInRoot(() => createQueryBuilder({ fields, defaultQuery: simpleQuery }));
    expect(state.schema.validationMap).toEqual({});
  });

  it('forwards function props live, without a reconfigure', () => {
    const [suffix, setSuffix] = createSignal('!');
    const state = setupInRoot(() =>
      createQueryBuilder(() => ({
        fields,
        enableMountQueryChange: false,
        getDefaultValue: () => `default${suffix()}`,
      }))
    );

    expect(state.manager.createRule().value).toBe('default!');

    const versionBefore = state.manager.getConfigVersion();
    setSuffix('?');
    flush();

    expect(state.manager.createRule().value).toBe('default?');
    expect(state.manager.getConfigVersion()).toBe(versionBefore);
  });

  it('routes getDefaultField through the live-closure path', () => {
    const state = setupInRoot(() =>
      createQueryBuilder({
        fields,
        enableMountQueryChange: false,
        getDefaultField: () => 'lastName',
      })
    );
    expect(state.manager.createRule().field).toBe('lastName');
  });

  it('picks up a function prop supplied after initialization, and its later removal', () => {
    const [getDefaultValue, setGetDefaultValue] = createSignal<(() => string) | undefined>();
    const state = setupInRoot(() =>
      createQueryBuilder(() => ({
        fields,
        enableMountQueryChange: false,
        getDefaultValue: getDefaultValue() as never,
      }))
    );

    // Absent at init: the manager applies its own precedence rules.
    expect(state.manager.createRule().value).toBe('');

    setGetDefaultValue(() => () => 'added');
    flush();
    expect(state.manager.createRule().value).toBe('added');

    // Replaced: the live closure keeps up with no reconfigure.
    const versionAfterAdd = state.manager.getConfigVersion();
    setGetDefaultValue(() => () => 'replaced');
    flush();
    expect(state.manager.createRule().value).toBe('replaced');
    expect(state.manager.getConfigVersion()).toBe(versionAfterAdd);

    // Removed: the wrapper is uninstalled rather than left calling `undefined`.
    setGetDefaultValue(undefined);
    flush();
    expect(() => state.manager.createRule()).not.toThrow();
    expect(state.manager.createRule().value).toBe('');
  });

  it.each([
    ['getDefaultField', () => 'lastName'],
    ['getDefaultOperator', () => '='],
    ['getDefaultValue', () => 'v'],
    ['getOperators', () => [{ name: '=', value: '=', label: '=' }]],
    ['getValueEditorType', () => 'text'],
    ['getValues', () => []],
    ['getValueSources', () => ['value']],
    ['getMatchModes', () => []],
    ['getParameters', () => []],
    ['getInputType', () => 'text'],
    ['getSubQueryBuilderProps', () => ({ fields: [] })],
  ] as [string, () => unknown][])(
    'reconfigures when %s appears or disappears, but not when it is merely replaced',
    (key, fn) => {
      const [present, setPresent] = createSignal(false);
      // ⚠️ `createSignal` treats a bare function as a lazy initializer; wrap it.
      const [identity, setIdentity] = createSignal<() => unknown>(() => fn);
      const state = setupInRoot(() =>
        createQueryBuilder(
          () =>
            ({
              fields,
              enableMountQueryChange: false,
              ...(present() ? { [key]: identity() } : {}),
            }) as never
        )
      );

      // Effects created inside a root are queued: the deferred reconfigure effect must take its
      // first (dependency-registering) run before the test drives anything.
      flush();
      const initial = state.manager.getConfigVersion();

      setPresent(true);
      flush();
      const afterAdd = state.manager.getConfigVersion();
      expect(afterAdd).toBeGreaterThan(initial);

      setIdentity(
        () =>
          (...args: unknown[]) =>
            fn(...(args as []))
      );
      flush();
      expect(state.manager.getConfigVersion()).toBe(afterAdd);

      setPresent(false);
      flush();
      expect(state.manager.getConfigVersion()).toBeGreaterThan(afterAdd);
    }
  );

  it('exposes schema helpers derived from the manager', () => {
    const state = setupInRoot(() =>
      createQueryBuilder({
        fields,
        enableMountQueryChange: false,
        getValueEditorSeparator: () => ' - ',
        getRuleClassname: () => 'custom-rule',
        getRuleGroupClassname: () => 'custom-group',
        getParameters: () => [{ name: 'p1', label: 'p1' }],
        getInputType: () => 'number',
        getSubQueryBuilderProps: () => ({ fields: [] }),
      })
    );

    const { schema } = state;
    expect(
      schema.getOperators('firstName', { fieldData: schema.fieldMap.firstName! }).length
    ).toBeGreaterThan(0);
    expect(
      schema.getValueEditorType('firstName', '=', { fieldData: schema.fieldMap.firstName! })
    ).toBe('text');
    expect(schema.getValues('firstName', '=', { fieldData: schema.fieldMap.firstName! })).toEqual(
      // The manager prepares the list, so the placeholder option is already in it.
      [{ id: '~', name: '~', value: '~', label: '------' }]
    );
    expect(
      schema.getValueSources('firstName', '=', { fieldData: schema.fieldMap.firstName! })
    ).toHaveLength(1);
    expect(schema.getMatchModes('firstName', { fieldData: schema.fieldMap.firstName! })).toEqual(
      []
    );
    expect(
      schema.getValueEditorSeparator('firstName', '=', { fieldData: schema.fieldMap.firstName! })
    ).toBe(' - ');
    expect(
      schema.getRuleClassname(schema.createRule(), { fieldData: schema.fieldMap.firstName! })
    ).toBe('custom-rule');
    expect(schema.getRuleGroupClassname(schema.createRuleGroup())).toBe('custom-group');
    expect(schema.getParameters('firstName', '=')).toHaveLength(1);
    expect(schema.getInputType('firstName', '=', { fieldData: schema.fieldMap.firstName! })).toBe(
      'number'
    );
    expect(
      schema.getSubQueryBuilderProps('firstName', { fieldData: schema.fieldMap.firstName! })
    ).toEqual({ fields: [] });
    expect(schema.getRuleDefaultOperator('firstName')).toBe('=');
    expect(schema.getRuleDefaultValue(schema.createRule())).toBe('');
    expect(schema.getQuery()).toBe(state.manager.getQuery());
    expect(schema.createRuleGroup(true)).toMatchObject({ rules: [] });
    expect(schema.accessibleDescriptionGenerator({ path: [], qbId: '' })).toBeTypeOf('string');
    expect(schema.maxLevels).toBe(Infinity);
    expect(schema.enableDragAndDrop).toBe(false);
  });

  it('falls back to defaults for absent schema function props', () => {
    const state = setupInRoot(() => createQueryBuilder({ fields, enableMountQueryChange: false }));
    const { schema } = state;
    expect(
      schema.getValueEditorSeparator('firstName', '=', { fieldData: schema.fieldMap.firstName! })
    ).toBe('');
    expect(
      schema.getRuleClassname(schema.createRule(), { fieldData: schema.fieldMap.firstName! })
    ).toBe('');
    expect(schema.getRuleGroupClassname(schema.createRuleGroup())).toBe('');
    expect(schema.getParameters()).toEqual([]);
    expect(schema.getInputType('firstName', '=', { fieldData: schema.fieldMap.firstName! })).toBe(
      'text'
    );
    expect(
      schema.getSubQueryBuilderProps('firstName', { fieldData: schema.fieldMap.firstName! })
    ).toEqual({});
    expect(schema.parseNumbers).toBe(false);
  });

  it('honors maxLevels only when positive', () => {
    const capped = setupInRoot(() =>
      createQueryBuilder({ fields, maxLevels: 2, enableMountQueryChange: false })
    );
    expect(capped.schema.maxLevels).toBe(2);

    const ignored = setupInRoot(() =>
      createQueryBuilder({ fields, maxLevels: 0, enableMountQueryChange: false })
    );
    expect(ignored.schema.maxLevels).toBe(Infinity);
  });

  it('exposes a context value that tracks configuration changes', () => {
    const [notToggle, setNotToggle] = createSignal(false);
    const state = setupInRoot(() =>
      createQueryBuilder(() => ({
        fields,
        showNotToggle: notToggle(),
        enableMountQueryChange: false,
      }))
    );

    expect(state.context.showNotToggle).toBe(false);
    expect(state.context.translations?.fields?.title).toBeTypeOf('string');
    expect(state.context.controlClassnames).toBe(state.classNames);
    expect(state.context.controlElements).toBe(state.controls);

    setNotToggle(true);
    flush();

    // A getter object, not a frozen snapshot: the context value stays live for descendants.
    expect(state.context.showNotToggle).toBe(true);
    expect(state.schema.showNotToggle).toBe(true);
  });

  it('applies resetOnFieldChange and resetOnOperatorChange through the manager', () => {
    // These reach the manager as options rather than being reimplemented here; the value editor
    // reset effect handles only the editor-shape half.
    const state = setupInRoot(() =>
      createQueryBuilder({
        fields,
        defaultQuery: simpleQuery,
        enableMountQueryChange: false,
        resetOnOperatorChange: true,
      })
    );

    state.manager.update('field', 'lastName', [0]);
    flush();
    expect(state.query.rules[0]).toMatchObject({ operator: '=', value: '' });

    state.manager.update('value', 'Vai', [0]);
    state.manager.update('operator', '>', [0]);
    flush();
    expect(state.query.rules[0]).toMatchObject({ value: '' });
  });

  it('exposes every schema and context member as a live getter', () => {
    const state = setupInRoot(() =>
      createQueryBuilder({ fields, defaultQuery: simpleQuery, enableMountQueryChange: false })
    );

    // Reading through `Object.keys` exercises every getter: a member accidentally written as a
    // snapshot instead of a getter freezes descendants on the first value.
    for (const key of Object.keys(state.schema)) {
      expect(() => (state.schema as unknown as Record<string, unknown>)[key], key).not.toThrow();
    }
    for (const key of Object.keys(state.context)) {
      expect(() => (state.context as unknown as Record<string, unknown>)[key], key).not.toThrow();
    }
    for (const key of Object.keys(state)) {
      expect(() => (state as unknown as Record<string, unknown>)[key], key).not.toThrow();
    }

    expect(state.translations.fields.title).toBeTypeOf('string');
    expect(state.classNames.queryBuilder).toBeTypeOf('string');
    expect(state.controls).toEqual({});
    expect(state.tree.root).toBe(state.rootGroup);
  });

  it('accepts a non-function getDefaultOperator', () => {
    const state = setupInRoot(() =>
      createQueryBuilder({ fields, enableMountQueryChange: false, getDefaultOperator: '>' })
    );
    expect(state.manager.createRule().operator).toBe('>');
  });

  it('ignores a query prop that is structurally unchanged', () => {
    const [query, setQuery] = createSignal<RuleGroupType>(simpleQuery);
    const state = setupInRoot(() =>
      createQueryBuilder(() => ({ fields, query: query(), enableMountQueryChange: false }))
    );

    const before = state.manager.getQuery();
    // A new object identity carrying the same content: the signature guard is the second stage,
    // and it is what stops a parent's re-emitted copy from churning the manager.
    setQuery(structuredClone(before) as RuleGroupType);
    flush();

    expect(state.manager.getQuery()).toBe(before);
  });

  it('reconfigures when a structural option changes shape entirely', () => {
    // Exercises the deep compare's fallback arm: `undefined` and an object are neither
    // identical, both arrays, nor same-prototype objects.
    const [baseField, setBaseField] = createSignal<Record<string, unknown> | undefined>(undefined);
    const state = setupInRoot(() =>
      createQueryBuilder(() => ({ fields, baseField: baseField(), enableMountQueryChange: false }))
    );

    const versionBefore = state.manager.getConfigVersion();
    setBaseField({ datatype: 'text' });
    flush();

    expect(state.manager.getConfigVersion()).toBeGreaterThan(versionBefore);
  });

  it('is snapshot-able for the manager hand-off', () => {
    const state = setupInRoot(() => createQueryBuilder({ fields, defaultQuery: simpleQuery }));
    expect(snapshot(state.manager)).toBe(state.manager);
  });
});
