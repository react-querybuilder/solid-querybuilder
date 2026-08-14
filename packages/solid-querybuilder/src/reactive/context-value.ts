import type { FullField, FullOperator, GetOptionIdentifierType } from '@react-querybuilder/core';
import type { Accessor } from 'solid-js';
import type { QueryBuilderContextProps } from '../types/props.js';
import type { MergedQueryBuilderConfig } from './context.js';

/**
 * Builds the value handed to `<QueryBuilderContext value={…}>` — the merged config, projected back
 * into the context's own shape so nested builders inherit it.
 *
 * A getter object, not a memo returning a fresh object: a Solid context value is read once by
 * descendants, so every field must be a getter or consumers freeze on the first value.
 */
export const createContextValue = <F extends FullField, O extends FullOperator>(
  config: Accessor<MergedQueryBuilderConfig<F, GetOptionIdentifierType<O>>>
): QueryBuilderContextProps<F, GetOptionIdentifierType<O>> => ({
  get controlElements() {
    return config().controls;
  },
  get controlClassnames() {
    return config().classNames;
  },
  get translations() {
    return config().translations;
  },
  get debugMode() {
    return config().debugMode;
  },
  get enableMountQueryChange() {
    return config().enableMountQueryChange;
  },
  get showCombinatorsBetweenRules() {
    return config().showCombinatorsBetweenRules;
  },
  get showNotToggle() {
    return config().showNotToggle;
  },
  get showShiftActions() {
    return config().showShiftActions;
  },
  get showUndoRedo() {
    return config().showUndoRedo;
  },
  get showCloneButtons() {
    return config().showCloneButtons;
  },
  get showLockButtons() {
    return config().showLockButtons;
  },
  get showMuteButtons() {
    return config().showMuteButtons;
  },
  get resetOnFieldChange() {
    return config().resetOnFieldChange;
  },
  get resetOnOperatorChange() {
    return config().resetOnOperatorChange;
  },
  get autoSelectField() {
    return config().autoSelectField;
  },
  get autoSelectOperator() {
    return config().autoSelectOperator;
  },
  get autoSelectValue() {
    return config().autoSelectValue;
  },
  get addRuleToNewGroups() {
    return config().addRuleToNewGroups;
  },
  get listsAsArrays() {
    return config().listsAsArrays;
  },
  get suppressStandardClassnames() {
    return config().suppressStandardClassnames;
  },
});
