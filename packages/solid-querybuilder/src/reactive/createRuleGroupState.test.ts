import type { RuleGroupType, RuleGroupTypeAny, RuleGroupTypeIC } from '@react-querybuilder/core';
import { describe, expect, it } from 'vitest';
import { setupInRoot } from '../../test/reactive-harness.js';
import {
  baseProps,
  createRecordingActions,
  flatQuery,
  ruleGroupProps,
} from '../../test/support.js';
import { createQueryBuilder } from './createQueryBuilder.js';
import { createRuleGroupState } from './createRuleGroupState.js';

const clickEvent = (altKey: boolean) =>
  ({ altKey, preventDefault: () => {}, stopPropagation: () => {} }) as unknown as MouseEvent;

const setup = (
  overrides: Parameters<typeof ruleGroupProps>[2] = {},
  qbOverrides: Parameters<typeof baseProps>[0] = {}
) => {
  const { calls, actions } = createRecordingActions();
  const state = setupInRoot(() =>
    createQueryBuilder(baseProps({ defaultQuery: flatQuery, ...qbOverrides }))
  );
  const group = (overrides.ruleGroup ?? state.query) as RuleGroupTypeAny;
  const props = ruleGroupProps(state, group, { actions, ...overrides });
  const result = setupInRoot(() => createRuleGroupState(props));
  return { result, calls, state, props };
};

