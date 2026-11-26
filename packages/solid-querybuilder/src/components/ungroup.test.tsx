import type { RuleGroupType } from '@react-querybuilder/core';
import { standardClassnames, TestID } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { QueryBuilder } from './QueryBuilder.jsx';

const fields = [{ name: 'f1', label: 'F1' }];

// Fresh object per test: see AGENTS.md on the manager's deep freeze.
const nested = (): RuleGroupType => ({
  id: 'root',
  combinator: 'and',
  rules: [
    {
      id: 'g1',
      combinator: 'or',
      rules: [
        { id: 'r1', field: 'f1', operator: '=', value: 'a' },
        { id: 'r2', field: 'f1', operator: '=', value: 'b' },
      ],
    },
  ],
});

const lastIds = (fn: ReturnType<typeof vi.fn>): string[] =>
  (fn.mock.calls.at(-1)![0] as RuleGroupType).rules.map(r => (r as { id: string }).id);

describe('ungroup', () => {
  it('is hidden by default', () => {
    const { queryByTestId } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={nested()} />
    ));
    expect(queryByTestId(TestID.ungroup)).toBeNull();
  });

  it('renders on non-root groups only, after the clone button', () => {
    const { getAllByTestId } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={nested()} showUngroupButtons showCloneButtons />
    ));
    const buttons = getAllByTestId(TestID.ungroup);
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveClass(standardClassnames.ungroup);
    expect(buttons[0].previousElementSibling?.getAttribute('data-testid')).toBe(TestID.cloneGroup);
  });

  it('replaces the group with its rules', () => {
    const onQueryChange = vi.fn();
    const { getByTestId } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={nested()}
        showUngroupButtons
        onQueryChange={onQueryChange}
      />
    ));
    getByTestId(TestID.ungroup).click();
    flush();
    expect(lastIds(onQueryChange)).toEqual(['r1', 'r2']);
  });

  it('is cancelled when onUngroup returns false', () => {
    const onQueryChange = vi.fn();
    const onUngroup = vi.fn(() => false);
    const { getByTestId } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={nested()}
        showUngroupButtons
        onUngroup={onUngroup}
        onQueryChange={onQueryChange}
      />
    ));
    const calls = onQueryChange.mock.calls.length;
    getByTestId(TestID.ungroup).click();
    flush();
    expect(onUngroup).toHaveBeenCalledOnce();
    const [ruleGroup, path, query, nextQuery] = onUngroup.mock.calls[0] as unknown[];
    expect((ruleGroup as { id: string }).id).toBe('g1');
    expect(path).toEqual([0]);
    expect((query as RuleGroupType).rules).toHaveLength(1);
    expect((nextQuery as RuleGroupType).rules).toHaveLength(2);
    expect(onQueryChange).toHaveBeenCalledTimes(calls);
  });

  it('applies a replacement query from onUngroup', () => {
    const onQueryChange = vi.fn();
    const replacement: RuleGroupType = { id: 'root', combinator: 'and', rules: [] };
    const { getByTestId } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={nested()}
        showUngroupButtons
        onUngroup={() => replacement}
        onQueryChange={onQueryChange}
      />
    ));
    getByTestId(TestID.ungroup).click();
    flush();
    expect(lastIds(onQueryChange)).toEqual([]);
  });

  it('does nothing when the group is disabled', () => {
    const onQueryChange = vi.fn();
    const query = nested();
    (query.rules[0] as RuleGroupType).disabled = true;
    const { getByTestId } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={query}
        showUngroupButtons
        onQueryChange={onQueryChange}
      />
    ));
    const calls = onQueryChange.mock.calls.length;
    getByTestId(TestID.ungroup).click();
    flush();
    expect(onQueryChange).toHaveBeenCalledTimes(calls);
  });
});
