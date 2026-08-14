import type { RuleGroupTypeAny } from '@react-querybuilder/core';
import {
  derivePathInfo,
  deriveRuleGroupClassNames,
  deriveRuleGroupContext,
  deriveRuleGroupOuterClassName,
  getParentPath,
  getValidationClassNames,
} from '@react-querybuilder/core';
import { createMemo } from 'solid-js';
import type { RuleGroupProps } from '../types/props.js';

// oxlint-disable-next-line typescript/no-explicit-any
type AnyContext = any;

/** A click handler that also receives the arbitrary `context` an action element may pass. */
type ActionHandler = (event?: MouseEvent, context?: AnyContext) => void;

/**
 * Everything `RuleGroup`, `RuleGroupHeader`, and `RuleGroupBody` need, derived from
 * {@link RuleGroupProps}.
 *
 * As with `createRuleState`, React's `useMemo` graph at `RuleGroup.tsx:563-740` is a dependency
 * spec: the class names come from core's `deriveRuleGroup*ClassNames`, the resolved
 * configuration from `deriveRuleGroupContext`, and the child paths from `derivePathInfo`. Data
 * members are getters.
 */
export interface RuleGroupState {
  /**
   * The group as rendered. A group with no `combinator` of its own resolves to the first
   * configured combinator, and the copy carries it so subcomponents see a consistent value.
   */
  readonly ruleGroup: RuleGroupTypeAny;
  readonly combinator: string;
  readonly disabled: boolean;
  readonly muted: boolean;
  readonly validationResult: ReturnType<typeof deriveRuleGroupContext>['validationResult'];
  readonly classNames: ReturnType<typeof deriveRuleGroupClassNames>;
  readonly outerClassName: string;
  readonly accessibleDescription: string;
  /** Per-child path and disabled state, in `ruleGroup.rules` order. */
  readonly pathsMemo: ReturnType<typeof derivePathInfo>;
  readonly onCombinatorChange: (value: AnyContext) => void;
  readonly onIndependentCombinatorChange: (value: AnyContext, index: number) => void;
  readonly onNotToggleChange: (checked: boolean) => void;
  readonly addRule: ActionHandler;
  readonly addGroup: ActionHandler;
  readonly cloneGroup: ActionHandler;
  readonly toggleLockGroup: ActionHandler;
  readonly toggleMuteGroup: ActionHandler;
  readonly removeGroup: ActionHandler;
  readonly shiftGroupUp: ActionHandler;
  readonly shiftGroupDown: ActionHandler;
}

/** Wraps an action handler so it stops the triggering event from propagating. */
const stopPropagation =
  (method: ActionHandler): ActionHandler =>
  (event, context) => {
    event?.preventDefault();
    event?.stopPropagation();
    method(event, context);
  };

/**
 * Derives the rendering state for a rule group.
 *
 * Takes a plain props object, for the same reason as `createRuleState`: Solid props are already
 * reactive getters, and a synthesized getter-object literal (which is what `RuleSubQuery` builds
 * for a subquery's group) is equally reactive.
 */
export const createRuleGroupState = (props: RuleGroupProps): RuleGroupState => {
  const p = (): RuleGroupProps => props;

  // Plain closures, not memos — see the note in `createRuleState`.
  const schema = () => p().schema;
  const path = () => p().path;

  const disabled = () => !!p().parentDisabled || !!p().disabled;
  const muted = () => !!p().parentMuted || !!p().ruleGroup.muted;

  const ctx = createMemo(() =>
    deriveRuleGroupContext(p().ruleGroup, schema().combinators, {
      validationMap: schema().validationMap,
      id: p().id,
    })
  );

  const ruleGroup = createMemo((): RuleGroupTypeAny => {
    if (schema().independentCombinators || p().ruleGroup.combinator === ctx().combinator) {
      return p().ruleGroup;
    }
    return { ...p().ruleGroup, combinator: ctx().combinator } as RuleGroupTypeAny;
  });

  const classNames = createMemo(() =>
    deriveRuleGroupClassNames({
      classNames: schema().classNames,
      suppressStandardClassnames: schema().suppressStandardClassnames,
    })
  );

  const outerClassName = createMemo(() =>
    deriveRuleGroupOuterClassName({
      classNames: schema().classNames,
      suppressStandardClassnames: schema().suppressStandardClassnames,
      leadingClassNames: [
        schema().getRuleGroupClassname(ruleGroup()),
        ctx().combinatorBasedClassName,
      ],
      disabled: disabled(),
      muted: muted(),
      validationClassName: getValidationClassNames(ctx().validationResult),
    })
  );

  const pathsMemo = createMemo(() =>
    derivePathInfo(path(), ruleGroup().rules.length, {
      disabled: disabled(),
      disabledPaths: schema().disabledPaths,
    })
  );

  const accessibleDescription = createMemo(() =>
    // There is no `qbId` in this package; the default generator ignores it.
    schema().accessibleDescriptionGenerator({ path: path(), qbId: '' })
  );

  const onCombinatorChange = (value: AnyContext): void => {
    if (!disabled()) p().actions.onPropChange('combinator', value, path());
  };

  const onIndependentCombinatorChange = (value: AnyContext, index: number): void => {
    if (!disabled()) p().actions.onPropChange('combinator', value, [...path(), index]);
  };

  const onNotToggleChange = (checked: boolean): void => {
    if (!disabled()) p().actions.onPropChange('not', checked, path());
  };

  const addRule = stopPropagation((_event, context) => {
    if (!disabled()) p().actions.onRuleAdd(schema().createRule(), path(), context);
  });

  const addGroup = stopPropagation((_event, context) => {
    if (!disabled()) p().actions.onGroupAdd(schema().createRuleGroup(), path(), context);
  });

  const cloneGroup = stopPropagation(() => {
    if (!disabled()) {
      p().actions.moveRule(path(), [...getParentPath(path()), path().at(-1)! + 1], true);
    }
  });

  const toggleLockGroup = stopPropagation(() => {
    p().actions.onPropChange('disabled', !disabled(), path());
  });

  const toggleMuteGroup = stopPropagation(() => {
    p().actions.onPropChange('muted', !ruleGroup().muted, path());
  });

  const removeGroup = stopPropagation(() => {
    if (!disabled()) p().actions.onGroupRemove(path());
  });

  const shiftGroupUp = stopPropagation(event => {
    if (!disabled() && !p().shiftUpDisabled) {
      p().actions.moveRule(path(), 'up', event?.altKey);
    }
  });

  const shiftGroupDown = stopPropagation(event => {
    if (!disabled() && !p().shiftDownDisabled) {
      p().actions.moveRule(path(), 'down', event?.altKey);
    }
  });

  return {
    get ruleGroup() {
      return ruleGroup();
    },
    get combinator() {
      return ctx().combinator;
    },
    get disabled() {
      return disabled();
    },
    get muted() {
      return muted();
    },
    get validationResult() {
      return ctx().validationResult;
    },
    get classNames() {
      return classNames();
    },
    get outerClassName() {
      return outerClassName();
    },
    get accessibleDescription() {
      return accessibleDescription();
    },
    get pathsMemo() {
      return pathsMemo();
    },
    onCombinatorChange,
    onIndependentCombinatorChange,
    onNotToggleChange,
    addRule,
    addGroup,
    cloneGroup,
    toggleLockGroup,
    toggleMuteGroup,
    removeGroup,
    shiftGroupUp,
    shiftGroupDown,
  };
};
