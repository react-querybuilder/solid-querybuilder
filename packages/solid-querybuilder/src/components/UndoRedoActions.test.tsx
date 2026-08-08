import type { RuleGroupType } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { QueryBuilder } from './QueryBuilder.jsx';

const fields = [
  { name: 'f1', label: 'F1' },
  { name: 'f2', label: 'F2' },
];

const query: RuleGroupType = {
  id: 'root',
  combinator: 'and',
  rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'v1' }],
};

const ruleCount = (container: Element): number =>
  container.querySelectorAll('[data-testid="rule"]').length;

/**
 * Exercised through `QueryBuilder` rather than in isolation: the component's whole job is to
 * drive the `QueryManager`'s history, so a fake schema would test nothing.
 */
describe('UndoRedoActions', () => {
  it('renders undo/redo buttons through the actionElement control', () => {
    const { getByTestId } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={query} showUndoRedo />
    ));
    const container = getByTestId('undo-redo-actions');
    expect(container.tagName).toBe('DIV');
    expect(container).toHaveClass('undoRedoActions');
    const undo = getByTestId('undo-action');
    const redo = getByTestId('redo-action');
    expect(undo.tagName).toBe('BUTTON');
    expect(undo).toHaveClass('undoRedoActions-undo');
    expect(redo).toHaveClass('undoRedoActions-redo');
  });

  it('starts with both buttons disabled: seeding the query is not undoable', () => {
    const { getByTestId } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={query} showUndoRedo />
    ));
    expect(getByTestId('undo-action')).toBeDisabled();
    expect(getByTestId('redo-action')).toBeDisabled();
  });

  it('undoes and redoes a change', () => {
    const { container, getByTestId, getAllByTestId } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={query} showUndoRedo />
    ));
    expect(ruleCount(container)).toBe(1);

    getAllByTestId('add-rule')[0].click();
    // Solid 2 batches automatically: the button's enabled state settles on the flush, not
    // synchronously with the click.
    flush();
    expect(ruleCount(container)).toBe(2);
    expect(getByTestId('undo-action')).not.toBeDisabled();
    expect(getByTestId('redo-action')).toBeDisabled();

    getByTestId('undo-action').click();
    flush();
    expect(ruleCount(container)).toBe(1);
    expect(getByTestId('redo-action')).not.toBeDisabled();

    getByTestId('redo-action').click();
    flush();
    expect(ruleCount(container)).toBe(2);
    expect(getByTestId('redo-action')).toBeDisabled();
  });

  it('renders only in the outermost group', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={{
          id: 'root',
          combinator: 'and',
          rules: [{ id: 'g1', combinator: 'or', rules: [] }],
        }}
        showUndoRedo
      />
    ));
    expect(container.querySelectorAll('[data-testid="undo-redo-actions"]')).toHaveLength(1);
  });

  it('is absent unless showUndoRedo is set', () => {
    const { container } = render(() => <QueryBuilder fields={fields} defaultQuery={query} />);
    expect(container.querySelector('[data-testid="undo-redo-actions"]')).toBeNull();
  });

  it('honors the disabled prop', () => {
    const { getByTestId } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={query} showUndoRedo disabled />
    ));
    expect(getByTestId('undo-action')).toBeDisabled();
    expect(getByTestId('redo-action')).toBeDisabled();
  });
});
