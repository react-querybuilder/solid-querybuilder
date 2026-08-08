import { render } from '@solidjs/testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { MatchModeEditorProps } from '../types/props.js';
import { MatchModeEditor } from './MatchModeEditor.jsx';
import { ValueEditor } from './ValueEditor.jsx';
import { ValueSelector } from './ValueSelector.jsx';

const options = [
  { name: 'all', value: 'all', label: 'all' },
  { name: 'atLeast', value: 'atLeast', label: 'at least' },
];

const schema = {
  controls: { valueSelector: ValueSelector, valueEditor: ValueEditor },
  classNames: {},
  suppressStandardClassnames: false,
};

const baseProps = (overrides: Partial<MatchModeEditorProps> = {}): MatchModeEditorProps =>
  ({
    testID: 'match-mode-editor',
    className: 'rule-matchMode',
    title: 'Match mode',
    match: { mode: 'all' },
    options,
    field: 'sub',
    fieldData: { name: 'sub', value: 'sub', label: 'Sub' },
    classNames: { matchMode: 'rule-matchMode', matchThreshold: 'rule-matchThreshold' },
    handleOnChange: () => {},
    path: [0],
    level: 1,
    schema,
    ...overrides,
  }) as unknown as MatchModeEditorProps;

/** Both controls share one `testID`, as upstream does. */
const controls = (getAllByTestId: (id: string) => HTMLElement[]): HTMLElement[] =>
  getAllByTestId('match-mode-editor');

describe('MatchModeEditor', () => {
  it('renders only the mode selector for a mode with no threshold', () => {
    const { getAllByTestId } = render(() => <MatchModeEditor {...baseProps()} />);
    const rendered = controls(getAllByTestId);
    expect(rendered).toHaveLength(1);
    expect(rendered[0].tagName).toBe('SELECT');
    expect((rendered[0] as HTMLSelectElement).value).toBe('all');
    expect(rendered[0]).toHaveClass('rule-matchMode');
    expect(rendered[0]).toHaveAttribute('title', 'Match mode');
  });

  it('adds a numeric threshold editor for a mode that takes one', () => {
    const { getAllByTestId } = render(() => (
      <MatchModeEditor {...baseProps({ match: { mode: 'atLeast', threshold: 3 } })} />
    ));
    const rendered = controls(getAllByTestId);
    expect(rendered).toHaveLength(2);
    expect(rendered[1].tagName).toBe('INPUT');
    expect(rendered[1]).toHaveAttribute('type', 'number');
    expect((rendered[1] as HTMLInputElement).value).toBe('3');
  });

  it('defaults the threshold to 1 when switching to a mode that requires one', () => {
    const handleOnChange = vi.fn();
    const { getAllByTestId } = render(() => <MatchModeEditor {...baseProps({ handleOnChange })} />);
    const select = controls(getAllByTestId)[0] as HTMLSelectElement;
    select.value = 'atLeast';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handleOnChange).toHaveBeenCalledWith({ mode: 'atLeast', threshold: 1 });
  });

  it('keeps an existing threshold when switching modes', () => {
    const handleOnChange = vi.fn();
    const { getAllByTestId } = render(() => (
      <MatchModeEditor
        {...baseProps({ match: { mode: 'atLeast', threshold: 4 }, handleOnChange })}
      />
    ));
    const select = controls(getAllByTestId)[0] as HTMLSelectElement;
    select.value = 'all';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handleOnChange).toHaveBeenCalledWith({ mode: 'all', threshold: 4 });
  });

  it('reports a parsed number when the threshold changes', () => {
    const handleOnChange = vi.fn();
    const { getAllByTestId } = render(() => (
      <MatchModeEditor
        {...baseProps({ match: { mode: 'exactly', threshold: 2 }, handleOnChange })}
      />
    ));
    const input = controls(getAllByTestId)[1] as HTMLInputElement;
    input.value = '7';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(handleOnChange).toHaveBeenCalledWith({ mode: 'exactly', threshold: 7 });
  });

  it('clamps a negative threshold and defaults a missing one', () => {
    const { getAllByTestId, unmount } = render(() => (
      <MatchModeEditor {...baseProps({ match: { mode: 'atMost', threshold: -5 } })} />
    ));
    expect((controls(getAllByTestId)[1] as HTMLInputElement).value).toBe('0');
    unmount();

    const second = render(() => <MatchModeEditor {...baseProps({ match: { mode: 'atMost' } })} />);
    expect((second.getAllByTestId('match-mode-editor')[1] as HTMLInputElement).value).toBe('1');
  });

  it('passes the threshold placeholder through as field data', () => {
    const { getAllByTestId } = render(() => (
      <MatchModeEditor
        {...baseProps({
          match: { mode: 'atLeast', threshold: 1 },
          thresholdPlaceholder: 'How many',
        })}
      />
    ));
    expect(controls(getAllByTestId)[1]).toHaveAttribute('placeholder', 'How many');
  });

  it('accepts replacement selector and editor components', () => {
    const { getByTestId } = render(() => (
      <MatchModeEditor
        {...baseProps({
          match: { mode: 'atLeast', threshold: 1 },
          selectorComponent: (() => <span data-testid="custom-selector" />) as never,
          numericEditorComponent: (() => <span data-testid="custom-editor" />) as never,
        })}
      />
    ));
    expect(getByTestId('custom-selector')).toBeInTheDocument();
    expect(getByTestId('custom-editor')).toBeInTheDocument();
  });
});
