import { render } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { ShiftActionsProps } from '../types/props.js';
import { ShiftActions } from './ShiftActions.jsx';

const baseProps = (overrides: Partial<ShiftActionsProps> = {}): ShiftActionsProps =>
  ({
    testID: 'shift-actions',
    className: 'custom',
    labels: { shiftUp: '^', shiftDown: 'v' },
    titles: { shiftUp: 'Shift up', shiftDown: 'Shift down' },
    path: [0],
    level: 1,
    ruleOrGroup: { field: 'f1', operator: '=', value: '' },
    schema: {},
    ...overrides,
  }) as ShiftActionsProps;

const buttons = (el: Element): HTMLButtonElement[] => [...el.querySelectorAll('button')];

describe('ShiftActions', () => {
  it('renders two buttons carrying the labels and titles, in up/down order', () => {
    const { getByTestId } = render(() => <ShiftActions {...baseProps()} />);
    const container = getByTestId('shift-actions');
    expect(container.tagName).toBe('DIV');
    expect(container).toHaveClass('custom');
    const [up, down] = buttons(container);
    expect(up).toHaveAttribute('type', 'button');
    expect(up).toHaveAttribute('title', 'Shift up');
    expect(up.textContent).toBe('^');
    expect(down).toHaveAttribute('title', 'Shift down');
    expect(down.textContent).toBe('v');
  });

  it('forwards the click event to the shift handlers', () => {
    const shiftUp = vi.fn();
    const shiftDown = vi.fn();
    const { getByTestId } = render(() => <ShiftActions {...baseProps({ shiftUp, shiftDown })} />);
    const [up, down] = buttons(getByTestId('shift-actions'));
    up.click();
    down.click();
    expect(shiftUp.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
    expect(shiftDown.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
  });

  it('disables each button independently', () => {
    const { getByTestId } = render(() => (
      <ShiftActions {...baseProps({ shiftUpDisabled: true })} />
    ));
    const [up, down] = buttons(getByTestId('shift-actions'));
    expect(up).toBeDisabled();
    expect(down).not.toBeDisabled();
  });

  it('disables both buttons when the control itself is disabled', () => {
    const { getByTestId } = render(() => <ShiftActions {...baseProps({ disabled: true })} />);
    for (const b of buttons(getByTestId('shift-actions'))) expect(b).toBeDisabled();
  });

  it('updates when its props change', () => {
    const [disabled, setDisabled] = createSignal(false);
    const { getByTestId } = render(() => (
      <ShiftActions
        {...baseProps({
          get shiftUpDisabled() {
            return disabled();
          },
        })}
      />
    ));
    expect(buttons(getByTestId('shift-actions'))[0]).not.toBeDisabled();
    setDisabled(true);
    flush();
    expect(buttons(getByTestId('shift-actions'))[0]).toBeDisabled();
  });
});
