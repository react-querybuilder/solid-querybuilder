import { render } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { Label } from './Label.jsx';

describe('Label', () => {
  it('renders a string label', () => {
    const { container } = render(() => <Label label="Add rule" />);
    expect(container.textContent).toBe('Add rule');
  });

  it('renders an element label', () => {
    const { container } = render(() => <Label label={<span class="x">+</span>} />);
    expect(container.querySelector('span.x')?.textContent).toBe('+');
  });

  it('renders nothing for an absent label, and emits no wrapper or whitespace', () => {
    const { container } = render(() => (
      <button type="button">
        <Label label={undefined} />
      </button>
    ));
    expect(container.querySelector('button')!.textContent).toBe('');
    expect(container.querySelector('button')!.children).toHaveLength(0);
  });

  it('tracks a changing label', () => {
    const [label, setLabel] = createSignal('one');
    const { container } = render(() => <Label label={label()} />);
    expect(container.textContent).toBe('one');
    setLabel('two');
    flush();
    expect(container.textContent).toBe('two');
  });
});
