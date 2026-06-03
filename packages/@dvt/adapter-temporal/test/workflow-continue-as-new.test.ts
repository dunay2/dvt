import { describe, expect, it } from 'vitest';

import { parseWorkflowControlInput } from '../src/workflows/runPlanWorkflow.state.js';
import {
  buildContinueAsNewInput,
  shouldTriggerContinueAsNew,
} from '../src/workflows/workflowCursorHelpers.js';
import {
  resolveGatewayDependencyContext,
  validateGatewayDependencies,
} from '../src/workflows/workflowGatewayHelpers.js';
import { parseOptionalNonNegativeInt } from '../src/workflows/workflowInputParsingHelpers.js';

import { createPlanRef, createResolvedRunContext } from './helpers/contractFixtures.js';

const BASE_INPUT = {
  planRef: createPlanRef({
    uri: 'file://plan.json',
    sha256: 'a'.repeat(64),
    planId: 'plan-1',
  }),
  ctx: createResolvedRunContext({
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'e1',
    runId: 'r1',
  }),
  maxContinueAsNewPayloadBytes: 1_000_000,
  continueAsNewAfterLayerCount: 3,
  stepActivityRouting: {
    routesByStepKind: {
      PYTHON_SCRIPT: {
        capability: 'executor.python',
        taskQueue: 'dvt-temporal-python',
      },
    },
  },
};

type ContinueAsNewTriggerArgs = Parameters<typeof shouldTriggerContinueAsNew>[0];
type ContinueAsNewBuildArgs = Parameters<typeof buildContinueAsNewInput<typeof BASE_INPUT>>[0];
type ContinueAsNewBuildOverrides = Omit<
  ContinueAsNewBuildArgs,
  | 'input'
  | 'maxContinueAsNewPayloadBytes'
  | 'continueAsNewAfterLayerCount'
  | 'nextLayerIndex'
  | 'continuedAsNewCount'
>;
type ContinueAsNewTestOverrides = ContinueAsNewBuildOverrides & {
  maxContinueAsNewPayloadBytes?: number;
};
type ContinueAsNewBuildResult = ReturnType<typeof buildContinueAsNewInput<typeof BASE_INPUT>>;

const CONTINUE_AS_NEW_TRIGGER_CASES: Array<{
  name: string;
  input: ContinueAsNewTriggerArgs;
  expected: boolean;
}> = [
  {
    name: 'does not trigger when threshold is disabled',
    input: {
      continueAsNewAfterLayerCount: 0,
      processedLayersInCurrentExecution: 100,
      nextLayerIndex: 100,
      totalLayerCount: 200,
    },
    expected: false,
  },
  {
    name: 'does not trigger below threshold',
    input: {
      continueAsNewAfterLayerCount: 3,
      processedLayersInCurrentExecution: 2,
      nextLayerIndex: 2,
      totalLayerCount: 10,
    },
    expected: false,
  },
  {
    name: 'triggers exactly at threshold when there are pending layers',
    input: {
      continueAsNewAfterLayerCount: 3,
      processedLayersInCurrentExecution: 3,
      nextLayerIndex: 3,
      totalLayerCount: 10,
    },
    expected: true,
  },
  {
    name: 'does not trigger when no pending layers remain',
    input: {
      continueAsNewAfterLayerCount: 3,
      processedLayersInCurrentExecution: 3,
      nextLayerIndex: 3,
      totalLayerCount: 3,
    },
    expected: false,
  },
];

