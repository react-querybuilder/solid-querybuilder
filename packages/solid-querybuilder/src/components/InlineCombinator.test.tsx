import { defaultCombinators, standardClassnames } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { InlineCombinatorProps } from '../types/props.js';
import { InlineCombinator } from './InlineCombinator.jsx';
import { ValueSelector } from './ValueSelector.jsx';

const baseProps = (overrides: Partial<InlineCombinatorProps> = {}): InlineCombinatorProps =>
  ({
    component: ValueSelector,
    options: defaultCombinators,
    value: 'and',
    title: 'Combinator',
    className: 'ruleGroup-combinators',
    handleOnChange: () => {},
    testID: 'ignored',
    rules: [],
    ruleGroup: { combinator: 'and', rules: [] },
    path: [1],
    level: 1,
    schema: { classNames: {}, suppressStandardClassnames: false },
    ...overrides,
  }) as unknown as InlineCombinatorProps;

const Custom = () => <span data-testid="custom-selector" />;

describe('InlineCombinator', () => {
  it('wraps the selector in a div carrying the between-rules classes', () => {
    const { getByTestId } = render(() => (
      <InlineCombinator
        {...baseProps({
          schema: {
            classNames: { betweenRules: 'custom-between' },
            suppressStandardClassnames: false,
          },
        } as never)}
      />
    ));
    const wrapper = getByTestId('inline-combinator');
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper).toHaveClass(standardClassnames.betweenRules);
    expect(wrapper).toHaveClass('custom-between');
  });

  it('suppresses the standard class when asked', () => {
    const { getByTestId } = render(() => (
      <InlineCombinator
        {...baseProps({
          schema: { classNames: {}, suppressStandardClassnames: true },
        } as never)}
      />
    ));
    expect(getByTestId('inline-combinator')).not.toHaveClass(standardClassnames.betweenRules);
  });

  it('forwards every prop but `component` to the selector, overriding its testID', () => {
    const handleOnChange = vi.fn();
    const { getByTestId } = render(() => <InlineCombinator {...baseProps({ handleOnChange })} />);
    const select = getByTestId('combinators') as HTMLSelectElement;
    // `testID` is overridden, so the incoming `'ignored'` never reaches the DOM.
    expect(getByTestId('inline-combinator').querySelector('[data-testid="ignored"]')).toBeNull();
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveClass('ruleGroup-combinators');
    expect(select).toHaveAttribute('title', 'Combinator');
    expect(select.value).toBe('and');
    select.value = 'or';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handleOnChange).toHaveBeenCalledWith('or');
  });

  it('renders whatever selector it is handed', () => {
    const { getByTestId } = render(() => (
      <InlineCombinator {...baseProps({ component: Custom as never })} />
    ));
    expect(getByTestId('custom-selector')).toBeInTheDocument();
  });
});
