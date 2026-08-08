import type { RuleGroupType, RuleGroupTypeIC } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { QueryBuilder } from './QueryBuilder.jsx';

const fields = [
  { name: 'f1', label: 'F1' },
  { name: 'f2', label: 'F2' },
];

const flat: RuleGroupType = {
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'r1', field: 'f1', operator: '=', value: 'v1' },
    { id: 'r2', field: 'f2', operator: '=', value: 'v2' },
  ],
};

const ic: RuleGroupTypeIC = {
  id: 'root',
  rules: [
    { id: 'r1', field: 'f1', operator: '=', value: 'v1' },
    'and',
    { id: 'r2', field: 'f2', operator: '=', value: 'v2' },
  ],
};

const testIDs = (el: Element): (string | null)[] =>
  [...el.children].map(c => c.getAttribute('data-testid'));

/**
 * The feature surface completed at Milestone B. Every one of these is cheap — core does the
 * work — but each is a distinct prop path from `QueryBuilder` to a rendered control, and none of
 * them was reachable before the remaining controls existed.
 */
describe('feature coverage', () => {
  it('renders and edits independent combinators', () => {
    const onQueryChange = vi.fn();
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={ic} onQueryChange={onQueryChange} />
    ));
    const body = container.querySelector('.ruleGroup-body')!;
    expect(testIDs(body)).toEqual(['rule', 'inline-combinator', 'rule']);
    // The group's own combinator selector is absent for an IC query.
    expect(container.querySelector('.ruleGroup-header [data-testid="combinators"]')).toBeNull();

    const select = body.querySelector(
      '[data-testid="inline-combinator"] [data-testid="combinators"]'
    ) as HTMLSelectElement;
    select.value = 'or';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    flush();
    expect((onQueryChange.mock.calls.at(-1)![0] as RuleGroupTypeIC).rules[1]).toBe('or');
  });

  it('toggles the `not` property', () => {
    const onQueryChange = vi.fn();
    const { container, getByTestId } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={flat}
        showNotToggle
        onQueryChange={onQueryChange}
      />
    ));
    expect(container.querySelector('[data-testid="rule-group"]')).not.toHaveAttribute('data-not');
    getByTestId('not-toggle').querySelector('input')!.click();
    flush();
    expect((onQueryChange.mock.calls.at(-1)![0] as RuleGroupType).not).toBe(true);
    expect(container.querySelector('[data-testid="rule-group"]')).toHaveAttribute(
      'data-not',
      'true'
    );
  });

  it('shifts a rule up and down', () => {
    const onQueryChange = vi.fn();
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={flat}
        showShiftActions
        onQueryChange={onQueryChange}
      />
    ));
    const shiftOf = (index: number) =>
      [...container.querySelectorAll('[data-testid="rule"] [data-testid="shift-actions"]')][index];
    // The first rule cannot shift up, and the last cannot shift down.
    expect(shiftOf(0).querySelectorAll('button')[0]).toBeDisabled();
    expect(shiftOf(1).querySelectorAll('button')[1]).toBeDisabled();

    (shiftOf(1).querySelectorAll('button')[0] as HTMLButtonElement).click();
    flush();
    const ids = (onQueryChange.mock.calls.at(-1)![0] as RuleGroupType).rules.map(
      r => (r as { id: string }).id
    );
    expect(ids).toEqual(['r2', 'r1']);
  });

  it('applies validation classnames from a query validator', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={flat}
        validator={() => ({ r1: false, r2: { valid: true } })}
      />
    ));
    expect(container.querySelector('[data-testid="rule"][data-rule-id="r1"]')).toHaveClass(
      'queryBuilder-invalid'
    );
    expect(container.querySelector('[data-testid="rule"][data-rule-id="r2"]')).toHaveClass(
      'queryBuilder-valid'
    );
  });

  it('marks the whole query invalid when the validator returns false', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={flat} validator={() => false} />
    ));
    expect(container.querySelector('[role="form"]')).toHaveClass('queryBuilder-invalid');
  });

  it('uses a custom accessible description generator', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={flat}
        accessibleDescriptionGenerator={({ path }) => `group at ${JSON.stringify(path)}`}
      />
    ));
    expect(container.querySelector('[data-testid="rule-group"]')).toHaveAttribute(
      'title',
      'group at []'
    );
  });

  it('disables only the rules at the given paths', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={flat} disabled={[[0]]} />
    ));
    const disabledRule = container.querySelector('[data-rule-id="r1"]')!;
    const enabledRule = container.querySelector('[data-rule-id="r2"]')!;
    expect(disabledRule).toHaveClass('queryBuilder-disabled');
    expect(disabledRule.querySelector('[data-testid="fields"]')).toBeDisabled();
    expect(enabledRule).not.toHaveClass('queryBuilder-disabled');
    expect(enabledRule.querySelector('[data-testid="fields"]')).not.toBeDisabled();
  });

  it('suppresses standard classnames everywhere', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={flat}
        showNotToggle
        showShiftActions
        showCombinatorsBetweenRules
        suppressStandardClassnames
      />
    ));
    for (const el of container.querySelectorAll('*')) {
      expect(el.className).toBe('');
    }
  });

  it('renders parameters for a rule whose value source is "parameter"', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={[
          { name: 'f1', label: 'F1', valueSources: ['value', 'parameter'] },
          { name: 'f2', label: 'F2' },
        ]}
        getParameters={() => [{ name: 'p1', label: 'P1' }]}
        defaultQuery={{
          id: 'root',
          combinator: 'and',
          rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'p1', valueSource: 'parameter' }],
        }}
      />
    ));
    const valueEditor = container.querySelector('[data-testid="value-editor"]')!;
    // `deriveRuleContext` routes `getParameters` into the value editor type and its options.
    expect(valueEditor.tagName).toBe('SELECT');
    expect([...(valueEditor as HTMLSelectElement).options].map(o => o.value)).toEqual(['p1']);
    expect(
      (container.querySelector('[data-testid="value-source-selector"]') as HTMLSelectElement).value
    ).toBe('parameter');
  });
});
