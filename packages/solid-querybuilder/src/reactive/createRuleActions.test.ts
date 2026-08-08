import type { RuleGroupType, RuleType } from '@react-querybuilder/core';
import { QueryManager } from '@react-querybuilder/core';
import { createStore } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { flatQuery, testFields } from '../../test/support.js';
import type { QueryBuilderProps } from '../types/props.js';
import { createRuleActions } from './createRuleActions.js';

const nested: RuleGroupType = {
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'r0', field: 'firstName', operator: '=', value: 'Steve' },
    {
      id: 'g1',
      combinator: 'or',
      rules: [{ id: 'r1', field: 'lastName', operator: '=', value: 'Vai' }],
    },
  ],
};

const setup = (props: Partial<QueryBuilderProps<RuleGroupType>> = {}, query = flatQuery) => {
  const manager = new QueryManager(structuredClone(query), { fields: testFields, history: true });
  const actions = createRuleActions(() => props as never, manager as never);
  return { manager, actions };
};

const newRule: RuleType = { id: 'new', field: 'age', operator: '=', value: 1 };

describe('createRuleActions', () => {
  describe('onRuleAdd', () => {
    it('adds a rule', () => {
      const { manager, actions } = setup();
      actions.onRuleAdd(newRule, []);
      expect(manager.getQuery().rules).toHaveLength(3);
    });

    it('is vetoed by onAddRule returning false', () => {
      const { manager, actions } = setup({ onAddRule: () => false });
      actions.onRuleAdd(newRule, []);
      expect(manager.getQuery().rules).toHaveLength(2);
    });

    it('uses the replacement rule onAddRule returns', () => {
      const replacement: RuleType = { id: 'replaced', field: 'age', operator: '>', value: 99 };
      const { manager, actions } = setup({ onAddRule: () => replacement as never });
      actions.onRuleAdd(newRule, []);
      expect(manager.getQuery().rules.at(-1)).toMatchObject({ value: 99 });
    });

    it('passes the current query and the context through', () => {
      const onAddRule = vi.fn(() => true);
      const { manager, actions } = setup({ onAddRule: onAddRule as never });
      const queryAtCallTime = manager.getQuery();
      actions.onRuleAdd(newRule, [], 'ctx');
      expect(onAddRule).toHaveBeenCalledWith(newRule, [], queryAtCallTime, 'ctx');
    });
  });

  describe('onGroupAdd', () => {
    it('adds a group', () => {
      const { manager, actions } = setup();
      actions.onGroupAdd({ combinator: 'or', rules: [] } as RuleGroupType, []);
      expect(manager.getQuery().rules).toHaveLength(3);
    });

    it('is vetoed by onAddGroup returning false', () => {
      const { manager, actions } = setup({ onAddGroup: () => false });
      actions.onGroupAdd({ combinator: 'or', rules: [] } as RuleGroupType, []);
      expect(manager.getQuery().rules).toHaveLength(2);
    });

    it('uses the replacement group onAddGroup returns', () => {
      const { manager, actions } = setup({
        onAddGroup: () => ({ id: 'g', combinator: 'xor', rules: [] }) as never,
      });
      actions.onGroupAdd({ combinator: 'or', rules: [] } as RuleGroupType, []);
      expect(manager.getQuery().rules.at(-1)).toMatchObject({ combinator: 'xor' });
    });
  });

  describe('onPropChange', () => {
    it('updates a property', () => {
      const { manager, actions } = setup();
      actions.onPropChange('value', 'Joe', [0]);
      expect((manager.getQuery().rules[0] as RuleType).value).toBe('Joe');
    });
  });

  describe('remove', () => {
    it('removes a rule', () => {
      const { manager, actions } = setup();
      actions.onRuleRemove([0]);
      expect(manager.getQuery().rules).toHaveLength(1);
    });

    it('shares one implementation with onGroupRemove', () => {
      const { actions } = setup();
      expect(actions.onRuleRemove).toBe(actions.onGroupRemove);
    });

    it('is vetoed by onRemove returning false', () => {
      const { manager, actions } = setup({ onRemove: () => false });
      actions.onRuleRemove([0]);
      expect(manager.getQuery().rules).toHaveLength(2);
    });

    it('proceeds when onRemove returns true, passing the target and context', () => {
      const onRemove = vi.fn(() => true);
      const { manager, actions } = setup({ onRemove: onRemove as never });
      const target = manager.findPath([0]);
      (actions.onRuleRemove as (p: number[], c?: unknown) => void)([0], 'ctx');
      expect(onRemove).toHaveBeenCalledWith(target, [0], expect.anything(), 'ctx');
      expect(manager.getQuery().rules).toHaveLength(1);
    });

    it('does nothing for an unresolvable path when a veto callback is present', () => {
      const onRemove = vi.fn(() => true);
      const { manager, actions } = setup({ onRemove: onRemove as never });
      actions.onRuleRemove([99]);
      expect(onRemove).not.toHaveBeenCalled();
      expect(manager.getQuery().rules).toHaveLength(2);
    });
  });

  describe('moveRule', () => {
    it('moves a rule', () => {
      const { manager, actions } = setup();
      actions.moveRule([0], [2], false);
      expect((manager.getQuery().rules[1] as RuleType).id).toBe('r0');
    });

    it('clones when asked', () => {
      const { manager, actions } = setup();
      actions.moveRule([0], [1], true);
      expect(manager.getQuery().rules).toHaveLength(3);
    });

    it('is vetoed by onMoveRule returning false', () => {
      const { manager, actions } = setup({ onMoveRule: () => false });
      actions.moveRule([0], [2], false);
      expect((manager.getQuery().rules[0] as RuleType).id).toBe('r0');
    });

    it('previews the resulting query without mutating the manager', () => {
      const onMoveRule = vi.fn(() => true);
      const { manager, actions } = setup({ onMoveRule: onMoveRule as never });
      const original = manager.getQuery();
      actions.moveRule([0], [2], false);

      const [, , , query, nextQuery] = onMoveRule.mock.calls[0] as unknown as unknown[];
      // The callback saw the query as it was, plus the query it would become.
      expect(query).toBe(original);
      expect((nextQuery as RuleGroupType).rules.map(r => (r as RuleType).id)).toEqual(['r1', 'r0']);
    });

    it('uses the replacement query onMoveRule returns', () => {
      const replacement: RuleGroupType = { id: 'x', combinator: 'or', rules: [] };
      const { manager, actions } = setup({ onMoveRule: () => replacement as never });
      actions.moveRule([0], [2], false);
      expect(manager.getQuery()).toMatchObject({ combinator: 'or', rules: [] });
    });

    it('routes a group to onMoveGroup instead', () => {
      const onMoveGroup = vi.fn(() => true);
      const onMoveRule = vi.fn(() => true);
      const { actions } = setup(
        { onMoveGroup: onMoveGroup as never, onMoveRule: onMoveRule as never },
        nested
      );
      actions.moveRule([1], [0], false);
      expect(onMoveGroup).toHaveBeenCalledTimes(1);
      expect(onMoveRule).not.toHaveBeenCalled();
    });

    it('does nothing for an unresolvable path', () => {
      const onMoveRule = vi.fn(() => true);
      const { manager, actions } = setup({ onMoveRule: onMoveRule as never });
      const before = manager.getQuery();
      actions.moveRule([99], [0], false);
      expect(onMoveRule).not.toHaveBeenCalled();
      expect(manager.getQuery()).toBe(before);
    });

    it('aborts when the preview is a no-op, without calling the callback', () => {
      const onMoveRule = vi.fn(() => true);
      const { manager, actions } = setup({ onMoveRule: onMoveRule as never });
      const before = manager.getQuery();
      // Moving a rule onto itself is a no-op the manager refuses.
      actions.moveRule([0], [0], false);
      expect(onMoveRule).not.toHaveBeenCalled();
      expect(manager.getQuery()).toBe(before);
    });
  });

  describe('groupRule', () => {
    it('groups two rules', () => {
      const { manager, actions } = setup();
      actions.groupRule([0], [1], false);
      expect(manager.getQuery().rules).toHaveLength(1);
      expect(manager.getQuery().rules[0]).toHaveProperty('rules');
    });

    it('is vetoed by onGroupRule returning false', () => {
      const { manager, actions } = setup({ onGroupRule: () => false });
      actions.groupRule([0], [1], false);
      expect(manager.getQuery().rules).toHaveLength(2);
    });

    it('uses the replacement query onGroupRule returns', () => {
      const { manager, actions } = setup({
        onGroupRule: () => ({ id: 'x', combinator: 'or', rules: [] }) as never,
      });
      actions.groupRule([0], [1], false);
      expect(manager.getQuery()).toMatchObject({ combinator: 'or', rules: [] });
    });

    it('routes a group to onGroupGroup instead', () => {
      const onGroupGroup = vi.fn(() => true);
      const { actions } = setup({ onGroupGroup: onGroupGroup as never }, nested);
      actions.groupRule([1], [0], false);
      expect(onGroupGroup).toHaveBeenCalledTimes(1);
    });

    it('does nothing for an unresolvable path', () => {
      const { manager, actions } = setup({ onGroupRule: () => true });
      const before = manager.getQuery();
      actions.groupRule([99], [0], false);
      expect(manager.getQuery()).toBe(before);
    });

    it('aborts when the preview is a no-op', () => {
      const onGroupRule = vi.fn(() => true);
      const { manager, actions } = setup({ onGroupRule: onGroupRule as never });
      const before = manager.getQuery();
      actions.groupRule([0], [0], false);
      expect(onGroupRule).not.toHaveBeenCalled();
      expect(manager.getQuery()).toBe(before);
    });
  });

  describe('history', () => {
    it('produces exactly one undo entry per action', () => {
      const { manager, actions } = setup();
      manager.clearHistory();
      actions.onRuleAdd(newRule, []);
      expect(manager.getHistory().past).toHaveLength(1);
      actions.onRuleRemove([0]);
      expect(manager.getHistory().past).toHaveLength(2);
    });

    it('reads the callbacks live, so a replacement takes effect', () => {
      const props: Partial<QueryBuilderProps<RuleGroupType>> = {};
      const manager = new QueryManager(structuredClone(flatQuery), { fields: testFields });
      const actions = createRuleActions(() => props as never, manager as never);

      actions.onRuleRemove([0]);
      expect(manager.getQuery().rules).toHaveLength(1);

      props.onRemove = () => false;
      actions.onRuleRemove([0]);
      expect(manager.getQuery().rules).toHaveLength(1);
    });
  });
});

