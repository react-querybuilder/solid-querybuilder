import { TestID } from '@react-querybuilder/core';
import type { JSX } from '@solidjs/web';
import { Dynamic } from '@solidjs/web';
import { createMemo, snapshot } from 'solid-js';
import type { UndoRedoActionsProps } from '../types/props.js';

/**
 * Default "undo"/"redo" buttons, rendered in the header of the outermost group when
 * `showUndoRedo` is enabled.
 *
 * The buttons themselves go through the `actionElement` control, as upstream does, so a
 * replacement action element applies to them too.
 *
 * Unlike React Query Builder — where history lives in a Redux slice keyed by `qbId` — the
 * history here belongs to the `QueryManager`, which is reached through `schema.manager`.
 *
 * ⚠️ `snapshot()` first: `QueryManager` keeps its history in private class fields, and a store
 * proxy cannot read through to them (`TypeError: Cannot read private member #past`). Same class
 * of problem as the standing `snapshot()`-before-writing rule, in the opposite direction.
 *
 * `canUndo()`/`canRedo()` are plain method calls on a stable object, so they establish no
 * dependency by themselves; the memos also read `props.ruleOrGroup`, which is replaced on every
 * commit, to get one. Under Solid 2's automatic batching the buttons' enabled state settles on
 * the microtask flush rather than synchronously.
 */
export const UndoRedoActions = (props: UndoRedoActionsProps): JSX.Element => {
  const manager = () => snapshot(props.schema.manager);

  /**
   * Establishes the dependency the method calls cannot: the outermost group is replaced on every
   * commit, so reading it is what makes these memos recompute.
   */
  const historyVersion = (): unknown => props.ruleOrGroup;

  const canUndo = createMemo(() => historyVersion() !== null && manager().canUndo());
  const canRedo = createMemo(() => historyVersion() !== null && manager().canRedo());

  /** Props both buttons receive. A getter object, so a spread stays reactive. */
  const common = {
    get level() {
      return props.level;
    },
    get path() {
      return props.path;
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
    get ruleOrGroup() {
      return props.ruleOrGroup;
    },
  };

  return (
    <div data-testid={props.testID} class={props.className}>
      <Dynamic
        component={props.schema.controls.actionElement}
        {...common}
        testID={TestID.undoAction}
        label={props.labels?.undo}
        title={props.titles?.undo}
        className={props.classNames?.undo}
        handleOnClick={() => manager().undo()}
        disabled={props.disabled || !canUndo()}
      />
      <Dynamic
        component={props.schema.controls.actionElement}
        {...common}
        testID={TestID.redoAction}
        label={props.labels?.redo}
        title={props.titles?.redo}
        className={props.classNames?.redo}
        handleOnClick={() => manager().redo()}
        disabled={props.disabled || !canRedo()}
      />
    </div>
  );
};
