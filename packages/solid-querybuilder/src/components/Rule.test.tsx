import type { RuleGroupType } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { QueryBuilder } from './QueryBuilder.jsx';

const fields = [
  { name: 'f1', label: 'F1' },
  { name: 'f2', label: 'F2' },
];

const singleRule: RuleGroupType = {
  id: 'root',
  combinator: 'and',
  rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'v1' }],
};

/** The `data-testid` of every element inside the rule, in document order. */
const ruleTestIDs = (container: Element): string[] =>
  [...container.querySelector('[data-testid="rule"]')!.querySelectorAll('[data-testid]')].map(el =>
    el.getAttribute('data-testid')!
  );

describe('Rule', () => {
  /**
   * The element-order contract. React's `Rule.tsx` is the spec; step 6's fixtures pin the class
   * strings byte for byte, but *order* is asserted here, where a failure names the component.
   *
   * A purely additive change — an extra class, an extra attribute — does not turn this red. Only
   * a reordering or a dropped control does.
   */
  it('renders its controls in React Query Builder order', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={singleRule}
        showCloneButtons
        showLockButtons
        showMuteButtons
      />
    ));
    expect(ruleTestIDs(container)).toEqual([
      'fields',
      'operators',
      'value-editor',
      'clone-rule',
      'lock-rule',
      'mute-rule',
      'remove-rule',
    ]);
  });

  it('renders only the field, operator, value, and remove controls by default', () => {
    const { container } = render(() => <QueryBuilder fields={fields} defaultQuery={singleRule} />);
    expect(ruleTestIDs(container)).toEqual(['fields', 'operators', 'value-editor', 'remove-rule']);
  });

  it('renders the shift actions before the field selector', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={singleRule} showShiftActions />
    ));
    expect(ruleTestIDs(container)[0]).toBe('shift-actions');
    expect(ruleTestIDs(container)).toEqual([
      'shift-actions',
      'fields',
      'operators',
      'value-editor',
      'remove-rule',
    ]);
  });

  it('renders the match-mode slot instead of the operator for a subquery field', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={[{ name: 'sub', label: 'Sub', matchModes: true, subproperties: fields }]}
        defaultQuery={{
          combinator: 'and',
          rules: [
            {
              id: 'r1',
              field: 'sub',
              operator: '=',
              value: { combinator: 'and', rules: [] },
              match: { mode: 'all' },
            },
          ],
        }}
      />
    ));
    // The operator/value branch is not taken for a match-mode field; the match mode editor takes
    // its place, and the subquery's own group renders around the rule's action buttons.
    const ids = ruleTestIDs(container);
    // The subquery's group header/body are bare `<div>`s, not a `rule-group` element.
    expect(ids.slice(0, 3)).toEqual(['fields', 'match-mode-editor', 'combinators']);
    expect(ids).not.toContain('rule-group');
    expect(ids).not.toContain('operators');
    expect(container.querySelector('[data-testid="rule"]')).toHaveClass('rule-hasSubQuery');
  });

  it('carries the identifying attributes React puts on the rule element', () => {
    const { container } = render(() => <QueryBuilder fields={fields} defaultQuery={singleRule} />);
    const rule = container.querySelector('[data-testid="rule"]')!;
    expect(rule.tagName).toBe('DIV');
    expect(rule).toHaveClass('rule');
    expect(rule).toHaveAttribute('data-rule-id', 'r1');
    expect(rule).toHaveAttribute('data-level', '1');
    expect(rule).toHaveAttribute('data-path', '[0]');
  });

  it('omits the value controls for a unary operator', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={{
          combinator: 'and',
          rules: [{ id: 'r1', field: 'f1', operator: 'null', value: '' }],
        }}
      />
    ));
    expect(ruleTestIDs(container)).toEqual(['fields', 'operators', 'remove-rule']);
  });

  it('renders the value source selector when a field allows more than one source', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={[{ name: 'f1', label: 'F1', valueSources: ['value', 'field'] }, ...fields]}
        defaultQuery={singleRule}
      />
    ));
    expect(ruleTestIDs(container)).toEqual([
      'fields',
      'operators',
      'value-source-selector',
      'value-editor',
      'remove-rule',
    ]);
  });

  it('hides the field selector when the only field is the empty placeholder', () => {
    // The condition itself is `createRuleState`'s; this asserts the component honors it.
    const { container } = render(() => (
      <QueryBuilder
        fields={[{ name: '', value: '', label: '------' }]}
        defaultQuery={{
          combinator: 'and',
          rules: [{ id: 'r1', field: '', operator: '=', value: '' }],
        }}
      />
    ));
    expect(ruleTestIDs(container)).not.toContain('fields');
  });

  it('routes every change handler through the manager', () => {
    const onQueryChange = vi.fn();
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={singleRule}
        onQueryChange={onQueryChange}
        enableMountQueryChange={false}
      />
    ));

    const operators = container.querySelector('[data-testid="operators"]') as HTMLSelectElement;
    operators.value = '!=';
    operators.dispatchEvent(new Event('change', { bubbles: true }));
    flush();
    expect(onQueryChange.mock.lastCall?.[0].rules[0].operator).toBe('!=');

    const value = container.querySelector('[data-testid="value-editor"]') as HTMLInputElement;
    value.value = 'v2';
    value.dispatchEvent(new Event('input', { bubbles: true }));
    flush();
    expect(onQueryChange.mock.lastCall?.[0].rules[0].value).toBe('v2');
  });

  it('removes itself', () => {
    const { container } = render(() => <QueryBuilder fields={fields} defaultQuery={singleRule} />);
    (container.querySelector('[data-testid="remove-rule"]') as HTMLButtonElement).click();
    flush();
    expect(container.querySelector('[data-testid="rule"]')).toBeNull();
  });

  it('clones and locks itself', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={singleRule} showCloneButtons showLockButtons />
    ));
    (container.querySelector('[data-testid="clone-rule"]') as HTMLButtonElement).click();
    flush();
    expect(container.querySelectorAll('[data-testid="rule"]')).toHaveLength(2);

    (container.querySelector('[data-testid="lock-rule"]') as HTMLButtonElement).click();
    flush();
    expect(container.querySelector('[data-testid="rule"]')).toHaveClass('queryBuilder-disabled');
  });

  /**
   * The props-reactivity gate for this component. `Rule` receives its rule as a prop from
   * `RuleGroup`; destructuring `props` at the top of `Rule` severs this and fails no type check
   * — which is exactly why the assertion is on rendered output rather than on a call.
   */
  it('updates when its rule prop changes', () => {
    const [query, setQuery] = createSignal<RuleGroupType>(singleRule);
    const { container } = render(() => (
      <QueryBuilder fields={fields} query={query()} onQueryChange={() => {}} />
    ));

    const fieldSelector = () =>
      container.querySelector('[data-testid="fields"]') as HTMLSelectElement;
    const valueEditor = () =>
      container.querySelector('[data-testid="value-editor"]') as HTMLInputElement;

    expect(fieldSelector().value).toBe('f1');
    expect(valueEditor().value).toBe('v1');

    setQuery({
      id: 'root',
      combinator: 'and',
      rules: [{ id: 'r1', field: 'f2', operator: '=', value: 'v2' }],
    });
    flush();

    expect(fieldSelector().value).toBe('f2');
    expect(valueEditor().value).toBe('v2');
  });
});
