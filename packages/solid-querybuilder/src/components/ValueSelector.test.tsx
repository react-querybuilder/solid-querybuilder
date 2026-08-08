import type { FullOption } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { ValueSelectorProps } from '../types/props.js';
import { ValueSelector } from './ValueSelector.jsx';

const opts = (...names: string[]): FullOption[] =>
  names.map(name => ({ name, value: name, label: name.toUpperCase() }));

const baseProps = (overrides: Partial<ValueSelectorProps> = {}): ValueSelectorProps =>
  ({
    testID: 'combinators',
    className: 'custom',
    title: 'Combinator',
    path: [],
    level: 0,
    options: opts('and', 'or'),
    value: 'and',
    handleOnChange: () => {},
    schema: {},
    ...overrides,
  }) as ValueSelectorProps;

describe('ValueSelector', () => {
  it('renders a select carrying the title, class, and test ID', () => {
    const { getByTestId } = render(() => <ValueSelector {...baseProps()} />);
    const select = getByTestId('combinators') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveAttribute('title', 'Combinator');
    expect(select).toHaveClass('custom');
    expect(select.multiple).toBe(false);
    expect([...select.options].map(o => [o.value, o.text])).toEqual([
      ['and', 'AND'],
      ['or', 'OR'],
    ]);
    expect(select.value).toBe('and');
  });

  it('renders optgroups for a grouped option list', () => {
    const { getByTestId } = render(() => (
      <ValueSelector
        {...baseProps({
          options: [
            { label: 'Group 1', options: opts('a', 'b') },
            { label: 'Group 2', options: opts('c') },
          ] as never,
          value: 'c',
        })}
      />
    ));
    const select = getByTestId('combinators') as HTMLSelectElement;
    expect([...select.querySelectorAll('optgroup')].map(g => g.label)).toEqual([
      'Group 1',
      'Group 2',
    ]);
    expect(select.value).toBe('c');
  });

  it('renders no options for an option list that is neither an array nor a group array', () => {
    const { getByTestId } = render(() => (
      <ValueSelector {...baseProps({ options: undefined as never })} />
    ));
    expect((getByTestId('combinators') as HTMLSelectElement).options).toHaveLength(0);
  });

  it('marks an option disabled', () => {
    const { getByTestId } = render(() => (
      <ValueSelector
        {...baseProps({ options: [{ name: 'and', value: 'and', label: 'AND', disabled: true }] })}
      />
    ));
    expect((getByTestId('combinators') as HTMLSelectElement).options[0].disabled).toBe(true);
  });

  it('reports the selected value on change', () => {
    const handleOnChange = vi.fn();
    const { getByTestId } = render(() => <ValueSelector {...baseProps({ handleOnChange })} />);
    const select = getByTestId('combinators') as HTMLSelectElement;
    select.value = 'or';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handleOnChange).toHaveBeenCalledWith('or');
  });

  it('reports every selected value for a multiselect', () => {
    const handleOnChange = vi.fn();
    const { getByTestId } = render(() => (
      <ValueSelector
        {...baseProps({
          multiple: true,
          options: opts('a', 'b', 'c'),
          value: 'a',
          handleOnChange,
        })}
      />
    ));
    const select = getByTestId('combinators') as HTMLSelectElement;
    expect(select.multiple).toBe(true);
    select.options[1].selected = true;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    // Comma-joined by default; `listsAsArrays` is what makes it an array.
    expect(handleOnChange).toHaveBeenCalledWith('a,b');
  });

  it('reports an array for a multiselect with listsAsArrays', () => {
    const handleOnChange = vi.fn();
    const { getByTestId } = render(() => (
      <ValueSelector
        {...baseProps({
          multiple: true,
          listsAsArrays: true,
          options: opts('a', 'b'),
          value: ['a'] as never,
          handleOnChange,
        })}
      />
    ));
    const select = getByTestId('combinators') as HTMLSelectElement;
    expect([...select.selectedOptions].map(o => o.value)).toEqual(['a']);
    select.options[1].selected = true;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handleOnChange).toHaveBeenCalledWith(['a', 'b']);
  });

  /** The props-reactivity gate for this component. */
  it('updates when its props change', () => {
    const [value, setValue] = createSignal('and');
    const [options, setOptions] = createSignal(opts('and', 'or'));
    const { getByTestId } = render(() => (
      <ValueSelector
        {...baseProps({
          get value() {
            return value();
          },
          get options() {
            return options();
          },
        })}
      />
    ));
    const select = getByTestId('combinators') as HTMLSelectElement;
    expect(select.value).toBe('and');

    setValue('or');
    flush();
    expect(select.value).toBe('or');

    setOptions(opts('xor'));
    setValue('xor');
    flush();
    expect([...select.options].map(o => o.value)).toEqual(['xor']);
    expect(select.value).toBe('xor');
  });
});
