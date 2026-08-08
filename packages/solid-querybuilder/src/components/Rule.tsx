import { TestID } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { Dynamic } from '@solidjs/web';
import { Show } from 'solid-js';
import { createRuleState } from '../reactive/createRuleState.js';
import type { RuleProps } from '../types/props.js';

/**
 * Default component for `RuleType` objects.
 *
 * Port of React Query Builder's `Rule`/`RuleComponents`. React splits the two so that the
 * subquery variant can reuse the inner half; that split lands at step 5 with `RuleSubQuery`.
 * Element order and conditional rendering are identical either way, and they are the contract:
 * read React's `Rule.tsx` as the spec.
 *
 * Every control is rendered through `schema.controls`, never through a direct import, so a
 * replacement component applies here too. Controls not yet implemented resolve to
 * `nullComponent`, so no call site needs a guard.
 */
export const Rule = <F extends string = string, O extends string = string>(
  props: RuleProps<F, O>
): JSX.Element => {
  // Widened once, here: `createRuleState` and the control elements are written against the
  // default type parameters, and Solid components have no compile-time prop enumeration to
  // narrow through.
  const p = props as unknown as RuleProps;
  const state = createRuleState(p);

  const schema = () => p.schema;
  const controls = () => p.schema.controls;
  const rule = () => p.rule;
  const translations = () => p.translations;

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
      return state.ctx.validationResult;
    },
    get schema() {
      return p.schema;
    },
    get rule() {
      return p.rule;
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

  return (
    <div
      data-testid={TestID.rule}
      class={state.outerClassName}
      data-rule-id={p.id}
      data-level={p.path.length}
      data-path={JSON.stringify(p.path)}>
      <Show when={schema().showShiftActions}>
        <Dynamic
          component={controls().shiftActions}
          {...common}
          testID={TestID.shiftActions}
          titles={shiftTitles()}
          labels={shiftLabels()}
          className={state.classNames.shiftActions}
          ruleOrGroup={rule()}
          shiftUp={state.shiftRuleUp}
          shiftDown={state.shiftRuleDown}
          shiftUpDisabled={p.shiftUpDisabled}
          shiftDownDisabled={p.shiftDownDisabled}
        />
      </Show>
      <Show when={state.showFieldSelector}>
        <Dynamic
          component={controls().fieldSelector}
          {...common}
          testID={TestID.fields}
          options={schema().fields}
          title={translations().fields?.title}
          value={rule().field}
          operator={rule().operator}
          className={state.classNames.fields}
          handleOnChange={state.onChangeField}
        />
      </Show>
      <Show
        when={schema().autoSelectField || rule().field !== translations().fields?.placeholderName}>
        <Show
          when={state.hasSubQuery}
          fallback={
            <>
              <Dynamic
                component={controls().operatorSelector}
                {...common}
                testID={TestID.operators}
                field={rule().field}
                fieldData={state.fieldData}
                title={translations().operators?.title}
                options={state.ctx.operators}
                value={rule().operator}
                className={state.classNames.operators}
                handleOnChange={state.onChangeOperator}
              />
              <Show when={state.showValueControls}>
                <Show when={state.showValueSourceSelector}>
                  <Dynamic
                    component={controls().valueSourceSelector}
                    {...common}
                    testID={TestID.valueSourceSelector}
                    field={rule().field}
                    fieldData={state.fieldData}
                    title={translations().valueSourceSelector?.title}
                    options={state.ctx.valueSourceOptions}
                    value={rule().valueSource ?? 'value'}
                    className={state.classNames.valueSource}
                    handleOnChange={state.onChangeValueSource}
                  />
                </Show>
                <Dynamic
                  component={controls().valueEditor}
                  {...common}
                  testID={TestID.valueEditor}
                  field={rule().field}
                  fieldData={state.fieldData}
                  title={translations().value?.title}
                  operator={rule().operator}
                  value={rule().value}
                  valueSource={rule().valueSource ?? 'value'}
                  type={state.ctx.valueEditorType}
                  inputType={state.ctx.inputType}
                  values={state.ctx.values}
                  listsAsArrays={schema().listsAsArrays}
                  parseNumbers={schema().parseNumbers}
                  separator={state.valueEditorSeparator}
                  className={state.classNames.value}
                  handleOnChange={state.onChangeValue}
                />
              </Show>
            </>
          }>
          <Dynamic
            component={controls().matchModeEditor}
            {...common}
            testID={TestID.matchModeEditor}
            field={rule().field}
            fieldData={state.fieldData}
            title={translations().matchMode?.title}
            options={state.ctx.matchModes}
            thresholdPlaceholder={translations().matchThreshold?.placeholderName}
            match={rule().match ?? { mode: 'all' }}
            className={state.classNames.matchMode}
            classNames={state.classNames}
            handleOnChange={state.onChangeMatchMode}
          />
        </Show>
      </Show>
      <Show when={schema().showCloneButtons}>
        <Dynamic
          component={controls().cloneRuleAction}
          {...common}
          testID={TestID.cloneRule}
          label={translations().cloneRule?.label}
          title={translations().cloneRule?.title}
          className={state.classNames.cloneRule}
          ruleOrGroup={rule()}
          handleOnClick={state.cloneRule}
        />
      </Show>
      <Show when={schema().showLockButtons}>
        <Dynamic
          component={controls().lockRuleAction}
          {...common}
          testID={TestID.lockRule}
          label={translations().lockRule?.label}
          title={translations().lockRule?.title}
          className={state.classNames.lockRule}
          ruleOrGroup={rule()}
          handleOnClick={state.toggleLockRule}
          disabledTranslation={p.parentDisabled ? undefined : translations().lockRuleDisabled}
        />
      </Show>
      <Show when={schema().showMuteButtons}>
        <Dynamic
          component={controls().muteRuleAction}
          {...common}
          testID={TestID.muteRule}
          label={rule().muted ? translations().unmuteRule?.label : translations().muteRule?.label}
          title={rule().muted ? translations().unmuteRule?.title : translations().muteRule?.title}
          className={state.classNames.muteRule}
          ruleOrGroup={rule()}
          handleOnClick={state.toggleMuteRule}
        />
      </Show>
      <Dynamic
        component={controls().removeRuleAction}
        {...common}
        testID={TestID.removeRule}
        label={translations().removeRule?.label}
        title={translations().removeRule?.title}
        className={state.classNames.removeRule}
        ruleOrGroup={rule()}
        handleOnClick={state.removeRule}
      />
    </div>
  );
};
