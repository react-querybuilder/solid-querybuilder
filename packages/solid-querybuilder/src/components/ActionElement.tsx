import type { JSX } from '@solidjs/web';
import { Label } from '../internal/Label.jsx';
import type { ActionProps } from '../types/props.js';

/**
 * Default `<button>` component for every action control.
 *
 * Port of React Query Builder's `ActionElement`. When the control is disabled *and* a
 * `disabledTranslation` is supplied, the button stays enabled (so the tooltip is reachable) and
 * renders that translation's label and title instead of its own.
 */
export const ActionElement = (props: ActionProps): JSX.Element => {
  const useDisabledTranslation = () => !!props.disabledTranslation && !!props.disabled;

  return (
    <button
      type="button"
      data-testid={props.testID}
      disabled={props.disabled && !props.disabledTranslation}
      class={props.className}
      title={useDisabledTranslation() ? props.disabledTranslation?.title : props.title}
      onClick={e => props.handleOnClick(e)}>
      <Label label={useDisabledTranslation() ? props.disabledTranslation?.label : props.label} />
    </button>
  );
};
