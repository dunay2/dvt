/**
 * @file packages/@dvt/adapter-temporal/test/workflow-step-activity-routing.test.ts
 * @ownedConcern Temporal workflow step activity task-queue routing coverage
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0057: Temporal Step Activity Routing By Capability
 * @decision Verify that only executeStep activity proxies receive capability task queues
 * @consequence Workflow/core activities stay on the workflow queue while step execution can route by capability
 * @version 1.0.0
 */
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
      { stepId: 's-dbt-test', kind: 'DBT_TEST' },
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

  it('waits for step cleanup before workflow cancellation can become terminal', () => {
    createStepActivities({ stepId: 's-dbt', kind: 'DBT_MODEL' });

    expect(proxyActivitiesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cancellationType: 'WAIT_CANCELLATION_COMPLETED',
        heartbeatTimeout: '10s',
      })
    );
  });
});
