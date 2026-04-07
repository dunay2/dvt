import { describe, expect, it } from 'vitest';

import {
  buildContinueAsNewInput,
  parseOptionalNonNegativeInt,
  resolveGatewayDependencyContext,
  shouldTriggerContinueAsNew,
  validateGatewayDependencies,
} from '../src/workflows/workflowHelpers.js';

describe('continue-as-new policy', () => {
  it('does not trigger when threshold is disabled', () => {
    expect(
      shouldTriggerContinueAsNew({
        continueAsNewAfterLayerCount: 0,
        processedLayersInCurrentExecution: 100,
        nextLayerIndex: 100,
        totalLayerCount: 200,
      })
    ).toBe(false);
  });

  it('does not trigger below threshold', () => {
    expect(
      shouldTriggerContinueAsNew({
        continueAsNewAfterLayerCount: 3,
        processedLayersInCurrentExecution: 2,
        nextLayerIndex: 2,
        totalLayerCount: 10,
      })
    ).toBe(false);
  });

  it('triggers exactly at threshold when there are pending layers', () => {
    expect(
      shouldTriggerContinueAsNew({
        continueAsNewAfterLayerCount: 3,
        processedLayersInCurrentExecution: 3,
        nextLayerIndex: 3,
        totalLayerCount: 10,
      })
    ).toBe(true);
  });

  it('does not trigger when no pending layers remain', () => {
    expect(
      shouldTriggerContinueAsNew({
        continueAsNewAfterLayerCount: 3,
        processedLayersInCurrentExecution: 3,
        nextLayerIndex: 3,
        totalLayerCount: 3,
      })
    ).toBe(false);
  });

  it('carries gatewayDecisions across continue-as-new rollover', () => {
    const nextInput = buildContinueAsNewInput({
      input: {
        planRef: {
          uri: 'file://plan.json',
          sha256: 'abc',
          schemaVersion: 'v1.0.0',
          planId: 'plan-1',
          planVersion: '1',
        },
        ctx: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          runId: 'r1',
          targetAdapter: 'temporal',
        },
      },
      continueAsNewAfterLayerCount: 3,
      nextLayerIndex: 2,
      continuedAsNewCount: 1,
      gatewayDecisions: {
        gwA: true,
        gwB: false,
      },
      skippedStepIds: new Set(['skipped-step']),
      processedControlSignalIds: new Set<string>(),
    });

    expect(nextInput.resumeFromLayerIndex).toBe(2);
    expect(nextInput.continuedAsNewCount).toBe(2);
    expect(nextInput.gatewayDecisions).toEqual({ gwA: true, gwB: false });
    expect(nextInput.skippedStepIds).toEqual(['skipped-step']);
    expect(nextInput.planRef.planId).toBe('plan-1');
  });

  it('carries completedStepResults across continue-as-new rollover', () => {
    const nextInput = buildContinueAsNewInput({
      input: {
        planRef: {
          uri: 'file://plan.json',
          sha256: 'abc',
          schemaVersion: 'v1.0.0',
          planId: 'plan-1',
          planVersion: '1',
        },
        ctx: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          runId: 'r1',
          targetAdapter: 'temporal',
        },
      },
      continueAsNewAfterLayerCount: 3,
      nextLayerIndex: 2,
      continuedAsNewCount: 1,
      gatewayDecisions: {
        gwA: true,
      },
      completedStepResults: {
        's-1': { stepId: 's-1', status: 'COMPLETED', gatewayDecision: true, approval: 'yes' },
      },
      skippedStepIds: new Set(['skipped-step']),
      processedControlSignalIds: new Set<string>(),
    });

    expect(nextInput.completedStepResults).toEqual({
      's-1': { stepId: 's-1', status: 'COMPLETED', gatewayDecision: true, approval: 'yes' },
    });
    expect(nextInput.completedStepResults).not.toBeUndefined();
  });

  it('carries processed control-signal ids across continue-as-new rollover', () => {
    const nextInput = buildContinueAsNewInput({
      input: {
        planRef: {
          uri: 'file://plan.json',
          sha256: 'abc',
          schemaVersion: 'v1.0.0',
          planId: 'plan-1',
          planVersion: '1',
        },
        ctx: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          runId: 'r1',
          targetAdapter: 'temporal',
        },
      },
      continueAsNewAfterLayerCount: 3,
      nextLayerIndex: 2,
      continuedAsNewCount: 1,
      gatewayDecisions: {},
      completedStepResults: {},
      skippedStepIds: new Set<string>(),
      processedControlSignalIds: new Set(['sig-pause-1', 'sig-resume-1']),
    });

    expect(nextInput.processedControlSignalIds).toEqual(['sig-pause-1', 'sig-resume-1']);
  });
});

describe('workflow input parsing', () => {
  it('defaults undefined to zero', () => {
    expect(parseOptionalNonNegativeInt(undefined, 'resumeFromLayerIndex')).toBe(0);
  });

  it('accepts integer numeric string', () => {
    expect(parseOptionalNonNegativeInt('3', 'continuedAsNewCount')).toBe(3);
  });

  it('throws for invalid value', () => {
    expect(() => parseOptionalNonNegativeInt('abc', 'resumeFromLayerIndex')).toThrow(
      'INVALID_WORKFLOW_INPUT: resumeFromLayerIndex_must_be_non_negative_integer'
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

describe('gateway dependency context', () => {
  it('uses persisted dependency facts when available', () => {
    expect(
      resolveGatewayDependencyContext('s-1', {
        's-1': { stepId: 's-1', status: 'COMPLETED', gatewayDecision: true },
      })
    ).toEqual({ stepId: 's-1', status: 'COMPLETED', gatewayDecision: true });
  });

  it('builds deterministic completed context when dependency fact is missing', () => {
    expect(resolveGatewayDependencyContext('s-missing', {})).toEqual({
      stepId: 's-missing',
      status: 'COMPLETED',
    });
  });
});
