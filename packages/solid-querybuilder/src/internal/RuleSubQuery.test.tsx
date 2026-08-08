import type { RuleGroupType } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { QueryBuilder } from '../components/QueryBuilder.jsx';

const subfields = [
  { name: 's1', label: 'S1' },
  { name: 's2', label: 'S2' },
];

const fields = [
  { name: 'sub', label: 'Sub', matchModes: true, subproperties: subfields },
  { name: 'f1', label: 'F1' },
];

const queryWith = (value: unknown): RuleGroupType => ({
  id: 'root',
  combinator: 'and',
  rules: [{ id: 'r1', field: 'sub', operator: '=', value, match: { mode: 'all' } }],
});

const emptySubQuery = { id: 'sub-root', combinator: 'and', rules: [] };

const rule = (container: Element): Element => container.querySelector('[data-testid="rule"]')!;

/** Tag plus `data-testid` (or `class`) for each direct child of the rule element. */
const ruleChildren = (container: Element): string[] =>
  [...rule(container).children].map(
    el => `${el.tagName.toLowerCase()}:${el.getAttribute('data-testid') ?? el.className}`
  );

const CustomAction = (props: { testID?: string }) => (
  <span data-testid={props.testID} class="custom-action" />
);

describe('RuleSubQuery', () => {
  /**
   * The subquery element-order contract. React's `Rule.tsx` is the spec: the subquery's header
   * sits *between* the match mode editor and the rule's action buttons, and its body sits after
   * them — both in bare `<div>`s (`RuleWithSubQueryGroupComponentsWrapper`), which are not
   * customizable.
   */
  it('interleaves the subquery group around the rule action buttons', () => {
    // Every action button is enabled, so the header wrapper's position is pinned *between* the
    // match mode editor and the buttons — not merely adjacent to `remove-rule`.
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={queryWith(emptySubQuery)}
        showCloneButtons
        showLockButtons
        showMuteButtons
      />
    ));
    expect(ruleChildren(container)).toEqual([
      'select:fields',
      'select:match-mode-editor',
      'div:ruleGroup-header',
      'button:clone-rule',
      'button:lock-rule',
      'button:mute-rule',
      'button:remove-rule',
      'div:ruleGroup-body',
    ]);
  });

  it('renders the subquery header contents, without a rule-group element of its own', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={queryWith(emptySubQuery)} />
    ));
    const header = rule(container).querySelector(':scope > .ruleGroup-header')!;
    expect(
      [...header.querySelectorAll('[data-testid]')].map(el => el.getAttribute('data-testid'))
    ).toEqual(['combinators', 'add-rule', 'add-group']);
    // The subquery's group is not a `rule-group` element; upstream wraps it in bare `<div>`s.
    expect(rule(container).querySelector('[data-testid="rule-group"]')).toBeNull();
  });

  it('leaves rules without a subquery untouched', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={{
          id: 'root',
          combinator: 'and',
          rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'v' }],
        }}
      />
    ));
    expect(ruleChildren(container)).toEqual([
      'select:fields',
      'select:operators',
      'input:value-editor',
      'button:remove-rule',
    ]);
  });

  it('offers the field subproperties as the subquery fields', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={queryWith({
          id: 'sub-root',
          combinator: 'and',
          rules: [{ id: 'sr1', field: 's1', operator: '=', value: 'x' }],
        })}
      />
    ));
    // `:scope` is load-bearing: a descendant selector otherwise matches the *outer* group's
    // body as the ancestor, picking up the rule's own field selector too.
    const fieldSelectors = rule(container).querySelectorAll(
      ':scope > .ruleGroup-body [data-testid="fields"]'
    );
    expect(fieldSelectors).toHaveLength(1);
    expect([...(fieldSelectors[0] as HTMLSelectElement).options].map(o => o.value)).toEqual([
      's1',
      's2',
    ]);
  });

  it('writes subquery edits back to the rule value', () => {
    const onQueryChange = vi.fn();
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={queryWith(emptySubQuery)}
        onQueryChange={onQueryChange}
      />
    ));
    const addRule = rule(container).querySelector(
      ':scope > .ruleGroup-header [data-testid="add-rule"]'
    ) as HTMLButtonElement;
    addRule.click();
    flush();

    expect(onQueryChange).toHaveBeenCalled();
    const nextQuery = onQueryChange.mock.calls.at(-1)![0] as RuleGroupType;
    const value = (nextQuery.rules[0] as { value: RuleGroupType }).value;
    expect(value.rules).toHaveLength(1);
    // The rule's own controls survive the round trip.
    expect(
      rule(container).querySelectorAll(':scope > .ruleGroup-body [data-testid="rule"]')
    ).toHaveLength(1);
  });

  it('seeds a rule group when the value is not already one', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={queryWith('not a group')} />
    ));
    expect(rule(container).querySelector(':scope > .ruleGroup-header')).not.toBeNull();
    expect(rule(container).querySelector(':scope > .ruleGroup-body')).not.toBeNull();
  });

  it('inherits replacement control elements from the outer query builder', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={queryWith(emptySubQuery)}
        controlElements={{ actionElement: CustomAction as never }}
      />
    ));
    expect(
      rule(container).querySelector(':scope > .ruleGroup-header [data-testid="add-rule"]')
    ).toHaveClass('custom-action');
  });

  it('propagates disabled state into the subquery', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={queryWith(emptySubQuery)} disabled />
    ));
    expect(
      rule(container).querySelector(':scope > .ruleGroup-header [data-testid="add-rule"]')
    ).toBeDisabled();
  });
});
