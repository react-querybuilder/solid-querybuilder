import { createRoot } from 'solid-js';
import { onTestFinished } from 'vitest';

/**
 * Runs `fn` inside a reactive root and disposes it when the test finishes.
 *
 * ⚠️ The body of `createRoot(fn)` is itself an **owned scope**: a reactive write made there
 * throws `REACTIVE_WRITE_IN_OWNED_SCOPE`. Every test in this package therefore sets up inside
 * the root and performs every write — and every `flush()` — outside it. Returning the setup
 * value rather than accepting a body that also drives the test is what enforces that.
 *
 * ⚠️ Reads lag writes in Solid 2: a plain signal read immediately after its setter still returns
 * the old value. Call `flush()` between a write and the assertion, never a `setTimeout` or a
 * tick count.
 *
 * ⚠️ An uncaught error inside an effect halts the reactive system (`REACTIVITY_HALTED`) for the
 * rest of the module, silently ignoring every later update. Intentionally-throwing tests belong
 * in their own file.
 *
 * This lives outside `src/` deliberately: it is neither shipped nor counted in coverage.
 */
export const setupInRoot = <T>(fn: () => T): T => {
  let dispose!: () => void;
  let result!: T;
  createRoot(d => {
    dispose = d;
    result = fn();
  });
  onTestFinished(() => dispose());
  return result;
};
