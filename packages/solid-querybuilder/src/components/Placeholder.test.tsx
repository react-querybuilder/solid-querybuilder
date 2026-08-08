import { render } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import { Placeholder } from './Placeholder.jsx';

describe('Placeholder', () => {
  it('renders real DOM, not an empty container', () => {
    // Guards the Vitest/jsdom/solid-js wiring itself: a mis-resolved `solid-js` condition
    // (server runtime instead of dev/browser) renders nothing, and this is otherwise
    // misdiagnosed as a component bug at step 4.
    const { container, getByTestId } = render(() => <Placeholder label="hello" />);
    expect(container.textContent).toBe('hello');
    expect(getByTestId('solid-querybuilder-placeholder')).toBeInTheDocument();
  });

  it('falls back to the default label', () => {
    const { getByTestId } = render(() => <Placeholder />);
    expect(getByTestId('solid-querybuilder-placeholder').textContent).toBe('placeholder');
  });
});
