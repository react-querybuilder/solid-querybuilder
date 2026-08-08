import type { ActionProps, Field, RuleGroupTypeIC } from 'solid-querybuilder';
import { QueryBuilder } from 'solid-querybuilder';

export const fields: Field[] = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
  { name: 'age', label: 'Age', inputType: 'number' },
];

/**
 * A nested independent-combinators query: the shape most likely to expose an SSR-only failure,
 * because it exercises `InlineCombinator` and a recursive `RuleGroup` in one tree.
 *
 * Indices are load-bearing — the smoke test asserts `data-path` for `[]`, `[0]`, `[2]`, `[4]` and
 * `[4,0]`, which requires exactly rule / combinator / rule / combinator / group at the top level.
 *
 * Explicit `id`s throughout: without them the manager re-prepares the query and generates fresh
 * random ids, which would differ between the server render and the client hydration and produce a
 * mismatch that has nothing to do with the code under test.
 */
export const query: RuleGroupTypeIC = {
  id: 'g-root',
  rules: [
    { id: 'r-0', field: 'firstName', operator: 'beginsWith', value: "Stev'e" },
    'and',
    { id: 'r-1', field: 'age', operator: '>', value: 28 },
    'or',
    {
      id: 'g-1',
      rules: [
        { id: 'r-2', field: 'lastName', operator: '=', value: 'Vai' },
        'and',
        { id: 'r-3', field: 'age', operator: '<', value: 90 },
      ],
    },
  ],
};

/** The one control passed through `controlElements`; its label is asserted in the markup. */
const CustomRemoveRule = (props: ActionProps) => (
  <button
    type="button"
    data-testid={props.testID}
    class={props.className}
    onClick={e => props.handleOnClick(e)}>
    custom-remove-rule
  </button>
);

/**
 * The query is a prop rather than a module constant so the server and the client entry can be
 * made to disagree deliberately — that is the failure the hydration assertion exists to catch, and
 * a shared constant would make it unprovable.
 *
 * Never destructure `props`.
 */
export const App = (props: { query: RuleGroupTypeIC }) => (
  <QueryBuilder
    fields={fields}
    defaultQuery={props.query}
    controlElements={{ removeRuleAction: CustomRemoveRule }}
  />
);
