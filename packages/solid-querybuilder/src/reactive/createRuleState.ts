import type { FullField, RuleContextResolvers } from '@react-querybuilder/core';
import {
  deriveRuleClassNames,
  deriveRuleContext,
  deriveRuleOuterClassName,
  getParentPath,
  getValidationClassNames,
  isPojo,
  lc,
} from '@react-querybuilder/core';
import type { Accessor } from 'solid-js';
import { createMemo } from 'solid-js';
import type { RuleProps } from '../types/props.js';
import type { LabelNode } from '../types/translations.js';

// oxlint-disable-next-line typescript/no-explicit-any
type AnyContext = any;

/** A click handler that also receives the arbitrary `context` an action element may pass. */
type ActionHandler = (event?: MouseEvent, context?: AnyContext) => void;

/** A change handler that also receives the arbitrary `context` a selector may pass. */
type ChangeHandler = (value: AnyContext, context?: AnyContext) => void;

/**
 * Everything `Rule` and `RuleComponents` need, derived from {@link RuleProps}.
 *
 * Every data member is a **getter** over a memo, not an accessor: a consumer writes
 * `state.classNames` and stays reactive without a call, and the same object can be passed
 * onward to `RuleComponents` or read once by a context without freezing.
 *
 * Class names come from core's `deriveRule*ClassNames` and the resolved rule configuration from
 * core's `deriveRuleContext`. React's `useMemo` graph at `Rule.tsx:549-760` is a dependency
 * spec, not code to translate: most of it collapses into those two calls.
 */
