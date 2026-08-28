import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseStartRunCommand,
  parseStartRunResult,
  START_RUN_BACKPRESSURE_CODE,
} from '../src/index.js';
import type { StartRunCommand } from '../src/index.js';

import {
  VALID_START_RUN_PLAN_REF_COMMAND_FIXTURE,
  VALID_START_RUN_PLANNER_BACKED_COMMAND_FIXTURE,
  VALID_START_RUN_RESULTS_FIXTURES,
} from './fixtures/start-run-boundary.fixtures.js';

const EXECUTION_CAPACITY_SYSTEM_BACKPRESSURE_CODES = [
  START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable,
  START_RUN_BACKPRESSURE_CODE.executionCapacityExhausted,
  START_RUN_BACKPRESSURE_CODE.executorUnavailable,
] as const;

describe('contracts: StartRun boundary', () => {
  it('parses the plan-ref startRun command shape', () => {
    const command: StartRunCommand = parseStartRunCommand(VALID_START_RUN_PLAN_REF_COMMAND_FIXTURE);

    expect(command.planRef?.uri).toBe('s3://plans/plan-1.json');
    expect(command.targetAdapter).toBe('temporal');
    expect(command.selection).toEqual({
      mode: 'explicit',
      nodeIds: ['model.analytics.orders'],
    });
  });

  it('parses the planner-backed startRun command shape', () => {
    const command = parseStartRunCommand(VALID_START_RUN_PLANNER_BACKED_COMMAND_FIXTURE);

    expect(command.planRef).toBeUndefined();
    expect(command.graphSource?.nodes).toHaveLength(1);
  });

  it('rejects retired planner environment input instead of silently ignoring it', () => {
    expect(() =>
      parseStartRunCommand({
        ...VALID_START_RUN_PLANNER_BACKED_COMMAND_FIXTURE,
        environment: {
          environmentId: 'prod',
          vars: { target_name: 'prod' },
        },
      })
    ).toThrow(ContractValidationError);
  });

  it.each(['conductor', 'mock'] as const)(
    'rejects startRun commands with unsupported target adapter %s',
    (targetAdapter) => {
      expect(() =>
        parseStartRunCommand({
          ...VALID_START_RUN_PLAN_REF_COMMAND_FIXTURE,
          targetAdapter,
        })
      ).toThrow(ContractValidationError);
    }
  );

  it('rejects startRun commands with blank selections', () => {
    expect(() =>
      parseStartRunCommand({
        ...VALID_START_RUN_PLAN_REF_COMMAND_FIXTURE,
        selection: {
          mode: 'explicit',
          nodeIds: ['model.analytics.orders', '   '],
        },
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects startRun commands that mix planRef and planner-backed fields', () => {
    expect(() =>
      parseStartRunCommand({
        ...VALID_START_RUN_PLAN_REF_COMMAND_FIXTURE,
        graphSource: VALID_START_RUN_PLANNER_BACKED_COMMAND_FIXTURE.graphSource,
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects startRun commands without planRef or graphSource', () => {
    expect(() =>
      parseStartRunCommand({
        runId: 'run-3',
        targetAdapter: 'temporal',
        selection: {
          mode: 'explicit',
          nodeIds: ['model.analytics.orders'],
        },
        policies: VALID_START_RUN_PLANNER_BACKED_COMMAND_FIXTURE.policies,
      })
    ).toThrow(ContractValidationError);
  });

  it.each(VALID_START_RUN_RESULTS_FIXTURES)('parses startRun result kind=$kind', (fixture) => {
    const result = parseStartRunResult(fixture);

    expect(result.kind).toBe(fixture.kind);
  });

  it.each(EXECUTION_CAPACITY_SYSTEM_BACKPRESSURE_CODES)(
    'parses execution-capacity system backpressure result code=%s',
    (code) => {
      const result = parseStartRunResult({
        kind: 'system_backpressure',
        accepted: false,
        code,
        retryAfterSeconds: 30,
      });

      expect(result).toEqual({
        kind: 'system_backpressure',
        accepted: false,
        code,
        retryAfterSeconds: 30,
      });
    }
  );

  it('rejects plan_rejected results with non-canonical rejection codes', () => {
    expect(() =>
      parseStartRunResult({
        kind: 'plan_rejected',
        accepted: false,
        code: 'PLAN_HASH_MISMATCH',
        reason: 'hash mismatch',
      })
    ).toThrow(ContractValidationError);
  });
});
