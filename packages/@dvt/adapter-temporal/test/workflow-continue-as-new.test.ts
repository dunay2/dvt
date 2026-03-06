import { describe, expect, it } from 'vitest';

import {
  buildStepStartedPayload,
  buildContinueAsNewInput,
  shouldTriggerContinueAsNew,
} from '../src/workflows/RunPlanWorkflow.js';

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
    });

    expect(nextInput.resumeFromLayerIndex).toBe(2);
    expect(nextInput.continuedAsNewCount).toBe(2);
    expect(nextInput.gatewayDecisions).toEqual({ gwA: true, gwB: false });
  });
});

describe('step started payload extraction', () => {
  it('extracts compiledCodeRef when shape is valid', () => {
    const payload = buildStepStartedPayload({
      stepId: 'model.orders',
      kind: 'dbt_model',
      stepTypeConfig: {
        compiledCodeRef: {
          sha256: 'abc123',
          storageUri: 's3://compiled-sql/abc123.sql',
          sizeBytes: 128,
          encoding: 'utf-8',
        },
      },
    });

    expect(payload).toEqual({
      compiledCodeRef: {
        sha256: 'abc123',
        storageUri: 's3://compiled-sql/abc123.sql',
        sizeBytes: 128,
        encoding: 'utf-8',
      },
    });
  });

  it('returns undefined when compiledCodeRef is absent', () => {
    const payload = buildStepStartedPayload({
      stepId: 'model.orders',
      kind: 'dbt_model',
    });

    expect(payload).toBeUndefined();
  });

  it('returns undefined when compiledCodeRef is invalid', () => {
    const payload = buildStepStartedPayload({
      stepId: 'model.orders',
      kind: 'dbt_model',
      stepTypeConfig: {
        compiledCodeRef: {
          sha256: 'abc123',
          storageUri: 's3://compiled-sql/abc123.sql',
          sizeBytes: -1,
          encoding: 'utf16',
        },
      },
    });

    expect(payload).toBeUndefined();
  });
});
