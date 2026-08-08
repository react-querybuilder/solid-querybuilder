import type { RuleGroupType } from '@react-querybuilder/core';
import { QueryManager } from '@react-querybuilder/core';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { setupInRoot } from '../../test/reactive-harness.js';
import { flatQuery, testFields } from '../../test/support.js';
import { createRuleContext } from './createRuleContext.js';
import { createRuleGroupContext } from './createRuleGroupContext.js';

const nested: RuleGroupType = {
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' },
    { id: 'g1', combinator: 'or', rules: [] },
  ],
};

const newManager = (query: RuleGroupType = flatQuery) =>
  new QueryManager(structuredClone(query), { fields: testFields });

describe('createRuleContext', () => {
  it('resolves the rule at the given path in one call', () => {
    const manager = newManager();
    const ctx = setupInRoot(() => createRuleContext(manager, () => [0], manager.getQuery));

    expect(ctx()?.fieldData.name).toBe('firstName');
    expect(ctx()?.operators.length).toBeGreaterThan(0);
    expect(ctx()?.valueEditorType).toBe('text');
  });

  it('returns null for an unresolvable path', () => {
    const manager = newManager();
    const ctx = setupInRoot(() => createRuleContext(manager, () => [99], manager.getQuery));
    expect(ctx()).toBeNull();
  });

  it('returns null when the path resolves to a group', () => {
    const manager = newManager(nested);
    const ctx = setupInRoot(() => createRuleContext(manager, () => [1], manager.getQuery));
    expect(ctx()).toBeNull();
  });

  it('recomputes when the path changes', () => {
    const manager = newManager();
    const [path, setPath] = createSignal([0]);
    const ctx = setupInRoot(() => createRuleContext(manager, path, manager.getQuery));

    expect(ctx()?.fieldData.name).toBe('firstName');
    setPath([1]);
    flush();
    expect(ctx()?.fieldData.name).toBe('lastName');
  });

  it('recomputes when the query identity changes', () => {
    const manager = newManager();
    const [query, setQuery] = createSignal(manager.getQuery());
    const ctx = setupInRoot(() => createRuleContext(manager, () => [0], query));

    expect(ctx()?.fieldData.name).toBe('firstName');

    manager.update('field', 'age', [0]);
    // The accessor exists only to establish the dependency; without a new identity the memo
    // legitimately returns the cached value.
    setQuery(manager.getQuery());
    flush();

    expect(ctx()?.fieldData.name).toBe('age');
    expect(ctx()?.inputType).toBe('number');
  });
});

describe('createRuleGroupContext', () => {
  it('resolves the root group by default path', () => {
    const manager = newManager();
    const ctx = setupInRoot(() => createRuleGroupContext(manager, () => [], manager.getQuery));
    expect(ctx()?.combinator).toBe('and');
  });

  it('resolves a nested group', () => {
    const manager = newManager(nested);
    const ctx = setupInRoot(() => createRuleGroupContext(manager, () => [1], manager.getQuery));
    expect(ctx()?.combinator).toBe('or');
  });

  it('returns null when the path resolves to a rule', () => {
    const manager = newManager();
    const ctx = setupInRoot(() => createRuleGroupContext(manager, () => [0], manager.getQuery));
    expect(ctx()).toBeNull();
  });

  it('recomputes when the query identity changes', () => {
    const manager = newManager();
    const [query, setQuery] = createSignal(manager.getQuery());
    const ctx = setupInRoot(() => createRuleGroupContext(manager, () => [], query));

    expect(ctx()?.combinator).toBe('and');

    manager.update('combinator', 'or', []);
    setQuery(manager.getQuery());
    flush();

    expect(ctx()?.combinator).toBe('or');
  });
});
