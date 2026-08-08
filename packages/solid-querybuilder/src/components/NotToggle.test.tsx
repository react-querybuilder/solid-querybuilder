import { render } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { NotToggleProps } from '../types/props.js';
import { NotToggle } from './NotToggle.jsx';

const baseProps = (overrides: Partial<NotToggleProps> = {}): NotToggleProps =>
  ({
    testID: 'not-toggle',
    className: 'custom',
    title: 'Invert this group',
    label: 'Not',
    checked: false,
    handleOnChange: () => {},
    path: [],
    level: 0,
    ruleGroup: { combinator: 'and', rules: [] },
    schema: {},
    ...overrides,
  }) as NotToggleProps;

describe('NotToggle', () => {
  it('renders a label wrapping a checkbox and the label text', () => {
    const { getByTestId } = render(() => <NotToggle {...baseProps()} />);
    const label = getByTestId('not-toggle');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveClass('custom');
    expect(label).toHaveAttribute('title', 'Invert this group');
    expect(label.textContent).toBe('Not');
    const input = label.querySelector('input')!;
    expect(input).toHaveAttribute('type', 'checkbox');
    expect(input).not.toBeChecked();
  });

  it('associates the label with the checkbox by a unique id', () => {
    const { getByTestId } = render(() => (
      <>
        <NotToggle {...baseProps()} />
        <NotToggle {...baseProps({ testID: 'not-toggle-2' })} />
      </>
    ));
    const first = getByTestId('not-toggle');
    const second = getByTestId('not-toggle-2');
    const id = first.querySelector('input')!.id;
    expect(id).toBeTruthy();
    expect(first).toHaveAttribute('for', id);
    expect(second.querySelector('input')!.id).not.toBe(id);
  });

  it('reflects `checked` and reports changes', () => {
    const handleOnChange = vi.fn();
    const { getByTestId } = render(() => (
      <NotToggle {...baseProps({ checked: true, handleOnChange })} />
    ));
    const input = getByTestId('not-toggle').querySelector('input')!;
    expect(input).toBeChecked();
    input.click();
    expect(handleOnChange).toHaveBeenCalledWith(false);
  });

  it('is disabled when `disabled` is set', () => {
    const { getByTestId } = render(() => <NotToggle {...baseProps({ disabled: true })} />);
    expect(getByTestId('not-toggle').querySelector('input')).toBeDisabled();
  });

  it('updates when its props change', async () => {
    const [checked, setChecked] = createSignal(false);
    const { getByTestId } = render(() => (
      <NotToggle
        {...baseProps({
          get checked() {
            return checked();
          },
        })}
      />
    ));
    expect(getByTestId('not-toggle').querySelector('input')).not.toBeChecked();
    setChecked(true);
    flush();
    expect(getByTestId('not-toggle').querySelector('input')).toBeChecked();
  });
});
