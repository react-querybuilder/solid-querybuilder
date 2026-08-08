import type { FullField, MatchMode } from '@react-querybuilder/core';
import { lc, parseNumber } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { Dynamic } from '@solidjs/web';
import { Show, createMemo, merge } from 'solid-js';
import type { MatchModeEditorProps } from '../types/props.js';

const dummyFieldData: FullField = { name: '', value: '', label: '' };
const dummyPath: never[] = [];

/** Whether a match mode carries a numeric threshold. */
const requiresThreshold = (mm?: string | null): boolean =>
  ['atleast', 'atmost', 'exactly'].includes(lc(mm) ?? '');

/**
 * Default `matchModeEditor` component: a mode selector, plus a numeric threshold editor for the
 * modes that take one.
 *
 * Port of React Query Builder's `MatchModeEditor`. Both controls carry the *same* `testID`, as
 * upstream does — tests reach the threshold editor with `getAllByTestId(...)[1]`.
 *
 * React's `useMatchModeEditor` hook is not reproduced as a composable: it is four memos and two
 * callbacks, all of which are one-liners here.
 */
export const MatchModeEditor = (props: MatchModeEditorProps): JSX.Element => {
  const selectorComponent = () => props.selectorComponent ?? props.schema.controls.valueSelector;
  const numericEditorComponent = () =>
    props.numericEditorComponent ?? props.schema.controls.valueEditor;

  const thresholdNum = createMemo(() =>
    typeof props.match.threshold === 'number' ? Math.max(0, props.match.threshold) : 1
  );
  const thresholdRule = createMemo(() => ({ field: '', operator: '=', value: thresholdNum() }));
  const thresholdFieldData = createMemo(() =>
    props.thresholdPlaceholder
      ? { ...dummyFieldData, placeholder: props.thresholdPlaceholder }
      : dummyFieldData
  );

  // `merge`, not a spread: `schema` is a getter object, and spreading it would snapshot every
  // getter into a value and sever reactivity. `merge` is lazy.
  const thresholdSchema = merge(
    () => props.schema,
    () => ({ parseNumbers: true }) as const
  );

  const handleChangeMode = (mode: MatchMode): void => {
    props.handleOnChange(
      requiresThreshold(mode) && typeof props.match.threshold !== 'number'
        ? { ...props.match, mode, threshold: 1 }
        : { ...props.match, mode }
    );
  };

  const handleChangeThreshold = (threshold: number): void => {
    props.handleOnChange({
      ...props.match,
      threshold: parseNumber(threshold, { parseNumbers: true }),
    });
  };

  return (
    <>
      <Dynamic
        component={selectorComponent()}
        schema={props.schema}
        testID={props.testID}
        className={props.className}
        title={props.title}
        handleOnChange={handleChangeMode}
        disabled={props.disabled}
        value={props.match.mode}
        options={props.options}
        multiple={false}
        listsAsArrays={false}
        path={dummyPath}
        level={0}
      />
      <Show when={requiresThreshold(props.match.mode)}>
        <Dynamic
          component={numericEditorComponent()}
          skipHook
          testID={props.testID}
          inputType="number"
          title={props.title}
          className={props.className}
          disabled={props.disabled}
          handleOnChange={handleChangeThreshold}
          field=""
          operator=""
          value={thresholdNum()}
          valueSource="value"
          fieldData={thresholdFieldData()}
          schema={thresholdSchema}
          path={dummyPath}
          level={0}
          rule={thresholdRule()}
        />
      </Show>
    </>
  );
};
