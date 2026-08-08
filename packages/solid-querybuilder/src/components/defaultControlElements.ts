import type { FullField } from '@react-querybuilder/core';
import { nullComponent } from '../reactive/context.js';
import type { Controls } from '../types/controls.js';
import { ActionElement } from './ActionElement.jsx';
import { Rule } from './Rule.jsx';
import { RuleGroup } from './RuleGroup.jsx';
import { ValueEditor } from './ValueEditor.jsx';
import { ValueSelector } from './ValueSelector.jsx';

/**
 * The default component for every control.
 *
 * Keys with no implementation yet default to `nullComponent`, which renders nothing, so every
 * call site can render unconditionally and no consumer of `Controls` sees an `undefined`
 * component. (`mergeControlElements` substitutes `nullComponent` only for an *explicit* `null`
 * override, so leaving these keys out would leave them `undefined` — which `<Dynamic>` tolerates
 * but `createComponent` does not.) They land at step 5.
 */
export const defaultControlElements: Partial<Controls<FullField, string>> = {
  actionElement: ActionElement,
  addGroupAction: ActionElement,
  addRuleAction: ActionElement,
  cloneGroupAction: ActionElement,
  cloneRuleAction: ActionElement,
  combinatorSelector: ValueSelector,
  fieldSelector: ValueSelector,
  // Step 5:
  inlineCombinator: nullComponent,
  lockGroupAction: ActionElement,
  lockRuleAction: ActionElement,
  // Step 5:
  matchModeEditor: nullComponent,
  muteGroupAction: ActionElement,
  muteRuleAction: ActionElement,
  // Step 5:
  notToggle: nullComponent,
  operatorSelector: ValueSelector,
  removeGroupAction: ActionElement,
  removeRuleAction: ActionElement,
  rule: Rule,
  ruleGroup: RuleGroup,
  // Step 5:
  shiftActions: nullComponent,
  // Step 5:
  undoRedoActions: nullComponent,
  valueEditor: ValueEditor,
  valueSelector: ValueSelector,
  valueSourceSelector: ValueSelector,
} as Partial<Controls<FullField, string>>;
