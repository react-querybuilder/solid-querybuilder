/**
 * The mutation operation DSL and a `QueryManager` interpreter for it, ported from
 * `utils/testing/queryFixtures.ts` upstream.
 *
 * Shared by `actions.test.ts` (which replays through a bare manager) and
 * `actions.solid.test.ts` (which replays through the manager `createQueryBuilder` builds).
 */

import type {
  AbortInfo,
  AbortReason,
  MatchModeOptions,
  Path,
  RuleGroupTypeAny,
  RuleType,
  UpdateableProperties,
  ValueSourceFullOptions,
} from '@react-querybuilder/core';
import { QueryManager, strictAbortReasons } from '@react-querybuilder/core';

export type Op =
  | { kind: 'add'; ruleOrGroup: RuleGroupTypeAny | RuleType; parent: Path | string }
  | { kind: 'update'; prop: UpdateableProperties; value: unknown; target: Path | string }
  | { kind: 'remove'; target: Path | string }
  | { kind: 'move'; from: Path | string; to: Path | 'up' | 'down'; clone?: boolean }
  | { kind: 'insert'; ruleOrGroup: RuleGroupTypeAny | RuleType; target: Path; replace?: boolean }
  | { kind: 'group'; from: Path | string; to: Path | string; clone?: boolean };

/** The guard options each sequence runs under. */
export interface RunOptions {
  respectDisabled?: boolean;
  queryDisabled?: boolean;
  disabledPaths?: Path[];
  maxLevels?: number;
}

export interface RunResult {
  query: RuleGroupTypeAny;
  aborts: (AbortReason | null)[];
  allAborts: AbortInfo[];
  refused: boolean[];
}

/** The shape of one recorded case in `actions.json`. */
export interface ActionCase {
  name: string;
  fixture: string;
  ops: Op[];
  options: RunOptions;
  expected: {
    query: RuleGroupTypeAny;
    aborts: (AbortReason | null)[];
    allAborts: AbortInfo[];
    refused: boolean[];
  };
}

const strictSet = new Set<AbortReason>(strictAbortReasons);

/**
 * The `update` resolvers every upstream interpreter is pinned to. A manager would otherwise
 * derive these from its `fields`/`getDefault*` options; the fixtures were generated with these
 * exact stubs, because the mutation and guard layers are what is under test, not option
 * resolution.
 */
const valueSources: ValueSourceFullOptions = [{ name: 'value', value: 'value', label: 'Value' }];

export const updateResolvers = {
  resetOnFieldChange: true,
  resetOnOperatorChange: false,
  getRuleDefaultOperator: (): string => '=',
  getValueSources: (): ValueSourceFullOptions => valueSources,
  getRuleDefaultValue: (): string => '',
  getMatchModes: (): MatchModeOptions => [],
};

/**
 * Upstream's three mutation implementations disagree on their *defaults* for `respectDisabled`,
 * so conformance runs always pass it explicitly.
 */
export const guardsOf = ({
  respectDisabled = true,
  queryDisabled = false,
  disabledPaths,
  maxLevels,
}: RunOptions): Required<Pick<RunOptions, 'respectDisabled' | 'queryDisabled'>> &
  Pick<RunOptions, 'disabledPaths' | 'maxLevels'> => ({
  respectDisabled,
  queryDisabled,
  disabledPaths,
  maxLevels,
});

// oxlint-disable-next-line typescript/no-explicit-any
type AnyManager = QueryManager<any, any, any, any>;

export const applyOp = (qm: AnyManager, op: Op): void => {
  switch (op.kind) {
    case 'add': {
      qm.add(op.ruleOrGroup as RuleType, op.parent);
      break;
    }
    case 'update': {
      qm.update(op.prop, op.value, op.target, updateResolvers);
      break;
    }
    case 'remove': {
      qm.remove(op.target);
      break;
    }
    case 'move': {
      qm.move(op.from, op.to, { clone: op.clone });
      break;
    }
    case 'insert': {
      qm.insert(op.ruleOrGroup as RuleType, op.target, { replace: op.replace });
      break;
    }
    case 'group': {
      qm.group(op.from, op.to, { clone: op.clone });
      break;
    }
  }
};

/**
 * Drives `ops` through a manager, collecting the three signals upstream's `runViaQueryManager`
 * collects. `makeManager` is injected so callers can supply either a bare manager or one built
 * by the port; when the manager cannot report aborts, `aborts`/`allAborts`/`refused` come back
 * empty of reasons and only `query` is meaningful.
 */
export const replay = (
  ops: readonly Op[],
  makeManager: (onInvalidTarget: (info: AbortInfo) => void) => AnyManager
): RunResult => {
  const aborts: (AbortReason | null)[] = [];
  const allAborts: AbortInfo[] = [];
  const refused: boolean[] = [];

  let opAborts: AbortInfo[] = [];
  const qm = makeManager(info => {
    opAborts.push(info);
    allAborts.push(info);
  });

  for (const op of ops) {
    opAborts = [];
    applyOp(qm, op);
    aborts.push(opAborts[0]?.reason ?? null);
    refused.push(opAborts.some(a => strictSet.has(a.reason)));
  }

  return { query: qm.getQuery(), aborts, allAborts, refused };
};
