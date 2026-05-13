import { beforeEach, describe, expect, it, vi } from 'vitest';

const { proxyActivitiesMock, proxyLocalActivitiesMock } = vi.hoisted(() => ({
  proxyActivitiesMock: vi.fn(() => ({
    executeStep: vi.fn(),
    emitEvent: vi.fn(),
    resolveExecutionSegment: vi.fn(),
  })),
  proxyLocalActivitiesMock: vi.fn(() => ({
    emitEvent: vi.fn(),
  })),
}));

vi.mock('@temporalio/workflow', () => ({
  ActivityCancellationType: {
    TRY_CANCEL: 'TRY_CANCEL',
    WAIT_CANCELLATION_COMPLETED: 'WAIT_CANCELLATION_COMPLETED',
  },
  proxyActivities: proxyActivitiesMock,
  proxyLocalActivities: proxyLocalActivitiesMock,
}));

import { createStepActivities } from '../src/workflows/runPlanWorkflow.activities.js';

describe('workflow step activity routing', () => {
  beforeEach(() => {
    proxyActivitiesMock.mockClear();
    proxyLocalActivitiesMock.mockClear();
  });

  it('schedules routed step kinds on their configured activity task queue', () => {
    createStepActivities(
      { stepId: 's-python', kind: 'PYTHON_SCRIPT' },
      {
        routesByStepKind: {
          PYTHON_SCRIPT: {
            capability: 'executor.python',
            taskQueue: 'dvt-temporal-python',
          },
        },
      }
    );

    expect(proxyActivitiesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        taskQueue: 'dvt-temporal-python',
      })
    );
  });

  it('keeps unrouted step kinds on the workflow task queue default', () => {
    createStepActivities(
      { stepId: 's-sql', kind: 'POSTGRES_SQL_TRANSFORM' },
      {
        routesByStepKind: {
          PYTHON_SCRIPT: {
            capability: 'executor.python',
            taskQueue: 'dvt-temporal-python',
          },
        },
      }
    );

    expect(proxyActivitiesMock).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        taskQueue: expect.any(String),
      })
    );
  });
});
