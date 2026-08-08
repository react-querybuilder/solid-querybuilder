import type { RuleGroupType, RuleGroupTypeIC } from '@react-querybuilder/core';
import { QueryManager } from '@react-querybuilder/core';
import { render } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { QueryBuilderContext } from '../reactive/context.js';
import type { ActionProps } from '../types/props.js';
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

const CustomAction = (props: ActionProps) => (
  <button type="button" data-testid={props.testID} class={props.className}>
    custom
  </button>
);

const FromContext = (props: ActionProps) => (
  <button type="button" data-testid={props.testID}>
    context
  </button>
);

const FromProps = (props: ActionProps) => (
  <button type="button" data-testid={props.testID}>
    props
  </button>
);

const wrapper = (container: Element): Element => container.querySelector('[role="form"]')!;

describe('QueryBuilder', () => {
  it('renders the wrapper element React renders', () => {
    const { container } = render(() => <QueryBuilder fields={fields} defaultQuery={query} />);
    const root = wrapper(container);
    expect(root.tagName).toBe('DIV');
    expect(root).toHaveClass('queryBuilder');
    expect(root).toHaveAttribute('data-dnd', 'disabled');
    expect(root).toHaveAttribute('data-inlinecombinators', 'disabled');
    // The root group is the wrapper's only child.
    expect([...root.children].map(c => c.getAttribute('data-testid'))).toEqual(['rule-group']);
  });

  it('reports inline combinators as enabled for an IC query', () => {
    const ic: RuleGroupTypeIC = { id: 'root', rules: [] };
    const { container } = render(() => <QueryBuilder fields={fields} defaultQuery={ic} />);
    expect(wrapper(container)).toHaveAttribute('data-inlinecombinators', 'enabled');
  });

  it('reports inline combinators as enabled with showCombinatorsBetweenRules', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={query} showCombinatorsBetweenRules />
    ));
    expect(wrapper(container)).toHaveAttribute('data-inlinecombinators', 'enabled');
  });

  it('renders an empty group when neither query nor defaultQuery is given', () => {
    const { container } = render(() => <QueryBuilder fields={fields} />);
    expect(container.querySelector('[data-testid="rule-group"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="rule"]')).toHaveLength(0);
  });

  it('marks the wrapper disabled from the `disabled` prop', () => {
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={query} disabled />
    ));
    expect(wrapper(container)).toHaveClass('queryBuilder-disabled');
  });

  it('applies custom classnames', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={query}
        controlClassnames={{ queryBuilder: 'custom-qb' }}
      />
    ));
    expect(wrapper(container)).toHaveClass('custom-qb');
  });

  it('applies a controlElements replacement', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={query}
        controlElements={{ addRuleAction: CustomAction }}
      />
    ));
    expect(container.querySelector('[data-testid="add-rule"]')!.textContent).toBe('custom');
  });

  it('inherits controlElements from an ancestor context, with props taking precedence', () => {
    const { container } = render(() => (
      <QueryBuilderContext value={{ controlElements: { actionElement: FromContext } }}>
        <QueryBuilder
          fields={fields}
          defaultQuery={query}
          controlElements={{ addRuleAction: FromProps }}
        />
      </QueryBuilderContext>
    ));

    expect(container.querySelector('[data-testid="add-rule"]')!.textContent).toBe('props');
    // `actionElement` is a bulk override for every other action control.
    expect(container.querySelector('[data-testid="remove-rule"]')!.textContent).toBe('context');
  });

  it('renders nothing for a control explicitly set to null', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={query}
        controlElements={{ addGroupAction: null }}
      />
    ));
    expect(container.querySelector('[data-testid="add-group"]')).toBeNull();
  });

  it('applies translations', () => {
    const { container } = render(() => (
      <QueryBuilder
        fields={fields}
        defaultQuery={query}
        translations={{ addRule: { label: 'Add a rule' } }}
      />
    ));
    expect(container.querySelector('[data-testid="add-rule"]')!.textContent).toBe('Add a rule');
  });

  it('is controlled by the query prop', () => {
    const [q, setQ] = createSignal<RuleGroupType>(query);
    const onQueryChange = vi.fn();
    const { container } = render(() => (
      <QueryBuilder fields={fields} query={q()} onQueryChange={onQueryChange} />
    ));
    expect(container.querySelectorAll('[data-testid="rule"]')).toHaveLength(1);

    setQ({ id: 'root', combinator: 'and', rules: [] });
    flush();
    expect(container.querySelectorAll('[data-testid="rule"]')).toHaveLength(0);
  });

  it('subscribes to an externally supplied manager', () => {
    const manager = new QueryManager<RuleGroupType>(query, { fields, history: true });
    const { container } = render(() => <QueryBuilder fields={fields} manager={manager as never} />);
    expect(container.querySelectorAll('[data-testid="rule"]')).toHaveLength(1);

    manager.remove([0]);
    flush();
    expect(container.querySelectorAll('[data-testid="rule"]')).toHaveLength(0);
  });

  /** The props-reactivity gate for this component. */
  it('updates when its configuration props change', () => {
    const [showCloneButtons, setShowCloneButtons] = createSignal(false);
    const { container } = render(() => (
      <QueryBuilder fields={fields} defaultQuery={query} showCloneButtons={showCloneButtons()} />
    ));
    expect(container.querySelector('[data-testid="clone-rule"]')).toBeNull();

    setShowCloneButtons(true);
    flush();
    expect(container.querySelector('[data-testid="clone-rule"]')).toBeTruthy();
  });
});
