import type { FullField } from '@react-querybuilder/core';
import type { Controls } from '../types/controls.js';
import { ActionElement } from './ActionElement.jsx';
import { InlineCombinator } from './InlineCombinator.jsx';
import { MatchModeEditor } from './MatchModeEditor.jsx';
import { NotToggle } from './NotToggle.jsx';
import { Rule } from './Rule.jsx';
import { RuleGroup } from './RuleGroup.jsx';
import { ShiftActions } from './ShiftActions.jsx';
import { UndoRedoActions } from './UndoRedoActions.jsx';
import { ValueEditor } from './ValueEditor.jsx';
import { ValueSelector } from './ValueSelector.jsx';

/**
 * The default component for every control. Every key is populated; nothing resolves to
 * `nullComponent` unless a consumer asks for `null` explicitly.
 *
 * ⚠️ **Every entry is a getter, deliberately.** `Rule` → `RuleSubQuery` → this module → `Rule`
 * is a genuine import cycle (a subquery builds its own state, and that state needs the default
 * controls). Reading `Rule` eagerly here throws a temporal-dead-zone `ReferenceError` whenever
 * `Rule.tsx` happens to be the module the cycle is entered through. Deferring every read to
 * first use — which is after every module in the cycle has finished evaluating — is what makes
 * the cycle safe regardless of entry point.
 */
export const defaultControlElements: Partial<Controls<FullField, string>> = {
  get actionElement() {
    return ActionElement;
  },
  get addGroupAction() {
    return ActionElement;
  },
  get addRuleAction() {
    return ActionElement;
  },
  get cloneGroupAction() {
    return ActionElement;
  },
  get cloneRuleAction() {
    return ActionElement;
  },
  get combinatorSelector() {
    return ValueSelector;
  },
  get fieldSelector() {
    return ValueSelector;
  },
  get inlineCombinator() {
    return InlineCombinator;
  },
  get lockGroupAction() {
    return ActionElement;
  },
  get lockRuleAction() {
    return ActionElement;
  },
  get matchModeEditor() {
    return MatchModeEditor;
  },
  get muteGroupAction() {
    return ActionElement;
  },
  get muteRuleAction() {
    return ActionElement;
  },
  get notToggle() {
    return NotToggle;
  },
  get operatorSelector() {
    return ValueSelector;
  },
  get removeGroupAction() {
    return ActionElement;
  },
  get removeRuleAction() {
    return ActionElement;
  },
  get rule() {
    return Rule;
  },
  get ruleGroup() {
    return RuleGroup;
  },
  get shiftActions() {
    return ShiftActions;
  },
  get undoRedoActions() {
    return UndoRedoActions;
  },
  get valueEditor() {
    return ValueEditor;
  },
  get valueSelector() {
    return ValueSelector;
  },
  get valueSourceSelector() {
    return ValueSelector;
  },
} as Partial<Controls<FullField, string>>;
