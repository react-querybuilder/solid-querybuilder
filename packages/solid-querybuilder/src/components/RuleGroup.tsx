import type { FullOption, Path, RuleGroupTypeAny, RuleType } from '@react-querybuilder/core';
import { TestID, isRuleGroup } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { Dynamic } from '@solidjs/web';
import { For, Show, createComponent, createMemo } from 'solid-js';
import { createRuleGroupState } from '../reactive/createRuleGroupState.js';
import type { RuleGroupProps } from '../types/props.js';

/**
 * Default component for `RuleGroupType` and `RuleGroupTypeIC` objects.
 *
 * Port of React Query Builder's `RuleGroup`/`RuleGroupHeaderComponents`/
 * `RuleGroupBodyComponents`. The header and body stay inlined here at this milestone; step 5
 * splits them out when `Rule`'s subquery needs to reuse them. Element order and conditional
 * rendering are identical either way — read React's `RuleGroup.tsx` as the spec.
 *
 * Nested groups and rules render through `schema.controls`, never a self-import, which is what
 * makes a replacement `ruleGroup` component apply at every level.
 */
export const RuleGroup = <F extends FullOption = FullOption, O extends string = string>(
  props: RuleGroupProps<F, O>
): JSX.Element => {
  // Widened once, here; see `Rule.tsx`.
  const p = props as unknown as RuleGroupProps;
  const state = createRuleGroupState(p);

  const schema = () => p.schema;
  const controls = () => p.schema.controls;
  const translations = () => p.translations;
  const rules = () => state.ruleGroup.rules;

  /**
   * One entry per child, carrying everything the row needs that is derived from its position:
   * its `<For>` key, its path, and whether it is disabled. Precomputed because Solid 2's
   * `keyed` callback receives the item only — see the comment at the `<For>` below.
   */
  const keyedRules = createMemo(() =>
    rules().map((r, index) => {
      const info = state.pathsMemo[index];
      return {
        key: typeof r === 'string' ? [...info.path, r].join('-') : r.id!,
        item: r as RuleType | RuleGroupTypeAny | string,
        index,
        path: info.path as Path,
        disabled: info.disabled || (typeof r !== 'string' && !!r.disabled),
      };
    })
  );

  /** Props every subcomponent receives. A getter object, so a spread stays reactive. */
  const common = {
    get level() {
      return p.path.length;
    },
    get path() {
      return p.path;
    },
    get disabled() {
      return state.disabled;
    },
    get context() {
      return p.context;
    },
    get validation() {
      return state.validationResult;
    },
    get schema() {
      return p.schema;
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
      ? { undo: state.classNames.undoAction, redo: state.classNames.redoAction }
      : undefined;

  return (
    <div
      title={state.accessibleDescription}
      class={state.outerClassName}
      data-testid={TestID.ruleGroup}
      data-not={state.ruleGroup.not ? 'true' : undefined}
      data-rule-group-id={p.id}
      data-level={p.path.length}
      data-path={JSON.stringify(p.path)}>
      <div class={state.classNames.header}>
        <Show when={schema().showShiftActions && p.path.length > 0}>
          <Dynamic
            component={controls().shiftActions}
            {...common}
            testID={TestID.shiftActions}
            titles={shiftTitles()}
            labels={shiftLabels()}
            className={state.classNames.shiftActions}
            shiftUp={state.shiftGroupUp}
            shiftDown={state.shiftGroupDown}
            shiftUpDisabled={p.shiftUpDisabled}
            shiftDownDisabled={p.shiftDownDisabled}
            ruleOrGroup={state.ruleGroup}
          />
        </Show>
        <Show when={!schema().showCombinatorsBetweenRules && !schema().independentCombinators}>
          <Dynamic
            component={controls().combinatorSelector}
            {...common}
            testID={TestID.combinators}
            options={schema().combinators}
            value={state.combinator}
            title={translations().combinators?.title}
            className={state.classNames.combinators}
            handleOnChange={state.onCombinatorChange}
            rules={rules()}
            ruleGroup={state.ruleGroup}
          />
        </Show>
        <Show when={schema().showNotToggle}>
          <Dynamic
            component={controls().notToggle}
            {...common}
            testID={TestID.notToggle}
            className={state.classNames.notToggle}
            title={translations().notToggle?.title}
            label={translations().notToggle?.label}
            checked={state.ruleGroup.not}
            handleOnChange={state.onNotToggleChange}
            ruleGroup={state.ruleGroup}
          />
        </Show>
        <Dynamic
          component={controls().addRuleAction}
          {...common}
          testID={TestID.addRule}
          label={translations().addRule?.label}
          title={translations().addRule?.title}
          className={state.classNames.addRule}
          handleOnClick={state.addRule}
          rules={rules()}
          ruleOrGroup={state.ruleGroup}
        />
        <Show when={schema().maxLevels > p.path.length}>
          <Dynamic
            component={controls().addGroupAction}
            {...common}
            testID={TestID.addGroup}
            label={translations().addGroup?.label}
            title={translations().addGroup?.title}
            className={state.classNames.addGroup}
            handleOnClick={state.addGroup}
            rules={rules()}
            ruleOrGroup={state.ruleGroup}
          />
        </Show>
        <Show when={schema().showCloneButtons && p.path.length > 0}>
          <Dynamic
            component={controls().cloneGroupAction}
            {...common}
            testID={TestID.cloneGroup}
            label={translations().cloneRuleGroup?.label}
            title={translations().cloneRuleGroup?.title}
            className={state.classNames.cloneGroup}
            handleOnClick={state.cloneGroup}
            rules={rules()}
            ruleOrGroup={state.ruleGroup}
          />
        </Show>
        <Show when={schema().showLockButtons}>
          <Dynamic
            component={controls().lockGroupAction}
            {...common}
            testID={TestID.lockGroup}
            label={translations().lockGroup?.label}
            title={translations().lockGroup?.title}
            className={state.classNames.lockGroup}
            handleOnClick={state.toggleLockGroup}
            rules={rules()}
            disabledTranslation={p.parentDisabled ? undefined : translations().lockGroupDisabled}
            ruleOrGroup={state.ruleGroup}
          />
        </Show>
        <Show when={schema().showMuteButtons}>
          <Dynamic
            component={controls().muteGroupAction}
            {...common}
            testID={TestID.muteGroup}
            label={
              state.ruleGroup.muted
                ? translations().unmuteGroup?.label
                : translations().muteGroup?.label
            }
            title={
              state.ruleGroup.muted
                ? translations().unmuteGroup?.title
                : translations().muteGroup?.title
            }
            className={state.classNames.muteGroup}
            handleOnClick={state.toggleMuteGroup}
            rules={rules()}
            ruleOrGroup={state.ruleGroup}
          />
        </Show>
        <Show when={schema().showUndoRedo && p.path.length === 0}>
          <Dynamic
            component={controls().undoRedoActions}
            {...common}
            testID={TestID.undoRedoActions}
            titles={undoRedoTitles()}
            labels={undoRedoLabels()}
            className={state.classNames.undoRedoActions}
            classNames={undoRedoClassNames()}
            ruleOrGroup={state.ruleGroup}
          />
        </Show>
        <Show when={p.path.length > 0}>
          <Dynamic
            component={controls().removeGroupAction}
            {...common}
            testID={TestID.removeGroup}
            label={translations().removeGroup?.label}
            title={translations().removeGroup?.title}
            className={state.classNames.removeGroup}
            handleOnClick={state.removeGroup}
            rules={rules()}
            ruleOrGroup={state.ruleGroup}
          />
        </Show>
      </div>
      <div class={state.classNames.body}>
        {/*
          Rows are keyed exactly as React keys them: by `id` for a rule or group, and by path
          plus value for an independent-combinator entry, which is a bare string with no `id`.
          Solid 2's `keyed` callback receives only the item, never the index, so the key is
          precomputed here rather than in the callback — the alternative, keying a repeated
          combinator string by its value alone, is not unique within a group.

          `<Index>` no longer exists in Solid 2, and a key function is the better fit anyway: a
          changed combinator string does not remount its neighbors.
        */}
        <For each={keyedRules()} keyed={entry => entry.key}>
          {entry => {
            const r = () => entry().item;
            const idx = () => entry().index;
            const thisPath = () => entry().path;
            const thisPathDisabled = () => entry().disabled;
            const shiftUpDisabled = () => p.path.length === 0 && idx() === 0;
            const shiftDownDisabled = () => p.path.length === 0 && idx() === rules().length - 1;

            /**
             * The inline combinator is rendered with `createComponent`, not `<Dynamic>`:
             * `InlineCombinatorProps` has a prop named `component` (the selector to render),
             * and `<Dynamic>` consumes a prop of that name for itself, so it can never forward
             * one. The props object uses getters, so it stays reactive.
             */
            const inlineCombinator = (
              value: () => string,
              disabled: () => boolean | undefined,
              handleOnChange: (val: unknown) => void
            ) =>
              createComponent(controls().inlineCombinator, {
                get options() {
                  return schema().combinators;
                },
                get value() {
                  return value();
                },
                get title() {
                  return translations().combinators?.title;
                },
                get className() {
                  return state.classNames.combinators;
                },
                handleOnChange,
                get rules() {
                  return rules();
                },
                get level() {
                  return p.path.length;
                },
                get context() {
                  return p.context;
                },
                get validation() {
                  return state.validationResult;
                },
                get component() {
                  return controls().combinatorSelector;
                },
                get path() {
                  return thisPath();
                },
                get disabled() {
                  return disabled();
                },
                get schema() {
                  return schema();
                },
                get ruleGroup() {
                  return state.ruleGroup;
                },
              } as never);

            return (
              <>
                <Show
                  when={
                    idx() > 0 &&
                    !schema().independentCombinators &&
                    schema().showCombinatorsBetweenRules
                  }>
                  {inlineCombinator(
                    () => state.combinator,
                    () => state.disabled,
                    state.onCombinatorChange
                  )}
                </Show>
                <Show
                  when={typeof r() !== 'string'}
                  fallback={inlineCombinator(
                    () => r() as string,
                    thisPathDisabled,
                    val => state.onIndependentCombinatorChange(val, idx())
                  )}>
                  <Show
                    when={isRuleGroup(r() as never)}
                    fallback={
                      <Dynamic
                        component={controls().rule}
                        id={(r() as RuleType).id}
                        rule={r() as RuleType}
                        schema={schema()}
                        actions={p.actions}
                        path={thisPath()}
                        disabled={thisPathDisabled()}
                        parentDisabled={p.parentDisabled || state.disabled}
                        parentMuted={p.parentMuted || state.muted}
                        translations={translations()}
                        shiftUpDisabled={shiftUpDisabled()}
                        shiftDownDisabled={shiftDownDisabled()}
                        context={p.context}
                      />
                    }>
                    <Dynamic
                      component={controls().ruleGroup}
                      id={(r() as RuleGroupTypeAny).id}
                      schema={schema()}
                      actions={p.actions}
                      path={thisPath()}
                      translations={translations()}
                      ruleGroup={r() as RuleGroupTypeAny}
                      disabled={thisPathDisabled()}
                      parentDisabled={p.parentDisabled || state.disabled}
                      parentMuted={p.parentMuted || state.muted}
                      shiftUpDisabled={shiftUpDisabled()}
                      shiftDownDisabled={shiftDownDisabled()}
                      context={p.context}
                    />
                  </Show>
                </Show>
              </>
            );
          }}
        </For>
      </div>
    </div>
  );
};
