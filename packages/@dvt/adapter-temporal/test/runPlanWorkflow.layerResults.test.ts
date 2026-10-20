/**
 * @ownedConcern Complete layer outcome recording before global failure settlement.
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0004: Event Sourcing Strategy
 */
import type { MaterializationEvidence } from '@dvt/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyLayerResults } from '../src/workflows/runPlanWorkflow.layerResults.js';
import type { LayerStepExecution } from '../src/workflows/runPlanWorkflow.types.js';

import { createPlanRef, createResolvedRunContext, iso, nb } from './helpers/contractFixtures.js';

const { emitEvent } = vi.hoisted(() => ({ emitEvent: vi.fn() }));
vi.mock('../src/workflows/runPlanWorkflow.activities.js', () => ({
  eventActivities: { emitEvent },
}));

type LayerArgs = Parameters<typeof applyLayerResults>[0];

function outcome(stepId: string, failed = false): LayerStepExecution {
  const evidence: MaterializationEvidence = {
    executor: 'dbt',
    environmentId: nb('env-1'),
    sinkTable: nb(`analytics.${stepId}`),
    rowsWritten: 3,
    startedAt: iso('2026-10-15T00:00:00.000Z'),
    completedAt: iso('2026-10-15T00:00:01.000Z'),
    durationMs: 1000,
  };
  return {
    stepId,
    result: failed
      ? { stepId, status: 'FAILED', failureReason: 'DENIED', error: `failure-${stepId}` }
      : { stepId, status: 'COMPLETED', resultEvidence: evidence },
  };
}

function layerArgs(layerResults: LayerStepExecution[]): LayerArgs {
  return {
    layerResults,
    ctx: createResolvedRunContext({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      runId: 'run-1',
    }),
    planRef: createPlanRef({ uri: 'memory://plan', sha256: 'a'.repeat(64), planId: 'plan-1' }),
    state: {
      status: 'RUNNING',
      paused: false,
      cancelRequested: false,
      currentStepIndex: 4,
      continuedAsNewCount: 2,
    },
    runtime: {
      gatewayDependencyFacts: { obsolete: {} },
      skippedSteps: new Set(),
      completedSteps: 4,
      processedLayersInCurrentExecution: 1,
    },
    continuedAsNewCount: 2,
    runtimeExecutor: 'dbt',
    retainedGatewayDependencyStepIds: [],
  };
}

describe('confirmed layer outcome recording', () => {
  beforeEach(() => emitEvent.mockReset().mockResolvedValue(undefined));

  it.each([0, 1, 2])(
    'records every outcome before RunFailed when failure is at index %i',
    async (failedIndex) => {
      const results = ['a', 'b', 'c'].map((id, index) => outcome(id, index === failedIndex));
      const args = layerArgs(results);

      await expect(applyLayerResults(args)).resolves.toEqual({
        runId: args.ctx.runId,
        status: 'FAILED',
        continuedAsNewCount: 2,
      });

      expect(emitEvent.mock.calls.map(([event]) => [event.eventType, event.stepId])).toEqual([
        ...results.map(({ stepId, result }) => [
          result.status === 'COMPLETED' ? 'StepCompleted' : 'StepFailed',
          stepId,
        ]),
        ['RunFailed', undefined],
      ]);
      for (const { stepId, result } of results.filter(
        ({ result }) => result.status === 'COMPLETED'
      )) {
        expect(emitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            ctx: args.ctx,
            planRef: args.planRef,
            stepId,
            payload: { resultEvidence: result.resultEvidence },
          })
        );
      }
      expect(emitEvent).toHaveBeenLastCalledWith({
        ctx: args.ctx,
        planRef: args.planRef,
        eventType: 'RunFailed',
        payload: {
          reason: 'STEP_FAILURE',
          executor: 'dbt',
          message: `failure-${results[failedIndex]!.stepId}`,
        },
      });
      expect(args.runtime.completedSteps).toBe(6);
      expect(args.state.currentStepIndex).toBe(6);
      expect(args.state.status).toBe('FAILED');
      expect(args.runtime.gatewayDependencyFacts).toEqual({});
      expect(args.runtime.latestResultEvidence).toEqual(
        results.filter(({ result }) => result.status === 'COMPLETED').at(-1)!.result.resultEvidence
      );
    }
  );

  it('records all failures but uses the first plan-ordered failure for the one terminal', async () => {
    const args = layerArgs([outcome('a', true), outcome('b', true)]);
    await applyLayerResults(args);
    expect(emitEvent.mock.calls.map(([event]) => event.eventType)).toEqual([
      'StepFailed',
      'StepFailed',
      'RunFailed',
    ]);
    expect(emitEvent.mock.lastCall?.[0].payload.message).toBe('failure-a');
    expect(args.runtime.completedSteps).toBe(4);
    expect(args.runtime.latestResultEvidence).toBeUndefined();
  });

  it('retains gateway facts and the latest summary without settling a successful layer', async () => {
    const result = { ...outcome('a'), gatewayDecision: true };
    const args = layerArgs([result]);
    args.retainedGatewayDependencyStepIds = ['a'];
    await expect(applyLayerResults(args)).resolves.toBeNull();
    expect(emitEvent).toHaveBeenCalledTimes(1);
    expect(args.runtime.gatewayDependencyFacts).toEqual({
      a: expect.objectContaining({ status: 'COMPLETED', gatewayDecision: true }),
    });
    expect(args.runtime.completedSteps).toBe(5);
    expect(args.state.status).toBe('RUNNING');
  });

  it('does not emit a terminal or claim unrecorded completion when appending a sibling fails', async () => {
    const args = layerArgs([outcome('a', true), outcome('b')]);
    const unavailable = new Error('append unavailable');
    emitEvent.mockResolvedValueOnce(undefined).mockRejectedValueOnce(unavailable);
    await expect(applyLayerResults(args)).rejects.toBe(unavailable);
    expect(emitEvent.mock.calls.map(([event]) => event.eventType)).toEqual([
      'StepFailed',
      'StepCompleted',
    ]);
    expect(args.runtime.completedSteps).toBe(4);
    expect(args.runtime.latestResultEvidence).toBeUndefined();
    expect(args.state.status).toBe('RUNNING');
  });

  it('keeps acknowledged sibling evidence if the global terminal append fails', async () => {
    const results = [outcome('a', true), outcome('b')];
    const args = layerArgs(results);
    const unavailable = new Error('terminal append unavailable');
    emitEvent
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(unavailable);
    await expect(applyLayerResults(args)).rejects.toBe(unavailable);
    expect(args.runtime.latestResultEvidence).toEqual(results[1]!.result.resultEvidence);
    expect(args.runtime.completedSteps).toBe(5);
    expect(args.state.status).toBe('RUNNING');
  });

  it('prunes obsolete facts without fabricating events for an empty layer', async () => {
    const args = layerArgs([]);
    await expect(applyLayerResults(args)).resolves.toBeNull();
    expect(emitEvent).not.toHaveBeenCalled();
    expect(args.runtime.gatewayDependencyFacts).toEqual({});
    expect(args.runtime.completedSteps).toBe(4);
  });
});
