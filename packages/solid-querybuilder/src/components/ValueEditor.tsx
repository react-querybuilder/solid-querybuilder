import type { FullField, FullOption } from '@react-querybuilder/core';
import {
  coerceBigIntValue,
  coerceInputType,
  deriveRuleClassName,
  getFirstOption,
  getMultiValueUpdate,
  getParseNumberMethod,
  parseNumber,
  toArray,
} from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { Dynamic } from '@solidjs/web';
import { For, Match, Show, Switch, createUniqueId } from 'solid-js';
import { Label } from '../internal/Label.jsx';
import { createValueEditorReset } from '../reactive/createValueEditorReset.js';
import type { ValueEditorProps, ValueSelectorProps } from '../types/props.js';

/**
 * Default `valueEditor` component.
 *
 * Port of React Query Builder's `ValueEditor`. The reset effect — the one piece with a timing
 * hazard — lives in `createValueEditorReset`; everything else is derived here. React's
 * `useValueEditor` hook is not reproduced as a composable: every member of it is a one-line
 * call to core, and inlining them keeps the dependency edges visible.
 *
 * The `<Switch>` order is the spec, not a preference: unary → between → select/multiselect →
 * textarea → switch/checkbox → radio → bigint → default input.
 */
export const ValueEditor = <F extends FullField = FullField, O extends string = string>(
  props: ValueEditorProps<F, O>
): JSX.Element => {
  /** Stable prefix for `radio` input ids, so each `<label for>` association is unique. */
  const uid = createUniqueId();

  const type = () => props.type ?? 'text';
  const values = (): FullOption[] => (props.values ?? []) as FullOption[];
  const placeholderText = () => props.fieldData?.placeholder ?? '';

  const selectorComponent = () => props.selectorComponent ?? props.schema.controls.valueSelector;

  createValueEditorReset(() => ({
    operator: props.operator,
    value: props.value,
    type: props.type ?? undefined,
    inputType: props.inputType,
    skipHook: props.skipHook,
    handleOnChange: props.handleOnChange,
  }));

  const valueAsArray = () => toArray(props.value, { retainEmptyStrings: true });
  const parseNumberMethod = () =>
    getParseNumberMethod({ parseNumbers: props.parseNumbers, inputType: props.inputType });
  const valueListItemClassName = () =>
    deriveRuleClassName('valueListItem', {
      classNames: props.schema.classNames,
      suppressStandardClassnames: props.schema.suppressStandardClassnames,
    });
  const inputTypeCoerced = () => coerceInputType(props.inputType, props.operator);

  const multiValueHandler = (val: unknown, idx: number): void => {
    props.handleOnChange(
      getMultiValueUpdate({
        value: val,
        index: idx,
        valueAsArray: valueAsArray(),
        operator: props.operator,
        values: values(),
        listsAsArrays: props.listsAsArrays,
        parseNumberMethod: parseNumberMethod(),
      })
    );
  };

  const bigIntValueHandler = (v: unknown): void => {
    props.handleOnChange(coerceBigIntValue(v, parseNumberMethod()));
  };

  /**
   * The props forwarded to the selector component: everything except the props this component
   * consumes itself. A getter object, so a spread into JSX stays reactive.
   *
   * ⚠️ `testID` is excluded deliberately — React destructures it out before its rest-spread, so
   * the editors of a bound pair carry no `data-testid`. The single-selector branch passes it
   * back in explicitly. Svelte shipped the bug this comment prevents, and only the `multiValue`
   * conformance fixture caught it.
   */
  const propsForValueSelector = {
    get path() {
      return props.path;
    },
    get level() {
      return props.level;
    },
    get context() {
      return props.context;
    },
    get validation() {
      return props.validation;
    },
    get schema() {
      return props.schema;
    },
    get field() {
      return props.field;
    },
    get fieldData() {
      return props.fieldData;
    },
    get rule() {
      return props.rule;
    },
  } as unknown as ValueSelectorProps;

  const isUnary = () => props.operator === 'null' || props.operator === 'notNull';
  const isBetween = () =>
    (props.operator === 'between' || props.operator === 'notBetween') &&
    (type() === 'select' || type() === 'text');

  /** One editor of a bound pair. `title` is set here *and* on the wrapping `<span>`. */
  const BoundEditor = (p: { index: number }) => (
    <Show
      when={type() === 'text'}
      fallback={
        <Dynamic
          component={selectorComponent()}
          {...propsForValueSelector}
          title={props.title}
          className={valueListItemClassName()}
          handleOnChange={(v: unknown) => multiValueHandler(v, p.index)}
          disabled={props.disabled}
          value={valueAsArray()[p.index] ?? getFirstOption(values())}
          options={values()}
          listsAsArrays={props.listsAsArrays}
        />
      }>
      <input
        type={inputTypeCoerced()}
        placeholder={placeholderText()}
        value={valueAsArray()[p.index] ?? ''}
        title={props.title}
        class={valueListItemClassName()}
        disabled={props.disabled}
        onInput={e => multiValueHandler(e.currentTarget.value, p.index)}
      />
    </Show>
  );

  return (
    <Switch
      fallback={
        <input
          data-testid={props.testID}
          type={inputTypeCoerced()}
          placeholder={placeholderText()}
          value={props.value}
          title={props.title}
          class={props.className}
          disabled={props.disabled}
          onInput={e =>
            props.handleOnChange(
              parseNumber(e.currentTarget.value, { parseNumbers: parseNumberMethod() })
            )
          }
        />
      }>
      <Match when={isUnary()}>{null}</Match>
      <Match when={isBetween()}>
        <span data-testid={props.testID} class={props.className} title={props.title}>
          <BoundEditor index={0} />
          <Label label={props.separator} />
          <BoundEditor index={1} />
        </span>
      </Match>
      <Match when={type() === 'select' || type() === 'multiselect'}>
        <Dynamic
          component={selectorComponent()}
          {...propsForValueSelector}
          testID={props.testID}
          className={props.className}
          title={props.title}
          handleOnChange={props.handleOnChange}
          disabled={props.disabled}
          value={props.value}
          options={values()}
          multiple={type() === 'multiselect'}
          listsAsArrays={props.listsAsArrays}
        />
      </Match>
      <Match when={type() === 'textarea'}>
        <textarea
          data-testid={props.testID}
          placeholder={placeholderText()}
          value={props.value}
          title={props.title}
          class={props.className}
          disabled={props.disabled}
          onInput={e => props.handleOnChange(e.currentTarget.value)}
        />
      </Match>
      <Match when={type() === 'switch' || type() === 'checkbox'}>
        <input
          data-testid={props.testID}
          type="checkbox"
          class={props.className}
          title={props.title}
          onChange={e => props.handleOnChange(e.currentTarget.checked)}
          checked={!!props.value}
          disabled={props.disabled}
        />
      </Match>
      <Match when={type() === 'radio'}>
        <span data-testid={props.testID} class={props.className} title={props.title}>
          <For each={values()}>
            {v => (
              <label for={`${uid}-${v.name}`}>
                <input
                  id={`${uid}-${v.name}`}
                  type="radio"
                  value={v.name}
                  disabled={props.disabled}
                  checked={props.value === v.name}
                  onChange={e => props.handleOnChange(e.currentTarget.value)}
                />
                {v.label}
              </label>
            )}
          </For>
        </span>
      </Match>
      {/* Deliberately keyed off the *uncoerced* `inputType`. */}
      <Match when={props.inputType === 'bigint'}>
        <input
          data-testid={props.testID}
          type={inputTypeCoerced()}
          placeholder={placeholderText()}
          value={`${props.value}`}
          title={props.title}
          class={props.className}
          disabled={props.disabled}
          onInput={e => bigIntValueHandler(e.currentTarget.value)}
        />
      </Match>
    </Switch>
  );
};
