import type { JSX } from '@solidjs/web';
import { createUniqueId } from 'solid-js';
import { Label } from '../internal/Label.jsx';
import type { NotToggleProps } from '../types/props.js';

/**
 * Default `notToggle` (inversion) component.
 *
 * Port of React Query Builder's `NotToggle`: a `<label>` wrapping a checkbox and the label text,
 * with the `for`/`id` association React derives from `useId` and Solid from `createUniqueId`.
 */
export const NotToggle = (props: NotToggleProps): JSX.Element => {
  const id = createUniqueId();

  return (
    <label data-testid={props.testID} class={props.className} title={props.title} for={id}>
      <input
        id={id}
        type="checkbox"
        onChange={e => props.handleOnChange(e.currentTarget.checked)}
        checked={!!props.checked}
        disabled={props.disabled}
      />
      <Label label={props.label} />
    </label>
  );
};