describe('store proxies', () => {
  it('snapshots a rule held in a consumer store before handing it to the manager', () => {
    // The manager's Immer deep-freeze rejects a store proxy. This is the regression test for
    // the `snapshot()`-before-every-manager-write rule; removing that call makes it throw here.
    const { manager, actions } = setup();
    // A fresh object: `newRule` has already been through the manager elsewhere in this file, and
    // Immer's deep freeze leaves a frozen object that `createStore` declines to proxy.
    const [store] = createStore({ rule: { ...newRule } });
    expect(() => actions.onRuleAdd(store.rule, [])).not.toThrow();
    expect(manager.getQuery().rules).toHaveLength(3);
  });

  it('snapshots a replacement query returned from onMoveRule', () => {
    const [store] = createStore({
      query: { id: 'x', combinator: 'or', rules: [] } as RuleGroupType,
    });
    const { manager, actions } = setup({ onMoveRule: () => store.query as never });
    expect(() => actions.moveRule([0], [2], false)).not.toThrow();
    expect(manager.getQuery()).toMatchObject({ combinator: 'or', rules: [] });
  });

  it('snapshots a replacement query returned from onGroupRule', () => {
    const [store] = createStore({
      query: { id: 'x', combinator: 'or', rules: [] } as RuleGroupType,
    });
    const { manager, actions } = setup({ onGroupRule: () => store.query as never });
    expect(() => actions.groupRule([0], [1], false)).not.toThrow();
    expect(manager.getQuery()).toMatchObject({ combinator: 'or', rules: [] });
  });

  it('snapshots a group held in a consumer store', () => {
    const { manager, actions } = setup();
    const [store] = createStore({
      group: { id: 'g', combinator: 'or', rules: [] as RuleGroupType['rules'] },
    });
    expect(() => actions.onGroupAdd(store.group, [])).not.toThrow();
    expect(manager.getQuery().rules).toHaveLength(3);
  });
});
