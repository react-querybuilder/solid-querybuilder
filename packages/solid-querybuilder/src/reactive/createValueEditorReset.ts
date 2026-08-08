import type { InputType } from '@react-querybuilder/core';
import { getValueEditorReset } from '@react-querybuilder/core';
import type { Accessor } from 'solid-js';
import { createEffect, untrack } from 'solid-js';

/**
 * The subset of `ValueEditorProps` that determines whether the value needs to be reset.
 */
export interface ValueEditorResetDeps {
  operator: string;
  // oxlint-disable-next-line typescript/no-explicit-any
  value: any;
  type?: string;
  inputType?: InputType | null;
  /** Set when an ancestor component has already applied the reset. */
  skipHook?: boolean;
  /** Applies the reset. */
  // oxlint-disable-next-line typescript/no-explicit-any
  handleOnChange: (value: any) => void;
}

/**
 * Installs the effect that collapses a rule's `value` when it stops representing a list — for
 * example when the operator changes from `in` or `between` to `=`, or when an
 * `<input type="number">` is handed a comma-containing string it cannot display.
 *
 * Core decides *what* the value should become (`getValueEditorReset`); this decides *when*.
 * That split is why `deriveValueEditor.ts:26` supplies no timing of its own.
 *
 * Three things keep this from looping:
 *
 * 1. **Deps in the compute phase, the write in apply.** Solid 2 removed `on()` because the split
 *    effect subsumes it: the compute function *is* the dependency declaration by construction,
 *    so the 1.x hazard — an auto-tracking effect whose tracked set changes across branches —
 *    is not expressible here.
 * 2. **`untrack` around the write**, so a `handleOnChange` that reads reactive state cannot
 *    widen the tracked set.
 * 3. **A re-entrancy flag.** `getValueEditorReset` is idempotent, so a follow-up run is already
 *    a no-op, but Solid's failure mode for a runaway effect is quieter than Svelte's, so the
 *    four lines are worth it.
 *
 * **`{ defer: true }` is load-bearing and double-gated by two opposing conformance layers.**
 * React applies the reset in a post-commit `useEffect`, i.e. after first paint. Deferring the
 * initial run is the matching behavior: dropping it applies the reset during render and breaks
 * the SSR `classnames.json` layer (rendered with no effects run at all), while breaking the
 * reset entirely breaks the post-flush layer (`classnames-post-flush.json`).
 *
 * Caveat, established upstream: a mount-and-flush render can never *observe* the reset landing —
 * the parent's mount-query-change dispatches the whole `defaultQuery` over the child's reset —
 * so the post-flush layer pins the *timing* half only. The *landing* half is pinned by this
 * package's post-mount operator-change unit tests.
 */
export const createValueEditorReset = (deps: Accessor<ValueEditorResetDeps>): void => {
  let applying = false;

  createEffect(
    // Compute: the dependency declaration. In Solid 2 this *is* the explicit dep list.
    () => {
      const d = deps();
      return [d.operator, d.value, d.type, d.inputType, d.skipHook] as const;
    },
    // Apply: the write phase. Apply-phase writes are legal (no `ownedWrite` needed); the block
    // body is mandatory, since a concise body would return the setter's value and throw
    // "invalid cleanup value".
    ([operator, value, type, inputType, skipHook]) => {
      if (applying) return;

      const { reset, value: nextValue } = getValueEditorReset({
        skipHook,
        type: type ?? undefined,
        operator,
        value,
        inputType,
      });

      if (!reset) return;

      applying = true;
      try {
        untrack(() => deps().handleOnChange(nextValue));
      } finally {
        applying = false;
      }
    },
    { defer: true }
  );
};
