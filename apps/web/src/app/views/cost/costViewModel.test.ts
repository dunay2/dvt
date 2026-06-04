import { describe, expect, it } from 'vitest';

import type { CostAttributionSummary } from '../../ports/cost';
import { buildCostViewModel, formatDurationMs, formatMoneyAmount } from './costViewModel';

function buildSummary(overrides: Partial<CostAttributionSummary> = {}): CostAttributionSummary {
  return {
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    runCount: 1,
    completedStepCount: 1,
    failedStepCount: 1,
    totalStepDurationMs: 1500,
    totalCostAmount: null,
    currency: null,
    costCaptureStatus: 'unavailable',
    observedWindow: {
      firstEventAt: '2026-05-31T10:00:00.000Z',
      lastEventAt: '2026-05-31T10:01:00.000Z',
    },
    runs: [
      {
        runId: 'run-1',
        projectId: 'project-1',
        environmentId: 'env-1',
        planId: 'plan-1',
        planVersion: '1.0.0',
        status: 'COMPLETED',
        completedStepCount: 1,
        failedStepCount: 1,
        totalStepDurationMs: 1500,
        costAmount: null,
        currency: null,
      },
    ],
    steps: [
      {
        runId: 'run-1',
        stepId: 'step-fast',
        eventType: 'StepCompleted',
        durationMs: 500,
        costAmount: null,
        currency: null,
      },
      {
        runId: 'run-1',
        stepId: 'step-slow-failed',
        eventType: 'StepFailed',
        durationMs: 1000,
        costAmount: null,
        currency: null,
      },
    ],
    nextCursor: null,
    ...overrides,
  };
}

describe('costViewModel', () => {
  it('builds usage facts from the runtime cost attribution summary', () => {
    const model = buildCostViewModel(buildSummary());

    expect(model.totalCostLabel).toBe('Unavailable');
    expect(model.monetaryCaptureAvailable).toBe(false);
    expect(model.costCaptureStatus).toBe('unavailable');
    expect(model.runCount).toBe(1);
    expect(model.completedStepCount).toBe(1);
    expect(model.failedStepCount).toBe(1);
    expect(model.stepsWithUsageCount).toBe(2);
    expect(model.totalDurationSeconds).toBe(1.5);
    expect(model.costByModel[0]?.name).toBe('step-slow-failed');
    expect(model.costAlerts).toHaveLength(1);
    expect(model.durationByRun).toEqual([{ name: 'run-1', duration: 1.5 }]);
  });

  it('keeps monetary capture unavailable instead of formatting fake dollars', () => {
    expect(formatMoneyAmount(null, null)).toBe('Unavailable');
    expect(buildCostViewModel(buildSummary()).totalCostLabel).toBe('Unavailable');
  });

  it('handles an absent summary as an empty unavailable state', () => {
    const model = buildCostViewModel(null);

    expect(model.totalCostLabel).toBe('Unavailable');
    expect(model.runCount).toBe(0);
    expect(model.stepsWithUsageCount).toBe(0);
    expect(model.costByModel).toEqual([]);
    expect(model.observedWindowLabel).toBe('No runtime events observed');
  });

  it('formats duration in seconds for runtime usage rows', () => {
    expect(formatDurationMs(1234)).toBe('1.2s');
  });

  it('keeps render row identifiers unique across repeated terminal step attempts', () => {
    const repeatedFailedStep = {
      runId: 'run-1',
      stepId: 'retrying-step',
      eventType: 'StepFailed' as const,
      durationMs: 1000,
      costAmount: null,
      currency: null,
    };
    const model = buildCostViewModel(
      buildSummary({
        failedStepCount: 2,
        steps: [
          repeatedFailedStep,
          {
            ...repeatedFailedStep,
            durationMs: 1250,
          },
        ],
      })
    );

    expect(new Set(model.costByModel.map((driver) => driver.id)).size).toBe(
      model.costByModel.length
    );
    expect(new Set(model.costAlerts.map((alert) => alert.id)).size).toBe(model.costAlerts.length);
  });
});
