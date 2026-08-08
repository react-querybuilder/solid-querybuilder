import type { RuleGroupType, RuleGroupTypeIC } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { RuleGroupProps } from '../types/props.js';
import { QueryBuilder } from './QueryBuilder.jsx';

const fields = [
  { name: 'f1', label: 'F1' },
  { name: 'f2', label: 'F2' },
];

const nested: RuleGroupType = {
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'r1', field: 'f1', operator: '=', value: 'v1' },
    { id: 'g1', combinator: 'or', rules: [{ id: 'r2', field: 'f2', operator: '=', value: 'v2' }] },
  ],
};

/** The `data-testid` of every element in the group's header, in document order. */
const headerTestIDs = (group: Element): string[] =>
  [...group.querySelector('.ruleGroup-header')!.querySelectorAll('[data-testid]')].map(el =>
    el.getAttribute('data-testid')!
  );

const CustomGroup = (props: RuleGroupProps) => (
  <div data-testid="custom-group" data-path={JSON.stringify(props.path)} />
);

const groupAtPath = (container: Element, path: string): Element =>
  container.querySelector(`[data-testid="rule-group"][data-path="${path}"]`)!;

describe('RuleGroup', () => {
  /** The element-order contract; see the equivalent note in `Rule.test.tsx`. */
  it('renders its header controls in React Query Builder order', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={nested}
        showCloneButtons
        showLockButtons
        showMuteButtons
      />
    ));
    // Root: no clone (path length 0) and no remove.
    expect(headerTestIDs(groupAtPath(container, '[]'))).toEqual([
      'combinators',
      'add-rule',
      'add-group',
      'lock-group',
      'mute-group',
    ]);
    // Nested: the full set.
    expect(headerTestIDs(groupAtPath(container, '[1]'))).toEqual([
      'combinators',
      'add-rule',
      'add-group',
      'clone-group',
      'lock-group',
      'mute-group',
      'remove-group',
    ]);
  });

  it('wraps the header and body in their own divs, in that order', () => {
    const { container } = render(() => <QueryBuilder fields={fields} defaultQuery={nested} />);
    const group = groupAtPath(container, '[]');
    expect([...group.children].map(c => c.className)).toEqual([
      'ruleGroup-header',
      'ruleGroup-body',
    ]);
  });

  it('carries the identifying attributes React puts on the group element', () => {
    const { container } = render(() => <QueryBuilder fields={fields} defaultQuery={nested} />);
    const group = groupAtPath(container, '[]');
    expect(group).toHaveClass('ruleGroup');
    expect(group).toHaveAttribute('title', 'Query builder');
    expect(group).toHaveAttribute('data-rule-group-id', 'root');
    expect(group).toHaveAttribute('data-level', '0');
    expect(group).not.toHaveAttribute('data-not');
  });

  it('sets data-not for a negated group', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={{ ...nested, not: true }} />
    ));
    expect(groupAtPath(container, '[]')).toHaveAttribute('data-not', 'true');
  });

  it('omits the add-group button at the maximum level', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={nested} maxLevels={1} />
    ));
    expect(headerTestIDs(groupAtPath(container, '[]'))).toContain('add-group');
    expect(headerTestIDs(groupAtPath(container, '[1]'))).not.toContain('add-group');
  });

  it('renders the not-toggle, shift-actions, and undo/redo controls', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={nested}
        showNotToggle
        showShiftActions
        showUndoRedo
      />
    ));
    expect(headerTestIDs(groupAtPath(container, '[1]'))).toEqual([
      'shift-actions',
      'combinators',
      'not-toggle',
      'add-rule',
      'add-group',
      'remove-group',
    ]);
    // Shift actions and the remove button are omitted at the root; undo/redo is root-only.
    expect(headerTestIDs(groupAtPath(container, '[]'))).toEqual([
      'combinators',
      'not-toggle',
      'add-rule',
      'add-group',
      'undo-redo-actions',
      'undo-action',
      'redo-action',
    ]);
  });

  it('renders the inline combinator between rules', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={nested} showCombinatorsBetweenRules />
    ));
    // The group's own combinator selector moves out of the header when combinators sit between
    // rules, and an inline combinator appears before every child but the first.
    expect(headerTestIDs(groupAtPath(container, '[]'))).toEqual(['add-rule', 'add-group']);
    const body = groupAtPath(container, '[]').querySelector('.ruleGroup-body')!;
    expect([...body.children].map(c => c.getAttribute('data-testid'))).toEqual([
      'rule',
      'inline-combinator',
      'rule-group',
    ]);
    expect(
      body.querySelector('[data-testid="inline-combinator"] > [data-testid="combinators"]')
    ).not.toBeNull();
  });

  it('renders children in query order, through schema.controls', () => {
    const { container } = render(() => <QueryBuilder fields={fields} defaultQuery={nested} />);
    const body = groupAtPath(container, '[]').querySelector('.ruleGroup-body')!;
    expect([...body.children].map(c => c.getAttribute('data-testid'))).toEqual([
      'rule',
      'rule-group',
    ]);
  });

  it('recurses through the replacement ruleGroup control, not a self-import', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={nested}
        controlElements={{ ruleGroup: CustomGroup as never }}
      />
    ));
    // The replacement applies at the root *and* would apply at every level below it.
    expect(container.querySelectorAll('[data-testid="custom-group"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="rule-group"]')).toBeNull();
  });

  it('adds rules and groups', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={{ id: 'root', combinator: 'and', rules: [] }} />
    ));
    (container.querySelector('[data-testid="add-rule"]') as HTMLButtonElement).click();
    flush();
    expect(container.querySelectorAll('[data-testid="rule"]')).toHaveLength(1);

    (container.querySelector('[data-testid="add-group"]') as HTMLButtonElement).click();
    flush();
    expect(container.querySelectorAll('[data-testid="rule-group"]')).toHaveLength(2);
  });

  it('changes its combinator', () => {
    const onQueryChange = vi.fn();
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={nested}
        onQueryChange={onQueryChange}
        enableMountQueryChange={false}
      />
    ));
    const select = container.querySelector('[data-testid="combinators"]') as HTMLSelectElement;
    select.value = 'or';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    flush();
    expect(onQueryChange.mock.lastCall?.[0].combinator).toBe('or');
  });

  it('removes, clones, locks, and mutes a nested group', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={nested}
        showCloneButtons
        showLockButtons
        showMuteButtons
      />
    ));
    const clickIn = (path: string, testID: string) =>
      (
        groupAtPath(container, path).querySelector(
          `.ruleGroup-header > [data-testid="${testID}"]`
        ) as HTMLButtonElement
      ).click();

    clickIn('[1]', 'clone-group');
    flush();
    expect(container.querySelectorAll('[data-testid="rule-group"]')).toHaveLength(3);

    clickIn('[1]', 'lock-group');
    flush();
    expect(groupAtPath(container, '[1]')).toHaveClass('queryBuilder-disabled');

    clickIn('[2]', 'mute-group');
    flush();
    expect(groupAtPath(container, '[2]')).toHaveClass('queryBuilder-muted');

    clickIn('[2]', 'remove-group');
    flush();
    expect(container.querySelectorAll('[data-testid="rule-group"]')).toHaveLength(2);
  });

  it('renders an independent-combinator query without remounting its neighbors', () => {
    const ic: RuleGroupTypeIC = {
      id: 'root',
      rules: [
        { id: 'r1', field: 'f1', operator: '=', value: 'v1' },
        'and',
        { id: 'r2', field: 'f2', operator: '=', value: 'v2' },
      ],
    };
    const { container } = render(() => <QueryBuilder fields={fields} defaultQuery={ic} />);
    const rulesBefore = [...container.querySelectorAll('[data-testid="rule"]')];
    expect(rulesBefore).toHaveLength(2);

    // The string entry has no `id`, so it is keyed by path and value: changing it must not
    // remount the rules on either side of it.
    const value = container.querySelector('[data-testid="value-editor"]') as HTMLInputElement;
    value.value = 'changed';
    value.dispatchEvent(new Event('input', { bubbles: true }));
    flush();

    const rulesAfter = [...container.querySelectorAll('[data-testid="rule"]')];
    expect(rulesAfter[0]).toBe(rulesBefore[0]);
    expect(rulesAfter[1]).toBe(rulesBefore[1]);
  });

  /** The props-reactivity gate for this component. */
  it('updates when its group prop changes', () => {
    const [query, setQuery] = createSignal<RuleGroupType>(nested);
    const { container } = render(() => (
      <QueryBuilder fields={fields} query={query()} onQueryChange={() => {}} />
    ));
    const combinator = () =>
      container.querySelector('[data-testid="combinators"]') as HTMLSelectElement;

    expect(combinator().value).toBe('and');
    expect(container.querySelectorAll('[data-testid="rule"]')).toHaveLength(2);

    setQuery({
      id: 'root',
      combinator: 'or',
      rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'v1' }],
    });
    flush();

    expect(combinator().value).toBe('or');
    expect(container.querySelectorAll('[data-testid="rule"]')).toHaveLength(1);
  });
});
