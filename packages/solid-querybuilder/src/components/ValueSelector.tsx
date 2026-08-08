import type { FullOption, Option } from '@react-querybuilder/core';
import {
  getValueSelectorUpdate,
  isOptionGroupArray,
  normalizeValueSelectorValue,
} from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { For, Show, createEffect } from 'solid-js';
import type { ValueSelectorProps } from '../types/props.js';

/**
 * Whether `optionName` is part of the selector's current value.
 *
 * Selection is expressed on the options, not as a `value` on the `<select>`. React can set
 * `value` for both cases because it special-cases `<select multiple>`; assigning a `value`
 * property in Solid stringifies the array and *clears* the selection, so the option-level
 * `selected` property is the only form that works for both.
 */
const isSelected = (value: string | string[] | undefined, optionName: string): boolean =>
  Array.isArray(value) ? value.includes(optionName) : value === optionName;

/**
 * The `<option>` elements for one flat option list.
 *
 * A component rather than a helper function so the `<For>` inside it has an owner in every
 * position it is used.
 */
const Options = (props: { options: Option[]; value: string | string[] | undefined }) => (
  <For each={props.options}>
    {opt => (
      <option value={opt.name} disabled={opt.disabled} selected={isSelected(props.value, opt.name)}>
        {opt.label}
      </option>
    )}
  </For>
);

/**
 * Default `<select>` component for every selector control — combinator, field, operator, value
 * source, and list-based value editors.
 *
 * Port of React Query Builder's `ValueSelector`. React's `useValueSelector` hook collapses into
 * the two core calls it wraps (`normalizeValueSelectorValue` and `getValueSelectorUpdate`), so
 * there is no separate composable here.
 */
export const ValueSelector = <Opt extends FullOption = FullOption>(
  props: ValueSelectorProps<Opt>
): JSX.Element => {
  const val = () => normalizeValueSelectorValue(props.value, props.multiple);

  // Assigned by the `ref` below, before any effect runs.
  // oxlint-disable-next-line no-unassigned-vars
  let selectRef!: HTMLSelectElement;

  /**
   * Re-applies the selection after render.
   *
   * The `selected` property set on each option below is correct at creation and is what SSR
   * emits, but `multiple` is a dynamic prop here, so it is assigned to the element *after* its
   * children exist — and switching a `<select>` to `multiple` collapses an existing multi
   * selection to its last entry. Re-applying once the element is complete is what survives
   * that. Deps in the compute phase, writes in the apply phase; effects never run under SSR,
   * where the option-level `selected` is doing the work instead.
   */
  createEffect(
    () => ({ value: val(), options: props.options }),
    ({ value }) => {
      for (const option of selectRef.options) {
        option.selected = isSelected(value, option.value);
      }
    }
  );

  const onChange: JSX.EventHandler<HTMLSelectElement, Event> = event => {
    const next = props.multiple
      ? [...event.currentTarget.selectedOptions].map(o => o.value)
      : event.currentTarget.value;
    props.handleOnChange(
      getValueSelectorUpdate(next, {
        multiple: props.multiple,
        listsAsArrays: props.listsAsArrays ?? false,
      })
    );
  };

  return (
    <select
      ref={selectRef}
      data-testid={props.testID}
      class={props.className}
      title={props.title}
      disabled={props.disabled}
      multiple={!!props.multiple}
      onChange={onChange}>
      <Show
        when={isOptionGroupArray(props.options)}
        fallback={
          <Show when={Array.isArray(props.options)}>
            <Options options={props.options as Option[]} value={val()} />
          </Show>
        }>
        <For each={props.options as { label: string; options: Option[] }[]}>
          {og => (
            <optgroup label={og.label}>
              <Options options={og.options} value={val()} />
            </optgroup>
          )}
        </For>
      </Show>
    </select>
  );
};
