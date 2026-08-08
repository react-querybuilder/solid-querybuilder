import type { FullField } from '@react-querybuilder/core';
import { defaultControlClassnames } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { ValueEditorProps } from '../types/props.js';
import { ValueEditor } from './ValueEditor.jsx';
import { ValueSelector } from './ValueSelector.jsx';

const values = [
  { name: 's1', value: 's1', label: 'S1' },
  { name: 's2', value: 's2', label: 'S2' },
];

/** The subset of `Schema` a value editor reads. */
const schema = {
  classNames: defaultControlClassnames,
  suppressStandardClassnames: false,
  controls: { valueSelector: ValueSelector },
} as never;

const CustomSelector = (props: { testID?: string }) => (
  <div data-testid={props.testID}>custom selector</div>
);

const baseProps = (overrides: Partial<ValueEditorProps> = {}): ValueEditorProps =>
  ({
    testID: 'value-editor',
    className: 'rule-value',
    title: 'Value',
    path: [0],
    level: 1,
    field: 'f1',
    fieldData: { name: 'f1', value: 'f1', label: 'F1' } as FullField,
    operator: '=',
    value: 'v1',
    valueSource: 'value',
    handleOnChange: () => {},
    schema,
    ...overrides,
  }) as ValueEditorProps;

describe('ValueEditor', () => {
  it('renders a text input by default', () => {
    const { getByTestId } = render(() => <ValueEditor {...baseProps()} />);
    const input = getByTestId('value-editor') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('text');
    expect(input.value).toBe('v1');
    expect(input).toHaveClass('rule-value');
    expect(input).toHaveAttribute('title', 'Value');
  });

  it('renders nothing for a unary operator', () => {
    const { container } = render(() => <ValueEditor {...baseProps({ operator: 'null' })} />);
    expect(container.querySelector('[data-testid="value-editor"]')).toBeNull();
  });

  it('reports typed input, parsing numbers when asked', () => {
    const handleOnChange = vi.fn();
    const { getByTestId } = render(() => (
      <ValueEditor
        {...baseProps({ inputType: 'number', parseNumbers: true, value: 1, handleOnChange })}
      />
    ));
    const input = getByTestId('value-editor') as HTMLInputElement;
    expect(input.type).toBe('number');
    input.value = '42';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(handleOnChange).toHaveBeenCalledWith(42);
  });

  it('renders a textarea', () => {
    const { getByTestId } = render(() => <ValueEditor {...baseProps({ type: 'textarea' })} />);
    const el = getByTestId('value-editor') as HTMLTextAreaElement;
    expect(el.tagName).toBe('TEXTAREA');
    const handle = vi.fn();
    const { getByTestId: get2 } = render(() => (
      <ValueEditor {...baseProps({ type: 'textarea', handleOnChange: handle })} />
    ));
    const el2 = get2('value-editor') as HTMLTextAreaElement;
    el2.value = 'typed';
    el2.dispatchEvent(new Event('input', { bubbles: true }));
    expect(handle).toHaveBeenCalledWith('typed');
  });

  it('renders a checkbox for `checkbox` and `switch`', () => {
    const handleOnChange = vi.fn();
    for (const type of ['checkbox', 'switch'] as const) {
      const { getByTestId, unmount } = render(() => (
        <ValueEditor {...baseProps({ type, value: true, handleOnChange })} />
      ));
      const input = getByTestId('value-editor') as HTMLInputElement;
      expect(input.type).toBe('checkbox');
      expect(input.checked).toBe(true);
      input.click();
      expect(handleOnChange).toHaveBeenLastCalledWith(false);
      unmount();
    }
  });

  it('renders a radio group with unique ids per option', () => {
    const handleOnChange = vi.fn();
    const { getByTestId } = render(() => (
      <ValueEditor {...baseProps({ type: 'radio', values, value: 's1', handleOnChange })} />
    ));
    const span = getByTestId('value-editor');
    expect(span.tagName).toBe('SPAN');
    const inputs = [...span.querySelectorAll('input')];
    expect(inputs.map(i => i.value)).toEqual(['s1', 's2']);
    expect(inputs[0].checked).toBe(true);
    expect(new Set(inputs.map(i => i.id)).size).toBe(2);
    for (const [i, label] of [...span.querySelectorAll('label')].entries()) {
      expect(label.getAttribute('for')).toBe(inputs[i].id);
    }
    inputs[1].click();
    expect(handleOnChange).toHaveBeenCalledWith('s2');
  });

  it('renders a single selector for `select` and a multiselect for `multiselect`', () => {
    const { getByTestId, unmount } = render(() => (
      <ValueEditor {...baseProps({ type: 'select', values, value: 's2' })} />
    ));
    const select = getByTestId('value-editor') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.multiple).toBe(false);
    expect(select.value).toBe('s2');
    unmount();

    const { getByTestId: get2 } = render(() => (
      <ValueEditor
        {...baseProps({ type: 'multiselect', values, value: ['s1', 's2'], listsAsArrays: true })}
      />
    ));
    const multi = get2('value-editor') as HTMLSelectElement;
    expect(multi.multiple).toBe(true);
    expect([...multi.selectedOptions].map(o => o.value)).toEqual(['s1', 's2']);
  });

  it('renders a bound pair of text inputs for `between`, with the title on all three', () => {
    const handleOnChange = vi.fn();
    const { getByTestId } = render(() => (
      <ValueEditor
        {...baseProps({
          operator: 'between',
          value: 'a,b',
          separator: <span class="custom-separator">and</span>,
          handleOnChange,
        })}
      />
    ));
    const span = getByTestId('value-editor');
    expect(span.tagName).toBe('SPAN');
    expect(span).toHaveAttribute('title', 'Value');

    // Order: first editor, separator, second editor.
    expect([...span.children].map(c => c.tagName.toLowerCase())).toEqual([
      'input',
      'span',
      'input',
    ]);
    expect(span.querySelector('.custom-separator')?.textContent).toBe('and');

    const inputs = [...span.querySelectorAll('input')];
    expect(inputs.map(i => i.value)).toEqual(['a', 'b']);
    for (const input of inputs) {
      expect(input).toHaveAttribute('title', 'Value');
      expect(input).toHaveClass('rule-value-list-item');
    }

    inputs[1].value = 'z';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    expect(handleOnChange).toHaveBeenCalledWith('a,z');
  });

  it('renders a bound pair of selectors for `between` on a select field', () => {
    const handleOnChange = vi.fn();
    const { getByTestId } = render(() => (
      <ValueEditor
        {...baseProps({
          type: 'select',
          operator: 'between',
          values,
          value: 's1,s2',
          handleOnChange,
        })}
      />
    ));
    const span = getByTestId('value-editor');
    const selects = [...span.querySelectorAll('select')];
    expect(selects).toHaveLength(2);
    expect(selects.map(s => s.value)).toEqual(['s1', 's2']);
    // React destructures `testID` out before its rest-spread, so the paired editors carry none.
    for (const select of selects) {
      expect(select).not.toHaveAttribute('data-testid');
    }

    selects[0].value = 's2';
    selects[0].dispatchEvent(new Event('change', { bubbles: true }));
    expect(handleOnChange).toHaveBeenCalledWith('s2,s2');
  });

  it('falls back to the first option for a missing bound-pair value', () => {
    const { getByTestId } = render(() => (
      <ValueEditor
        {...baseProps({ type: 'select', operator: 'between', values, value: undefined })}
      />
    ));
    const selects = [...getByTestId('value-editor').querySelectorAll('select')];
    expect(selects.map(s => s.value)).toEqual(['s1', 's1']);
  });

  it('renders a bigint editor keyed off the uncoerced input type', () => {
    const handleOnChange = vi.fn();
    const { getByTestId } = render(() => (
      <ValueEditor
        {...baseProps({ inputType: 'bigint', value: 10n, parseNumbers: true, handleOnChange })}
      />
    ));
    const input = getByTestId('value-editor') as HTMLInputElement;
    expect(input.value).toBe('10');
    input.value = '11';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(handleOnChange).toHaveBeenCalledWith(11n);
  });

  it('uses the placeholder from the field data', () => {
    const { getByTestId } = render(() => (
      <ValueEditor
        {...baseProps({ fieldData: { name: 'f1', value: 'f1', label: 'F1', placeholder: 'p' } })}
      />
    ));
    expect(getByTestId('value-editor')).toHaveAttribute('placeholder', 'p');
  });

  it('accepts a replacement selector component', () => {
    const { getByTestId } = render(() => (
      <ValueEditor
        {...baseProps({ type: 'select', values, selectorComponent: CustomSelector as never })}
      />
    ));
    expect(getByTestId('value-editor').textContent).toBe('custom selector');
  });

  /** The props-reactivity gate for this component. */
  it('updates when its props change', () => {
    const [value, setValue] = createSignal('v1');
    const [type, setType] = createSignal<'text' | 'textarea'>('text');
    const { getByTestId } = render(() => (
      <ValueEditor
        {...baseProps({
          skipHook: true,
          get value() {
            return value();
          },
          get type() {
            return type();
          },
        })}
      />
    ));
    expect((getByTestId('value-editor') as HTMLInputElement).value).toBe('v1');

    setValue('v2');
    flush();
    expect((getByTestId('value-editor') as HTMLInputElement).value).toBe('v2');

    setType('textarea');
    flush();
    expect(getByTestId('value-editor').tagName).toBe('TEXTAREA');
  });

  it('collapses a list value when the operator stops being a list operator', () => {
    // The reset effect, wired here rather than unit-tested again: `createValueEditorReset` has
    // its own suite. This asserts the wiring, which is what a no-op'd effect would break.
    const handleOnChange = vi.fn();
    const [operator, setOperator] = createSignal('in');
    render(() => (
      <ValueEditor
        {...baseProps({
          value: ['a', 'b'],
          handleOnChange,
          get operator() {
            return operator();
          },
        })}
      />
    ));
    expect(handleOnChange).not.toHaveBeenCalled();

    setOperator('=');
    flush();
    expect(handleOnChange).toHaveBeenCalledWith('a');
  });
});
