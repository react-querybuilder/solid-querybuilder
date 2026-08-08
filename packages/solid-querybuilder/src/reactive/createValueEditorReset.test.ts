import { createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { setupInRoot } from '../../test/reactive-harness.js';
import type { ValueEditorResetDeps } from './createValueEditorReset.js';
import { createValueEditorReset } from './createValueEditorReset.js';

/**
 * Drives the effect from a single signal, the way `ValueEditor` will drive it from its props.
 * Every write is made *outside* the root, and every assertion follows a `flush()`.
 */
const setup = (initial: Omit<ValueEditorResetDeps, 'handleOnChange'>) => {
  const handleOnChange = vi.fn();
  const [deps, setDeps] = createSignal<ValueEditorResetDeps>({ ...initial, handleOnChange });
  setupInRoot(() => createValueEditorReset(deps));
  return {
    handleOnChange,
    update: (next: Partial<Omit<ValueEditorResetDeps, 'handleOnChange'>>) => {
      setDeps(prev => ({ ...prev, ...next }));
      flush();
    },
  };
};

describe('createValueEditorReset', () => {
  it('does not run on mount', () => {
    // `{ defer: true }` matches React's post-commit `useEffect`. Dropping it applies the reset
    // during render, which breaks the static (SSR) conformance layer; breaking the reset itself
    // breaks the post-flush layer. Both directions are gated.
    const { handleOnChange } = setup({ operator: '=', value: ['a', 'b'] });
    flush();
    expect(handleOnChange).not.toHaveBeenCalled();
  });

  it('collapses an array value when the operator leaves a list operator', () => {
    const { handleOnChange, update } = setup({ operator: 'between', value: ['a', 'b'] });
    update({ operator: '=' });
    expect(handleOnChange).toHaveBeenCalledTimes(1);
    // Core collapses to the first element, it does not blank the value.
    expect(handleOnChange).toHaveBeenCalledWith('a');
  });

  it('does not reset when the operator becomes a list operator', () => {
    const { handleOnChange, update } = setup({ operator: '=', value: 'a' });
    update({ operator: 'between' });
    expect(handleOnChange).not.toHaveBeenCalled();
  });

  it('resets a comma-separated string on a number input, but not on a text input', () => {
    // Core resets *array* values under a non-list operator, and comma-strings only when
    // `inputType` is `number` — not comma-strings on a text input.
    const text = setup({ operator: '=', value: 'a,b', inputType: 'text' });
    text.update({ value: 'a,b,c' });
    expect(text.handleOnChange).not.toHaveBeenCalled();

    const number = setup({ operator: '=', value: 1, inputType: 'number' });
    number.update({ value: '1,2' });
    expect(number.handleOnChange).toHaveBeenCalledWith('1');
  });

  it('resets when the field change brings a new type with a stale array value', () => {
    // A `valueSource` flip is *not* an input to `getValueEditorReset` in current core (it takes
    // `{ skipHook, type, operator, value, inputType }`), so a flip to `field` or `parameter`
    // reaches this effect indirectly, as the change to `type`/`inputType` that
    // `deriveRuleContext` resolves. That is what this case models.
    const { handleOnChange, update } = setup({
      operator: 'in',
      value: ['a', 'b'],
      type: 'multiselect',
    });
    update({ operator: '=', type: 'select' });
    expect(handleOnChange).toHaveBeenCalledTimes(1);
  });

  it('does nothing when skipHook is set', () => {
    // Set when an ancestor has already applied the reset.
    const { handleOnChange, update } = setup({
      operator: 'between',
      value: ['a', 'b'],
      skipHook: true,
    });
    update({ operator: '=' });
    expect(handleOnChange).not.toHaveBeenCalled();
  });

  it('does not call handleOnChange when no reset is needed', () => {
    const { handleOnChange, update } = setup({ operator: '=', value: 'Steve' });
    update({ value: 'Vai' });
    update({ operator: '>' });
    expect(handleOnChange).not.toHaveBeenCalled();
  });

  it('does not loop when handleOnChange writes back into the tracked deps', () => {
    // The write is `untrack`ed and guarded by a re-entrancy flag, so a `handleOnChange` that
    // feeds the new value straight back into the effect's own dependencies settles instead of
    // re-triggering. A tracked write here would recurse.
    const seen: unknown[] = [];
    const [deps, setDeps] = createSignal<ValueEditorResetDeps>({
      operator: 'between',
      value: ['a', 'b'],
      handleOnChange: (v: unknown) => {
        seen.push(v);
        setDeps(prev => ({ ...prev, value: v }));
      },
    });
    setupInRoot(() => createValueEditorReset(deps));

    setDeps(prev => ({ ...prev, operator: '=' }));
    flush();
    flush();

    expect(seen).toEqual(['a']);
    expect(deps().value).toBe('a');
  });

  it('applies a later reset after an earlier one has settled', () => {
    const { handleOnChange, update } = setup({ operator: 'between', value: ['a', 'b'] });
    update({ operator: '=' });
    expect(handleOnChange).toHaveBeenCalledTimes(1);

    update({ operator: 'in', value: ['c', 'd'] });
    expect(handleOnChange).toHaveBeenCalledTimes(1);

    update({ operator: '=' });
    expect(handleOnChange).toHaveBeenCalledTimes(2);
  });
});
