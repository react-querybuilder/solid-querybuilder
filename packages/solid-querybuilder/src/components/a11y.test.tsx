/**
 * Accessibility coverage for the rendered tree.
 *
 * The scenario list is the same one the conformance harness uses, so a11y is asserted against
 * exactly the prop combinations DOM parity is asserted against. `scenarios.tsx` and `queries.ts`
 * are self-contained — they carry no dependency on the downloaded fixture files — so this suite
 * runs under the default `bun run test` config in a fresh clone.
 */

import type { RuleGroupType } from '@react-querybuilder/core';
import { TestID } from '@react-querybuilder/core';
import { render, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { queries } from '../../test/conformance/queries.js';
import { fields, scenarios } from '../../test/conformance/scenarios.jsx';
import type { QueryBuilderProps } from '../types/index.js';
import { QueryBuilder } from './QueryBuilder.jsx';

/**
 * WCAG 2.0/2.1 level A and AA. Axe's "best-practice" rules are asserted separately, because the
 * ported DOM knowingly violates one of them — see {@link acceptedBestPracticeViolations}.
 */
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * `label-title-only` fires on every selector and text editor in the tree: React Query Builder
 * labels them with `title` alone, and full DOM parity is a locked decision for this port, so
 * adding `aria-label` here would break the conformance harness. It is a best-practice rule, not
 * a WCAG failure — `title` does produce an accessible name, which is why the `label`/`aria-*`
 * rules at level A pass. Consumers who need a visible label can supply one through
 * `controlElements`.
 *
 * The list is asserted rather than suppressed, so any *other* best-practice regression still
 * fails. It holds for the `multiValue` scenario too: the multiselect and radio-group editors are
 * new to `schemaVersion` 2, and upstream cleared its own axe run only after giving the bound-pair
 * editors a `title`, which this port reproduces.
 */
const acceptedBestPracticeViolations = ['label-title-only'];

/**
 * `vitest-axe`'s `toHaveNoViolations` matcher is not registered in this project's setup file, so
 * assert on the results directly.
 */
const expectNoViolations = async (container: Element): Promise<void> => {
  const wcag = await axe(container, { runOnly: wcagTags });
  expect(wcag.violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);

  const bestPractice = await axe(container, { runOnly: ['best-practice'] });
  expect(bestPractice.violations.map(v => v.id).toSorted()).toEqual(acceptedBestPracticeViolations);
};

/** The scenario props are deliberately loose (see `scenarios.tsx`); widen once, here. */
const renderScenario = (props: Record<string, unknown>): HTMLElement =>
  render(() => <QueryBuilder {...(props as QueryBuilderProps)} />).container as HTMLElement;

describe('accessibility', () => {
  for (const scenario of scenarios) {
    // One query per scenario is enough: the scenarios vary the controls, and the fixture queries
    // vary only the tree shape. `nested` exercises groups, rules, and depth at once.
    const query = (scenario.query ??
      queries[
        scenario.queries?.includes('nested') ? 'nested' : scenario.queries![0]
      ]) as RuleGroupType;

    it(`has no axe violations: ${scenario.name}`, async () => {
      const container = renderScenario({ ...scenario.props, defaultQuery: query });
      // Effects (notably the value-editor reset) run on the next flush; axe must see the settled
      // tree, not the first paint.
      flush();

      await expectNoViolations(container);
    });
  }

  it('has no axe violations with every control and an independent-combinator query', async () => {
    const container = renderScenario({
      fields,
      defaultQuery: queries.icNested,
      showNotToggle: true,
      showCloneButtons: true,
      showLockButtons: true,
      showShiftActions: true,
      showMuteButtons: true,
      showUndoRedo: true,
    });
    flush();

    await expectNoViolations(container);
  });
});

describe('keyboard navigation', () => {
  it('reaches every control in a rule row in document order', async () => {
    const container = renderScenario({
      fields,
      defaultQuery: queries.flat,
      showShiftActions: true,
      showCloneButtons: true,
      showLockButtons: true,
    });
    flush();

    // The second rule, so that neither shift button is disabled and the whole row is tabbable.
    // The first rule's "shift up" is disabled, which tab skips, making the expected order
    // position-dependent.
    const rule = within(container).getAllByTestId(TestID.rule)[1];
    const expected = [
      TestID.shiftActions,
      TestID.shiftActions,
      TestID.fields,
      TestID.operators,
      TestID.valueEditor,
      TestID.cloneRule,
      TestID.lockRule,
      TestID.removeRule,
    ];

    rule.querySelectorAll<HTMLElement>('button, select, input')[0].focus();

    const reached: string[] = [];
    for (let i = 0; i < expected.length; i++) {
      const active = document.activeElement as HTMLElement | null;
      expect(active && rule.contains(active)).toBe(true);
      reached.push(active!.closest('[data-testid]')!.getAttribute('data-testid')!);
      await userEvent.tab();
    }

    expect(reached).toEqual(expected);
    // The next tab leaves the rule entirely.
    expect(rule.contains(document.activeElement)).toBe(false);
  });

  it('activates a button control with the keyboard', async () => {
    const container = renderScenario({ fields, defaultQuery: queries.singleRule });
    const scoped = within(container);

    scoped.getByTestId(TestID.addRule).focus();
    await userEvent.keyboard('{Enter}');
    flush();

    expect(scoped.getAllByTestId(TestID.rule)).toHaveLength(2);

    scoped.getAllByTestId(TestID.removeRule)[1].focus();
    await userEvent.keyboard(' ');
    flush();

    expect(scoped.getAllByTestId(TestID.rule)).toHaveLength(1);
  });

  it('associates the not-toggle label with its checkbox', async () => {
    const container = renderScenario({
      fields,
      defaultQuery: queries.singleRule,
      showNotToggle: true,
    });

    const checkbox = within(container).getByLabelText('Not');
    expect(checkbox).toHaveAttribute('type', 'checkbox');

    checkbox.focus();
    await userEvent.keyboard(' ');
    flush();

    expect(checkbox).toBeChecked();
  });
});
