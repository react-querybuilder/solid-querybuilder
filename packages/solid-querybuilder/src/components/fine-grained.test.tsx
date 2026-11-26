import type { RuleGroupType } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { createMemo, flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import type { ValueEditorProps } from '../types/index.js';
import { QueryBuilder } from './QueryBuilder.jsx';

const GROUPS = 10;
const RULES_PER_GROUP = 20;

const fields = [
  { name: 'f1', label: 'F1' },
  { name: 'f2', label: 'F2' },
];

const largeQuery = (): RuleGroupType => ({
  id: 'root',
  combinator: 'and',
  rules: Array.from({ length: GROUPS }, (_, g) => ({
    id: `g${g}`,
    combinator: 'or',
    rules: Array.from({ length: RULES_PER_GROUP }, (_, r) => ({
      id: `g${g}r${r}`,
      field: r % 2 ? 'f2' : 'f1',
      operator: '=',
      value: `v${g}-${r}`,
    })),
  })),
});

/**
 * A single value edit on a large tree must stay local: no rule remounts, and only the edited
 * rule's value editor recomputes. A regression here (e.g. a per-node context keyed on the whole
 * query) fans out to every rule and is invisible to the DOM-parity suites.
 */
describe('fine-grained updates', () => {
  it(`touches only the edited rule in a ${GROUPS * RULES_PER_GROUP}-rule tree`, () => {
    let mounts = 0;
    const valueReads = new Map<string, number>();

    const CountingEditor = (props: ValueEditorProps) => {
      mounts++;
      const value = createMemo(() => {
        const id = props.rule.id!;
        valueReads.set(id, (valueReads.get(id) ?? 0) + 1);
        return String(props.value ?? '');
      });
      return (
        <input
          data-testid="value-editor"
          data-rule={props.rule.id}
          value={value()}
          onInput={e => props.handleOnChange(e.currentTarget.value)}
        />
      );
    };

    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={largeQuery()}
        controlElements={{ valueEditor: CountingEditor }}
      />
    ));
    flush();

    const editors = () => [...container.querySelectorAll('[data-testid="value-editor"]')];
    const total = GROUPS * RULES_PER_GROUP;
    expect(editors()).toHaveLength(total);
    expect(mounts).toBe(total);

    const nodesBefore = editors();
    const readsBefore = new Map(valueReads);
    const target = container.querySelector<HTMLInputElement>('[data-rule="g4r7"]')!;
    target.value = 'edited';
    target.dispatchEvent(new Event('input', { bubbles: true }));
    flush();

    expect(target.value).toBe('edited');
    expect(mounts).toBe(total);
    expect(editors()).toEqual(nodesBefore);

    const recomputed = [...valueReads].filter(([id, n]) => n !== readsBefore.get(id));
    expect(recomputed.map(([id]) => id)).toEqual(['g4r7']);
  });
});
