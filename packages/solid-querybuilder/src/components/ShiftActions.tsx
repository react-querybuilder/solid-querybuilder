import type { JSX } from '@solidjs/web';
import { Label } from '../internal/Label.jsx';
import type { ShiftActionsProps } from '../types/props.js';

/**
 * Default "shift up"/"shift down" buttons.
 *
 * Port of React Query Builder's `ShiftActions`. The buttons are plain `<button>` elements, not
 * the `actionElement` control — that is upstream's shape, and the conformance fixtures assert it.
 * Both handlers forward the click event, which `Rule`/`RuleGroup` read `altKey` from.
 */
export const ShiftActions = (props: ShiftActionsProps): JSX.Element => (
  <div data-testid={props.testID} class={props.className}>
    <button
      type="button"
      disabled={props.disabled || props.shiftUpDisabled}
      onClick={e => props.shiftUp?.(e)}
      title={props.titles?.shiftUp}>
      <Label label={props.labels?.shiftUp} />
    </button>
    <button
      type="button"
      disabled={props.disabled || props.shiftDownDisabled}
      onClick={e => props.shiftDown?.(e)}
      title={props.titles?.shiftDown}>
      <Label label={props.labels?.shiftDown} />
    </button>
  </div>
);