describe('createRuleGroupState', () => {
  describe('derived state', () => {
    it('resolves the combinator', () => {
      const { result } = setup();
      expect(result.combinator).toBe('and');
      expect(result.ruleGroup).toBe(result.ruleGroup);
    });

    it('passes the group through untouched when its combinator already matches', () => {
      const { result, props } = setup();
      expect(result.ruleGroup).toBe(props.ruleGroup);
    });

    it('supplies a resolved combinator on a copy when the group has none', () => {
      const { result } = setup({ ruleGroup: { rules: [] } as unknown as RuleGroupType });
      expect(result.combinator).toBe('and');
      expect(result.ruleGroup.combinator).toBe('and');
    });

    it('leaves an independent-combinator group alone', () => {
      const ic: RuleGroupTypeIC = { rules: [] };
      const { result } = setup({ ruleGroup: ic }, { defaultQuery: ic });
      expect(result.ruleGroup).not.toHaveProperty('combinator');
    });

    it('produces standard class names', () => {
      const { result } = setup();
      expect(result.classNames.header).toContain('ruleGroup-header');
      expect(result.classNames.body).toContain('ruleGroup-body');
      expect(result.outerClassName).toContain('ruleGroup');
    });

    it('includes the combinator-based and custom class names', () => {
      const { result } = setup({}, { getRuleGroupClassname: () => 'group-cls' });
      expect(result.outerClassName).toContain('group-cls');
    });

    it('combines parent and own disabled state', () => {
      expect(setup({ disabled: true }).result.disabled).toBe(true);
      expect(setup({ parentDisabled: true }).result.disabled).toBe(true);
      expect(setup().result.disabled).toBe(false);
    });

    it('combines parent and own muted state', () => {
      expect(setup({ parentMuted: true }).result.muted).toBe(true);
      expect(setup({ ruleGroup: { ...flatQuery, muted: true } }).result.muted).toBe(true);
    });

    it('adds the disabled and muted class names to the outer class', () => {
      expect(setup({ disabled: true }).result.outerClassName).toContain('queryBuilder-disabled');
      expect(setup({ parentMuted: true }).result.outerClassName).toContain('queryBuilder-muted');
    });

    it('exposes the validation result', () => {
      const { result } = setup(
        {},
        { validator: () => ({ root: { valid: false, reasons: ['no'] } }) }
      );
      expect(result.validationResult).toBeDefined();
    });

    it('derives per-child path info', () => {
      const { result } = setup();
      expect(result.pathsMemo).toHaveLength(2);
      expect(result.pathsMemo[0].path).toEqual([0]);
      expect(result.pathsMemo[1].path).toEqual([1]);
    });

    it('marks child paths disabled when the group is disabled', () => {
      const { result } = setup({ disabled: true });
      expect(result.pathsMemo.every(p => p.disabled)).toBe(true);
    });

    it('generates an accessible description', () => {
      const { result } = setup();
      expect(result.accessibleDescription).toEqual(expect.any(String));
      expect(result.accessibleDescription.length).toBeGreaterThan(0);
    });

    it('uses a custom accessible description generator', () => {
      const { result } = setup(
        {},
        { accessibleDescriptionGenerator: ({ path }: { path: number[] }) => `p:${path.length}` }
      );
      expect(result.accessibleDescription).toBe('p:0');
    });
  });

  describe('change handlers', () => {
    it('changes the combinator', () => {
      const { result, calls } = setup();
      result.onCombinatorChange('or');
      expect(calls[0].args.slice(0, 3)).toEqual(['combinator', 'or', []]);
    });

    it('changes an independent combinator at its own index', () => {
      const { result, calls } = setup();
      result.onIndependentCombinatorChange('or', 1);
      expect(calls[0].args.slice(0, 3)).toEqual(['combinator', 'or', [1]]);
    });

    it('toggles the not property', () => {
      const { result, calls } = setup();
      result.onNotToggleChange(true);
      expect(calls[0].args.slice(0, 3)).toEqual(['not', true, []]);
    });

    it('is inert when disabled', () => {
      const { result, calls } = setup({ disabled: true });
      result.onCombinatorChange('or');
      result.onIndependentCombinatorChange('or', 1);
      result.onNotToggleChange(true);
      expect(calls).toHaveLength(0);
    });
  });

  describe('action handlers', () => {
    it('stops propagation of the triggering event', () => {
      const { result } = setup();
      let prevented = false;
      let stopped = false;
      result.addRule({
        preventDefault: () => {
          prevented = true;
        },
        stopPropagation: () => {
          stopped = true;
        },
      } as unknown as MouseEvent);
      expect(prevented).toBe(true);
      expect(stopped).toBe(true);
    });

    it('adds a rule and a group, forwarding the context', () => {
      const { result, calls } = setup();
      result.addRule(undefined, 'ctx-rule');
      result.addGroup(undefined, 'ctx-group');
      expect(calls[0].name).toBe('onRuleAdd');
      expect(calls[0].args[1]).toEqual([]);
      expect(calls[0].args[2]).toBe('ctx-rule');
      expect(calls[1].name).toBe('onGroupAdd');
      expect(calls[1].args[2]).toBe('ctx-group');
    });

    it('clones a group to the next sibling position', () => {
      const { result, calls } = setup({ path: [2] });
      result.cloneGroup();
      expect(calls[0]).toMatchObject({ name: 'moveRule', args: [[2], [3], true] });
    });

    it('toggles lock and mute', () => {
      const { result, calls } = setup();
      result.toggleLockGroup();
      result.toggleMuteGroup();
      expect(calls[0].args.slice(0, 3)).toEqual(['disabled', true, []]);
      expect(calls[1].args.slice(0, 3)).toEqual(['muted', true, []]);
    });

    it('unlocks a disabled group — the only handler that works while disabled', () => {
      const { result, calls } = setup({ disabled: true });
      result.toggleLockGroup();
      expect(calls[0].args.slice(0, 3)).toEqual(['disabled', false, []]);
    });

    it('removes a group', () => {
      const { result, calls } = setup({ path: [1] });
      result.removeGroup();
      expect(calls[0]).toMatchObject({ name: 'onGroupRemove', args: [[1]] });
    });

    it('shifts up and down, forwarding altKey as the clone flag', () => {
      const { result, calls } = setup({ path: [1] });
      result.shiftGroupUp(clickEvent(true));
      result.shiftGroupDown(clickEvent(false));
      expect(calls[0].args.slice(0, 3)).toEqual([[1], 'up', true]);
      expect(calls[1].args.slice(0, 3)).toEqual([[1], 'down', false]);
    });

    it('respects shiftUpDisabled and shiftDownDisabled', () => {
      const up = setup({ shiftUpDisabled: true });
      up.result.shiftGroupUp();
      expect(up.calls).toHaveLength(0);

      const down = setup({ shiftDownDisabled: true });
      down.result.shiftGroupDown();
      expect(down.calls).toHaveLength(0);
    });

    it('is inert when disabled', () => {
      const { result, calls } = setup({ disabled: true });
      result.addRule();
      result.addGroup();
      result.cloneGroup();
      result.removeGroup();
      result.shiftGroupUp();
      result.shiftGroupDown();
      expect(calls).toHaveLength(0);
    });
  });

  describe('reactivity', () => {
    it('returns getters, not accessors, so members read without a call', () => {
      const { result } = setup();
      const descriptor = Object.getOwnPropertyDescriptor(result, 'outerClassName');
      expect(descriptor?.get).toBeTypeOf('function');
      expect(result.outerClassName).toBeTypeOf('string');
    });
  });
});