const CONTINUE_AS_NEW_ROLLOVER_CASES: Array<{
  name: string;
  overrides: ContinueAsNewBuildOverrides;
  assert(nextInput: ContinueAsNewBuildResult): void;
}> = [
  {
    name: 'carries gatewayDecisions across continue-as-new rollover',
    overrides: {
      gatewayDecisions: {
        gwA: true,
        gwB: false,
      },
      gatewayDependencyFacts: {},
      latestResultEvidence: undefined,
      skippedStepIds: new Set(['skipped-step']),
      processedControlSignalIds: new Set<string>(),
    },
    assert(nextInput) {
      expect(nextInput.cursor).toEqual({
        nextLayerIndex: 2,
        continuedAsNewCount: 2,
        gatewayDecisions: { gwA: true, gwB: false },
        gatewayDependencyFacts: {},
        skippedStepIds: ['skipped-step'],
        processedControlSignalIds: [],
      });
      expect(nextInput).not.toHaveProperty('nextLayerIndex');
      expect(nextInput).not.toHaveProperty('continuedAsNewCount');
      expect(nextInput).not.toHaveProperty('gatewayDecisions');
      expect(nextInput).not.toHaveProperty('skippedStepIds');
      expect(nextInput.planRef.planId).toBe('plan-1');
      expect(nextInput.stepActivityRouting).toEqual(BASE_INPUT.stepActivityRouting);
    },
  },
  {
    name: 'carries compact gateway dependency facts across continue-as-new rollover',
    overrides: {
      gatewayDecisions: {
        gwA: true,
      },
      gatewayDependencyFacts: {
        's-1': { stepId: 's-1', status: 'COMPLETED', gatewayDecision: true, approval: 'yes' },
      },
      latestResultEvidence: undefined,
      skippedStepIds: new Set(['skipped-step']),
      processedControlSignalIds: new Set<string>(),
    },
    assert(nextInput) {
      expect(nextInput.cursor?.gatewayDependencyFacts).toEqual({
        's-1': { stepId: 's-1', status: 'COMPLETED', gatewayDecision: true, approval: 'yes' },
      });
      expect(nextInput).not.toHaveProperty('completedStepResults');
    },
  },
  {
    name: 'carries processed control-signal ids across continue-as-new rollover',
    overrides: {
      gatewayDecisions: {},
      gatewayDependencyFacts: {},
      latestResultEvidence: undefined,
      skippedStepIds: new Set<string>(),
      processedControlSignalIds: new Set(['sig-pause-1', 'sig-resume-1']),
    },
    assert(nextInput) {
      expect(nextInput.cursor?.processedControlSignalIds).toEqual(['sig-pause-1', 'sig-resume-1']);
      expect(nextInput).not.toHaveProperty('processedControlSignalIds');
    },
  },
];

describe('continue-as-new policy', () => {
  it.each(CONTINUE_AS_NEW_TRIGGER_CASES)('$name', ({ input, expected }) => {
    expect(shouldTriggerContinueAsNew(input)).toBe(expected);
  });

  it.each(CONTINUE_AS_NEW_ROLLOVER_CASES)('$name', ({ overrides, assert }) => {
    assert(buildContinueAsNewTestInput(overrides));
  });

  it('fails closed when continue-as-new cursor state exceeds the bounded payload limit', () => {
    expect(() =>
      buildContinueAsNewTestInput({
        maxContinueAsNewPayloadBytes: 1_024,
        gatewayDecisions: {},
        gatewayDependencyFacts: {},
        latestResultEvidence: undefined,
        skippedStepIds: new Set(
          Array.from({ length: 4_000 }, (_, index) => `skipped-step-${index}-${'x'.repeat(64)}`)
        ),
        processedControlSignalIds: new Set(
          Array.from({ length: 4_000 }, (_, index) => `control-signal-${index}-${'y'.repeat(64)}`)
        ),
      })
    ).toThrow('TEMPORAL_CONTINUE_AS_NEW_PAYLOAD_TOO_LARGE');
  });

  it('retains only the bounded recent control-signal ids across continue-as-new rollover', () => {
    const nextInput = buildContinueAsNewTestInput({
      gatewayDecisions: {},
      gatewayDependencyFacts: {},
      latestResultEvidence: undefined,
      skippedStepIds: new Set<string>(),
      processedControlSignalIds: new Set(
        Array.from({ length: 300 }, (_, index) => `control-signal-${index}`)
      ),
    });

    expect(nextInput.cursor?.processedControlSignalIds).toHaveLength(256);
    expect(nextInput.cursor?.processedControlSignalIds.at(0)).toBe('control-signal-44');
    expect(nextInput.cursor?.processedControlSignalIds.at(-1)).toBe('control-signal-299');
  });
});

