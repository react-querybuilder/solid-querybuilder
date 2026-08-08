import type { Path, RuleGroupTypeAny, RuleType } from '@react-querybuilder/core';
import { isRuleGroup } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { Dynamic } from '@solidjs/web';
import { For, Show, createComponent, createMemo } from 'solid-js';
import type { RuleGroupState } from '../reactive/createRuleGroupState.js';
import type { RuleGroupProps } from '../types/props.js';

/**
 * The contents of a group's body `<div>`: its child rules and groups, plus inline combinators.
 *
 * Split out of `RuleGroup` at step 5 alongside `RuleGroupHeader`, for the same reason and with
 * the same `{ groupProps, parts }` shape.
 */
export const RuleGroupBody = (props: {
  groupProps: RuleGroupProps;
  parts: RuleGroupState;
}): JSX.Element => {
  const p = () => props.groupProps;
  const state = () => props.parts;

  const schema = () => p().schema;
  const controls = () => p().schema.controls;
  const translations = () => p().translations;
  const rules = () => state().ruleGroup.rules;

  /**
   * One entry per child, carrying everything the row needs that is derived from its position:
   * its `<For>` key, its path, and whether it is disabled. Precomputed because Solid 2's
   * `keyed` callback receives the item only — see the comment at the `<For>` below.
   */
  const keyedRules = createMemo(() =>
    rules().map((r, index) => {
      const info = state().pathsMemo[index];
      return {
        key: typeof r === 'string' ? [...info.path, r].join('-') : r.id!,
        item: r as RuleType | RuleGroupTypeAny | string,
        index,
        path: info.path as Path,
        disabled: info.disabled || (typeof r !== 'string' && !!r.disabled),
      };
    })
  );

  return (
    <>
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
          const shiftUpDisabled = () => p().path.length === 0 && idx() === 0;
          const shiftDownDisabled = () => p().path.length === 0 && idx() === rules().length - 1;

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
                return state().classNames.combinators;
              },
              handleOnChange,
              get rules() {
                return rules();
              },
              get level() {
                return p().path.length;
              },
              get context() {
                return p().context;
              },
              get validation() {
                return state().validationResult;
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
                return state().ruleGroup;
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
                  () => state().combinator,
                  () => state().disabled,
                  state().onCombinatorChange
                )}
              </Show>
              <Show
                when={typeof r() !== 'string'}
                fallback={inlineCombinator(
                  () => r() as string,
                  thisPathDisabled,
                  val => state().onIndependentCombinatorChange(val, idx())
                )}>
                <Show
                  when={isRuleGroup(r() as never)}
                  fallback={
                    <Dynamic
                      component={controls().rule}
                      id={(r() as RuleType).id}
                      rule={r() as RuleType}
                      schema={schema()}
                      actions={p().actions}
                      path={thisPath()}
                      disabled={thisPathDisabled()}
                      parentDisabled={p().parentDisabled || state().disabled}
                      parentMuted={p().parentMuted || state().muted}
                      translations={translations()}
                      shiftUpDisabled={shiftUpDisabled()}
                      shiftDownDisabled={shiftDownDisabled()}
                      context={p().context}
                    />
                  }>
                  <Dynamic
                    component={controls().ruleGroup}
                    id={(r() as RuleGroupTypeAny).id}
                    schema={schema()}
                    actions={p().actions}
                    path={thisPath()}
                    translations={translations()}
                    ruleGroup={r() as RuleGroupTypeAny}
                    disabled={thisPathDisabled()}
                    parentDisabled={p().parentDisabled || state().disabled}
                    parentMuted={p().parentMuted || state().muted}
                    shiftUpDisabled={shiftUpDisabled()}
                    shiftDownDisabled={shiftDownDisabled()}
                    context={p().context}
                  />
                </Show>
              </Show>
            </>
          );
        }}
      </For>
    </>
  );
};
