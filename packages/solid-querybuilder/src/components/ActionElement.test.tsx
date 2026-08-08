import { render } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { ActionProps } from '../types/props.js';
import { ActionElement } from './ActionElement.jsx';

const baseProps = (overrides: Partial<ActionProps> = {}): ActionProps =>
  ({
    label: 'Add rule',
    title: 'Add rule title',
    className: 'custom',
    testID: 'add-rule',
    path: [],
    level: 0,
    handleOnClick: () => {},
    ruleOrGroup: { combinator: 'and', rules: [] },
    schema: {},
    ...overrides,
  }) as ActionProps;

describe('ActionElement', () => {
  it('renders a button carrying the label, title, class, and test ID', () => {
    const { getByTestId } = render(() => <ActionElement {...baseProps()} />);
    const button = getByTestId('add-rule');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('title', 'Add rule title');
    expect(button).toHaveClass('custom');
    expect(button.textContent).toBe('Add rule');
    expect(button).not.toBeDisabled();
  });

  it('calls handleOnClick with the event', () => {
    const handleOnClick = vi.fn();
    const { getByTestId } = render(() => <ActionElement {...baseProps({ handleOnClick })} />);
    getByTestId('add-rule').click();
    expect(handleOnClick).toHaveBeenCalledTimes(1);
    expect(handleOnClick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
  });

  it('is disabled when `disabled` is set and there is no disabled translation', () => {
    const { getByTestId } = render(() => <ActionElement {...baseProps({ disabled: true })} />);
    expect(getByTestId('add-rule')).toBeDisabled();
  });

  it('stays enabled and swaps label/title when a disabled translation is supplied', () => {
    const { getByTestId } = render(() => (
      <ActionElement
        {...baseProps({
          disabled: true,
          disabledTranslation: { label: 'Unlock', title: 'Unlock title' },
        })}
      />
    ));
    const button = getByTestId('add-rule');
    expect(button).not.toBeDisabled();
    expect(button.textContent).toBe('Unlock');
    expect(button).toHaveAttribute('title', 'Unlock title');
  });

  it('ignores the disabled translation while enabled', () => {
    const { getByTestId } = render(() => (
      <ActionElement
        {...baseProps({ disabledTranslation: { label: 'Unlock', title: 'Unlock title' } })}
      />
    ));
    expect(getByTestId('add-rule').textContent).toBe('Add rule');
  });

  /**
   * The props-reactivity gate for this component. A destructure at the top of `ActionElement`
   * severs every one of these and fails no type check.
   */
  it('updates when its props change', () => {
    const [label, setLabel] = createSignal('one');
    const [disabled, setDisabled] = createSignal(false);
    const { getByTestId } = render(() => (
      <ActionElement
        {...baseProps({
          get label() {
            return label();
          },
          get disabled() {
            return disabled();
          },
        })}
      />
    ));
    const button = getByTestId('add-rule');
    expect(button.textContent).toBe('one');
    expect(button).not.toBeDisabled();

    setLabel('two');
    setDisabled(true);
    flush();

    expect(button.textContent).toBe('two');
    expect(button).toBeDisabled();
  });
});