describe('workflow input parsing', () => {
  it('rejects missing continue-as-new threshold instead of silently disabling rollover', () => {
    expect(() =>
      parseWorkflowControlInput({
        planRef: BASE_INPUT.planRef,
        ctx: BASE_INPUT.ctx,
        maxContinueAsNewPayloadBytes: BASE_INPUT.maxContinueAsNewPayloadBytes,
      })
    ).toThrow('INVALID_WORKFLOW_INPUT: continueAsNewAfterLayerCount_must_be_non_negative_integer');
  });

  it('defaults undefined to zero', () => {
    expect(parseOptionalNonNegativeInt(undefined, 'nextLayerIndex')).toBe(0);
  });

  it('accepts integer numeric string', () => {
    expect(parseOptionalNonNegativeInt('3', 'continuedAsNewCount')).toBe(3);
  });

  it('throws for invalid value', () => {
    expect(() => parseOptionalNonNegativeInt('abc', 'nextLayerIndex')).toThrow(
      'INVALID_WORKFLOW_INPUT: nextLayerIndex_must_be_non_negative_integer'
    );
  });
});

describe('gateway dependency validation', () => {
  const gatewayStep = (args: {
    stepId: string;
    dependsOn?: string[];
  }): {
    stepId: string;
    type: 'gateway';
    dependsOn?: string[];
    gateway: { dslVersion: '1.0'; expression: string };
  } => ({
    stepId: args.stepId,
    type: 'gateway',
    ...(args.dependsOn === undefined ? {} : { dependsOn: args.dependsOn }),
    gateway: { dslVersion: '1.0', expression: "status='COMPLETED'" },
  });

  it('accepts gateway with exactly one dependency', () => {
    expect(() =>
      validateGatewayDependencies([gatewayStep({ stepId: 'gw-1', dependsOn: ['s-1'] })])
    ).not.toThrow();
  });

  it.each([
    {
      name: 'rejects gateway without dependencies',
      step: gatewayStep({ stepId: 'gw-no-dep' }),
      expectedError: 'INVALID_PLAN_SCHEMA: gateway_dependsOn_exactly_one_required:gw-no-dep',
    },
    {
      name: 'rejects gateway with multiple dependencies',
      step: gatewayStep({ stepId: 'gw-multi-dep', dependsOn: ['s-1', 's-2'] }),
      expectedError: 'INVALID_PLAN_SCHEMA: gateway_dependsOn_exactly_one_required:gw-multi-dep',
    },
  ])('$name', ({ step, expectedError }) => {
    expect(() => validateGatewayDependencies([step])).toThrow(expectedError);
  });
});

function buildContinueAsNewTestInput(
  overrides: ContinueAsNewTestOverrides
): ContinueAsNewBuildResult {
  const { maxContinueAsNewPayloadBytes = BASE_INPUT.maxContinueAsNewPayloadBytes, ...buildArgs } =
    overrides;

  return buildContinueAsNewInput({
    input: BASE_INPUT,
    maxContinueAsNewPayloadBytes,
    continueAsNewAfterLayerCount: 3,
    nextLayerIndex: 2,
    continuedAsNewCount: 1,
    ...buildArgs,
  });
}

describe('gateway dependency context', () => {
  it('uses persisted dependency facts when available', () => {
    expect(
      resolveGatewayDependencyContext('s-1', {
        's-1': { stepId: 's-1', status: 'COMPLETED', gatewayDecision: true },
      })
    ).toEqual({ stepId: 's-1', status: 'COMPLETED', gatewayDecision: true });
  });

  it('fails closed when dependency fact is missing', () => {
    expect(() => resolveGatewayDependencyContext('s-missing', {})).toThrow(
      'INVALID_WORKFLOW_STATE: gateway_dependency_fact_missing:s-missing'
    );
  });
});
