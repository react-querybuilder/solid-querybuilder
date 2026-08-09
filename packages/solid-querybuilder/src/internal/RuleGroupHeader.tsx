import { TestID } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { Dynamic } from '@solidjs/web';
import { Show } from 'solid-js';
import type { RuleGroupState } from '../reactive/createRuleGroupState.js';
import type { RuleGroupProps } from '../types/props.js';

/**
 * The contents of a group's header `<div>`.
 *
 * Split out of `RuleGroup` because `RuleSubQuery` renders the same header for a
 * subquery's root group, in the middle of a rule's controls. It takes `{ groupProps, parts }`
 * rather than a flattened props object: the two halves have overlapping member names, and
 * flattening them was a documented source of confusion in the Vue port.
 *
 * There is no `ruleGroupHeaderElements` control element — to customize a group's header,
 * replace the `ruleGroup` component.
 */
export const RuleGroupHeader = (props: {
  groupProps: RuleGroupProps;
  parts: RuleGroupState;
}): JSX.Element => {
  const p = () => props.groupProps;
  const state = () => props.parts;

  const schema = () => p().schema;
  const controls = () => p().schema.controls;
  const translations = () => p().translations;
  const rules = () => state().ruleGroup.rules;

  /** Props every subcomponent receives. A getter object, so a spread stays reactive. */
  const common = {
    get level() {
      return p().path.length;
    },
    get path() {
      return p().path;
    },
    get disabled() {
      return state().disabled;
    },
    get context() {
      return p().context;
    },
    get validation() {
      return state().validationResult;
    },
    get schema() {
      return p().schema;
    },
  };

  const shiftTitles = () =>
    schema().showShiftActions
      ? {
          shiftUp: translations().shiftActionUp?.title,
          shiftDown: translations().shiftActionDown?.title,
        }
      : undefined;
  const shiftLabels = () =>
    schema().showShiftActions
      ? {
          shiftUp: translations().shiftActionUp?.label,
          shiftDown: translations().shiftActionDown?.label,
        }
      : undefined;
  const undoRedoTitles = () =>
    schema().showUndoRedo
      ? { undo: translations().undo?.title, redo: translations().redo?.title }
      : undefined;
  const undoRedoLabels = () =>
    schema().showUndoRedo
      ? { undo: translations().undo?.label, redo: translations().redo?.label }
      : undefined;
  const undoRedoClassNames = () =>
    schema().showUndoRedo
      ? { undo: state().classNames.undoAction, redo: state().classNames.redoAction }
      : undefined;

  return (
    <>
      <Show when={schema().showShiftActions && p().path.length > 0}>
        <Dynamic
          component={controls().shiftActions}
          {...common}
          testID={TestID.shiftActions}
          titles={shiftTitles()}
          labels={shiftLabels()}
          className={state().classNames.shiftActions}
          shiftUp={state().shiftGroupUp}
          shiftDown={state().shiftGroupDown}
          shiftUpDisabled={p().shiftUpDisabled}
          shiftDownDisabled={p().shiftDownDisabled}
          ruleOrGroup={state().ruleGroup}
        />
      </Show>
      <Show when={!schema().showCombinatorsBetweenRules && !schema().independentCombinators}>
        <Dynamic
          component={controls().combinatorSelector}
          {...common}
          testID={TestID.combinators}
          options={schema().combinators}
          value={state().combinator}
          title={translations().combinators?.title}
          className={state().classNames.combinators}
          handleOnChange={state().onCombinatorChange}
          rules={rules()}
          ruleGroup={state().ruleGroup}
        />
      </Show>
      <Show when={schema().showNotToggle}>
        <Dynamic
          component={controls().notToggle}
          {...common}
          testID={TestID.notToggle}
          className={state().classNames.notToggle}
          title={translations().notToggle?.title}
          label={translations().notToggle?.label}
          checked={state().ruleGroup.not}
          handleOnChange={state().onNotToggleChange}
          ruleGroup={state().ruleGroup}
        />
      </Show>
      <Dynamic
        component={controls().addRuleAction}
        {...common}
        testID={TestID.addRule}
        label={translations().addRule?.label}
        title={translations().addRule?.title}
        className={state().classNames.addRule}
        handleOnClick={state().addRule}
        rules={rules()}
        ruleOrGroup={state().ruleGroup}
      />
      <Show when={schema().maxLevels > p().path.length}>
        <Dynamic
          component={controls().addGroupAction}
          {...common}
          testID={TestID.addGroup}
          label={translations().addGroup?.label}
          title={translations().addGroup?.title}
          className={state().classNames.addGroup}
          handleOnClick={state().addGroup}
          rules={rules()}
          ruleOrGroup={state().ruleGroup}
        />
      </Show>
      <Show when={schema().showCloneButtons && p().path.length > 0}>
        <Dynamic
          component={controls().cloneGroupAction}
          {...common}
          testID={TestID.cloneGroup}
          label={translations().cloneRuleGroup?.label}
          title={translations().cloneRuleGroup?.title}
          className={state().classNames.cloneGroup}
          handleOnClick={state().cloneGroup}
          rules={rules()}
          ruleOrGroup={state().ruleGroup}
        />
      </Show>
      <Show when={schema().showLockButtons}>
        <Dynamic
          component={controls().lockGroupAction}
          {...common}
          testID={TestID.lockGroup}
          label={translations().lockGroup?.label}
          title={translations().lockGroup?.title}
          className={state().classNames.lockGroup}
          handleOnClick={state().toggleLockGroup}
          rules={rules()}
          disabledTranslation={p().parentDisabled ? undefined : translations().lockGroupDisabled}
          ruleOrGroup={state().ruleGroup}
        />
      </Show>
      <Show when={schema().showMuteButtons}>
        <Dynamic
          component={controls().muteGroupAction}
          {...common}
          testID={TestID.muteGroup}
          label={
            state().ruleGroup.muted
              ? translations().unmuteGroup?.label
              : translations().muteGroup?.label
          }
          title={
            state().ruleGroup.muted
              ? translations().unmuteGroup?.title
              : translations().muteGroup?.title
          }
          className={state().classNames.muteGroup}
          handleOnClick={state().toggleMuteGroup}
          rules={rules()}
          ruleOrGroup={state().ruleGroup}
        />
      </Show>
      <Show when={schema().showUndoRedo && p().path.length === 0}>
        <Dynamic
          component={controls().undoRedoActions}
          {...common}
          testID={TestID.undoRedoActions}
          titles={undoRedoTitles()}
          labels={undoRedoLabels()}
          className={state().classNames.undoRedoActions}
          classNames={undoRedoClassNames()}
          ruleOrGroup={state().ruleGroup}
        />
      </Show>
      <Show when={p().path.length > 0}>
        <Dynamic
          component={controls().removeGroupAction}
          {...common}
          testID={TestID.removeGroup}
          label={translations().removeGroup?.label}
          title={translations().removeGroup?.title}
          className={state().classNames.removeGroup}
          handleOnClick={state().removeGroup}
          rules={rules()}
          ruleOrGroup={state().ruleGroup}
        />
      </Show>
    </>
  );
};
