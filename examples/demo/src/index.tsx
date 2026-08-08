import type { Field, RuleGroupType, RuleGroupTypeIC } from 'solid-querybuilder';
import { formatQuery, QueryBuilder } from 'solid-querybuilder';
import 'solid-querybuilder/dist/query-builder.css';
import { createSignal, For, Show } from 'solid-js';
import { render } from '@solidjs/web';
import './styles.css';

// Eight fields, covering all seven value editor types.
const fields: Field[] = [
  { name: 'firstName', label: 'First Name', placeholder: 'Enter first name' },
  { name: 'age', label: 'Age', inputType: 'number', defaultValue: 21 },
  {
    name: 'state',
    label: 'State',
    valueEditorType: 'select',
    values: [
      { name: 'CA', label: 'California' },
      { name: 'NY', label: 'New York' },
      { name: 'TX', label: 'Texas' },
    ],
    defaultValue: 'CA',
  },
  {
    name: 'hobbies',
    label: 'Hobbies',
    valueEditorType: 'multiselect',
    values: [
      { name: 'chess', label: 'Chess' },
      { name: 'cycling', label: 'Cycling' },
      { name: 'gardening', label: 'Gardening' },
    ],
    defaultValue: 'chess',
  },
  { name: 'isDev', label: 'Is a Developer?', valueEditorType: 'checkbox', defaultValue: false },
  { name: 'isMuted', label: 'Muted?', valueEditorType: 'switch', defaultValue: false },
  {
    name: 'gender',
    label: 'Gender',
    valueEditorType: 'radio',
    values: [
      { name: 'M', label: 'Male' },
      { name: 'F', label: 'Female' },
      { name: 'O', label: 'Other' },
    ],
    defaultValue: 'M',
  },
  { name: 'bio', label: 'Bio', valueEditorType: 'textarea', defaultValue: '' },
];

const initialQuery: RuleGroupType = {
  combinator: 'and',
  rules: [
    { field: 'firstName', operator: 'beginsWith', value: 'Stev' },
    { field: 'age', operator: '>', value: 28 },
    {
      combinator: 'or',
      rules: [
        { field: 'state', operator: '=', value: 'CA' },
        { field: 'isDev', operator: '=', value: true },
      ],
    },
  ],
};

// The IC toggle swaps query *shapes*, not just a flag: `RuleGroupTypeIC` has no `combinator` on
// the group and interleaves combinator strings into `rules`. Two separately bound signals, so
// switching back and forth does not lose either query's edits.
const initialQueryIC: RuleGroupTypeIC = {
  rules: [
    { field: 'firstName', operator: 'beginsWith', value: 'Stev' },
    'and',
    { field: 'age', operator: '>', value: 28 },
    'or',
    { field: 'state', operator: '=', value: 'CA' },
  ],
};

// `mongodb`, NOT `mongodb_query` — the latter emits a query object with `$expr`-shaped output that
// does not round-trip through `JSON.stringify` the way this panel assumes. [Vue hindsight]
const formats = ['sql', 'json', 'mongodb', 'cel'] as const;

type Flag =
  | 'showCombinatorsBetweenRules'
  | 'showNotToggle'
  | 'showShiftActions'
  | 'showCloneButtons'
  | 'showLockButtons'
  | 'showMuteButtons'
  | 'showUndoRedo'
  | 'resetOnFieldChange'
  | 'resetOnOperatorChange'
  | 'autoSelectField'
  | 'autoSelectOperator'
  | 'autoSelectValue'
  | 'addRuleToNewGroups'
  | 'listsAsArrays'
  | 'disabled'
  | 'debugMode';

const flagList: Flag[] = [
  'showCombinatorsBetweenRules',
  'showNotToggle',
  'showShiftActions',
  'showCloneButtons',
  'showLockButtons',
  'showMuteButtons',
  'showUndoRedo',
  'resetOnFieldChange',
  'resetOnOperatorChange',
  'autoSelectField',
  'autoSelectOperator',
  'autoSelectValue',
  'addRuleToNewGroups',
  'listsAsArrays',
  'disabled',
  'debugMode',
];

const App = () => {
  const [query, setQuery] = createSignal(initialQuery);
  const [queryIC, setQueryIC] = createSignal(initialQueryIC);
  const [ic, setIC] = createSignal(false);
  const [flags, setFlags] = createSignal<Partial<Record<Flag, boolean>>>({
    showCombinatorsBetweenRules: false,
    showNotToggle: true,
    showShiftActions: true,
    showCloneButtons: true,
    showLockButtons: true,
    showUndoRedo: true,
    autoSelectField: true,
    autoSelectOperator: true,
  });

  const toggle = (flag: Flag) => {
    setFlags(f => ({ ...f, [flag]: !f[flag] }));
  };

  // Read whichever query is live. `formatQuery` accepts both shapes.
  const activeQuery = () => (ic() ? queryIC() : query());

  return (
    <div class="demo">
      <h1>solid-querybuilder demo</h1>

      <section class="demo-options">
        <label>
          <input type="checkbox" checked={ic()} onChange={() => setIC(v => !v)} />
          independent combinators
        </label>
        <For each={flagList}>
          {flag => (
            <label>
              <input type="checkbox" checked={!!flags()[flag]} onChange={() => toggle(flag)} />
              {flag}
            </label>
          )}
        </For>
      </section>

      {/* Two `QueryBuilder`s rather than one with a union-typed query: the generic parameter is
          inferred from the query prop, and a union would erase it. */}
      <Show
        when={ic()}
        fallback={
          <QueryBuilder
            fields={fields}
            query={query()}
            onQueryChange={setQuery}
            {...flags()}
          />
        }>
        <QueryBuilder
          fields={fields}
          query={queryIC()}
          onQueryChange={setQueryIC}
          {...flags()}
        />
      </Show>

      <section class="demo-output">
        <For each={formats}>
          {format => (
            <div>
              <h2>{format}</h2>
              <pre>{formatQuery(activeQuery(), format)}</pre>
            </div>
          )}
        </For>
      </section>
    </div>
  );
};

render(() => <App />, document.querySelector('#root')!);