export interface RuleState {
  readonly ctx: ReturnType<typeof deriveRuleContext<FullField>>;
  readonly disabled: boolean;
  readonly muted: boolean;
  readonly classNames: ReturnType<typeof deriveRuleClassNames>;
  readonly outerClassName: string;
  readonly fieldData: FullField;
  readonly valueEditorSeparator: LabelNode;
  /** Whether this rule's field supports match modes, i.e. whether it renders a subquery. */
  readonly hasSubQuery: boolean;
  readonly showFieldSelector: boolean;
  readonly showValueControls: boolean;
  readonly showValueSourceSelector: boolean;
  readonly onChangeField: ChangeHandler;
  readonly onChangeOperator: ChangeHandler;
  readonly onChangeMatchMode: ChangeHandler;
  readonly onChangeValueSource: ChangeHandler;
  readonly onChangeValue: ChangeHandler;
  readonly cloneRule: ActionHandler;
  readonly toggleLockRule: ActionHandler;
  readonly toggleMuteRule: ActionHandler;
  readonly removeRule: ActionHandler;
  readonly shiftRuleUp: ActionHandler;
  readonly shiftRuleDown: ActionHandler;
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
 * Derives the rendering state for a rule.
 *
 * Accepts an accessor as well as a plain props object so `RuleSubQuery` and `RuleComponents` can
 * synthesize a still-reactive props object for a node that is not in the manager's query. That
 * is the only place the accessor convention is needed — Solid props are already reactive
 * getters, so an ordinary component passes `props` straight through.
 */
export const createRuleState = (props: RuleProps | Accessor<RuleProps>): RuleState => {
  const p: Accessor<RuleProps> = typeof props === 'function' ? props : () => props;

  const schema = createMemo(() => p().schema);
  const rule = createMemo(() => p().rule);
  const path = createMemo(() => p().path);

  const disabled = createMemo(() => !!p().parentDisabled || !!p().disabled);
  const muted = createMemo(() => !!p().parentMuted || !!rule().muted);

  const classNames = createMemo(() =>
    deriveRuleClassNames({
      classNames: schema().classNames,
      suppressStandardClassnames: schema().suppressStandardClassnames,
    })
  );

  // Resolved from `schema` rather than `schema.manager.getRuleContext(path)` so that a
  // replacement `rule` component — or a subquery, whose rules are not in the manager's query at
  // all — can still be rendered.
  const resolvers = createMemo(
    () =>
      ({
        fields: schema().fields,
        fieldMap: schema().fieldMap,
        getInputType: schema().getInputType,
        getMatchModes: schema().getMatchModes,
        getOperators: schema().getOperators,
        getParameters: schema().getParameters,
        getValueEditorType: schema().getValueEditorType,
        getValues: schema().getValues,
        getValueSources: schema().getValueSources,
        getSubQueryBuilderProps: schema().getSubQueryBuilderProps,
      }) as unknown as RuleContextResolvers<FullField>
  );

  const ctx = createMemo(() =>
    deriveRuleContext(rule(), resolvers(), {
      validationMap: schema().validationMap,
      id: p().id,
    })
  );

  const fieldData = createMemo(() => ctx().fieldData);
  const valueEditorSeparator = createMemo(() =>
    schema().getValueEditorSeparator(rule().field, rule().operator, { fieldData: fieldData() })
  );

  const hasSubQuery = createMemo(() => ctx().matchModes.length > 0);

  const outerClassName = createMemo(() =>
    deriveRuleOuterClassName({
      classNames: schema().classNames,
      suppressStandardClassnames: schema().suppressStandardClassnames,
      leadingClassNames: [
        schema().getRuleClassname(rule(), { fieldData: fieldData() }),
        fieldData()?.className ?? '',
        ctx().operatorObject?.className ?? '',
      ],
      disabled: disabled(),
      muted: muted(),
      hasSubQuery: hasSubQuery(),
      validationClassName: getValidationClassNames(ctx().validationResult),
    })
  );

  const changeHandler =
    (prop: string): ChangeHandler =>
    (value, context) => {
      if (!disabled()) {
        p().actions.onPropChange(prop as never, value, path(), context);
      }
    };

  const cloneRule = stopPropagation((_event, context) => {
    if (!disabled()) {
      p().actions.moveRule(path(), [...getParentPath(path()), path().at(-1)! + 1], true, context);
    }
  });

  const toggleLockRule = stopPropagation((_event, context) => {
    p().actions.onPropChange('disabled', !disabled(), path(), context);
  });

  const toggleMuteRule = stopPropagation((_event, context) => {
    p().actions.onPropChange('muted', !rule().muted, path(), context);
  });

  const removeRule = stopPropagation(() => {
    if (!disabled()) p().actions.onRuleRemove(path());
  });

  const shiftRuleUp = stopPropagation((event, context) => {
    if (!disabled() && !p().shiftUpDisabled) {
      p().actions.moveRule(path(), 'up', event?.altKey, context);
    }
  });

  const shiftRuleDown = stopPropagation((event, context) => {
    if (!disabled() && !p().shiftDownDisabled) {
      p().actions.moveRule(path(), 'down', event?.altKey, context);
    }
  });

  // Hidden only when the sole configured field is the placeholder, which has an empty `value`.
  const showFieldSelector = createMemo(() => {
    const { fields } = schema();
    const only = fields[0];
    return !(fields.length === 1 && isPojo(only) && 'value' in only && only.value === '');
  });

  const showValueControls = createMemo(
    () =>
      (schema().autoSelectOperator ||
        rule().operator !== p().translations.operators?.placeholderName) &&
      !ctx().hideValueControls
  );

  const showValueSourceSelector = createMemo(
    () => !['null', 'notnull'].includes(lc(`${rule().operator}`)) && ctx().valueSources.length > 1
  );

  return {
    get ctx() {
      return ctx();
    },
    get disabled() {
      return disabled();
    },
    get muted() {
      return muted();
    },
    get classNames() {
      return classNames();
    },
    get outerClassName() {
      return outerClassName();
    },
    get fieldData() {
      return fieldData();
    },
    get valueEditorSeparator() {
      return valueEditorSeparator();
    },
    get hasSubQuery() {
      return hasSubQuery();
    },
    get showFieldSelector() {
      return showFieldSelector();
    },
    get showValueControls() {
      return showValueControls();
    },
    get showValueSourceSelector() {
      return showValueSourceSelector();
    },
    onChangeField: changeHandler('field'),
    onChangeOperator: changeHandler('operator'),
    onChangeMatchMode: changeHandler('match'),
    onChangeValueSource: changeHandler('valueSource'),
    onChangeValue: changeHandler('value'),
    cloneRule,
    toggleLockRule,
    toggleMuteRule,
    removeRule,
    shiftRuleUp,
    shiftRuleDown,
  };
};
