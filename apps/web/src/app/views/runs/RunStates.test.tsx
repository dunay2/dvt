// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';

import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';
import type { RunSummaryItem } from '../../ports/runs';
import type { RunEvent } from '../../types/engine';
import {
  RunDetailErrorState,
  RunListState,
  RunNotFoundState,
  RunWorkspaceState,
} from './RunStates';

function buildSummary(overrides?: Partial<RunSummaryItem>): RunSummaryItem {
  return {
    runId: 'run_123',
    planId: 'plan_123',
    status: 'running',
    environment: 'dev',
    gitSha: 'abc123def',
    startedAt: '2026-03-28T10:00:00Z',
    ...overrides,
  };
}

function buildStepStartedEvent(overrides?: Partial<RunEvent>): RunEvent {
  return {
    eventId: 'evt-step-started',
    eventType: 'StepStarted' as const,
    runId: 'run_123',
    emittedAt: '2026-03-28T10:01:00Z',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    planId: 'plan_123',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: 'id-1',
    payloadVersion: 1 as const,
    stepId: 'step-1',
    runSeq: 1,
    persistedAt: '2026-03-28T10:01:00Z',
    ...overrides,
  } as RunEvent;
}

function buildWorkspace(
  overrides?: Partial<RunWorkspaceViewModel>,
  timelineOverrides?: Partial<RunWorkspaceViewModel['timeline']>
): RunWorkspaceViewModel {
  const timeline = {
    state: 'available',
    events: [buildStepStartedEvent()],
    ...timelineOverrides,
  } as RunWorkspaceViewModel['timeline'];

  return {
    runId: 'run_123',
    snapshot: {
      runId: 'run_123',
      status: 'running',
      startedAt: '2026-03-28T10:00:00Z',
      environment: 'dev',
      gitSha: 'abc123def',
      substatus: 'WAITING_APPROVAL',
      execution: {
        activeStepId: 'step-transform',
      },
    },
    timeline,
    detailState: 'snapshot-plus-events',
    ...overrides,
  };
}

describe('RunStates', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the run list with status, git sha and environment metadata', async () => {
    const runs = [
      buildSummary(),
      buildSummary({
        runId: 'run_456',
        status: 'failed',
        gitSha: 'zzz999yyy',
        environment: 'prod',
      }),
    ];

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunListState runs={runs} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Runs');
    expect(container.textContent).toContain('Run run_123');
    expect(container.textContent).toContain('Run run_456');
    expect(container.textContent).toContain('running');
    expect(container.textContent).toContain('failed');
    expect(container.textContent).toContain('abc123def');
    expect(container.textContent).toContain('zzz999yyy');
    expect(container.textContent).toContain('Environment: dev');
    expect(container.textContent).toContain('Environment: prod');
    expect(container.textContent).toContain('View Details');
  });

  it('renders snapshot-only run detail state', async () => {
    const workspace = buildWorkspace(
      {
        detailState: 'snapshot-only',
      },
      {
        state: 'empty',
        events: [],
      }
    );

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunWorkspaceState workspace={workspace} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('snapshot-only');
    expect(container.textContent).toContain('No runtime events are available yet for this run.');
    expect(container.textContent).toContain('Runtime snapshot');
    expect(container.textContent).toContain('Current step');
    expect(container.textContent).toContain('step-transform');
  });

  it('renders snapshot-plus-events run detail state', async () => {
    const workspace = buildWorkspace();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunWorkspaceState workspace={workspace} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('snapshot+timeline');
    expect(container.textContent).toContain('StepStarted');
    expect(container.textContent).toContain('Step: step-1');
    expect(container.textContent).toContain(
      'Result evidence is not available yet for this run snapshot.'
    );
  });

  it('renders materialization evidence and failure diagnostics when available', async () => {
    const workspace = buildWorkspace({
      snapshot: {
        runId: 'run_123',
        status: 'failed',
        startedAt: '2026-03-28T10:00:00Z',
        completedAt: '2026-03-28T10:00:30Z',
        environment: 'dev',
        gitSha: 'abc123def',
        execution: {
          failure: {
            stepId: 'step-transform',
            reason: 'STEP_FAILURE',
            message: 'duplicate key value violates unique constraint',
            failedAt: '2026-03-28T10:00:20Z',
          },
          materialization: {
            executor: 'postgres',
            environmentId: 'env-1',
            sinkTable: 'analytics.orders_daily',
            rowsWritten: 42,
            startedAt: '2026-03-28T10:00:05Z',
            completedAt: '2026-03-28T10:00:25Z',
            durationMs: 20000,
          },
        },
      },
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunWorkspaceState workspace={workspace} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Materialization evidence');
    expect(container.textContent).toContain('postgres');
    expect(container.textContent).toContain('analytics.orders_daily');
    expect(container.textContent).toContain('42');
    expect(container.textContent).toContain('Failure diagnostics');
    expect(container.textContent).toContain('step-transform');
    expect(container.textContent).toContain('STEP_FAILURE');
  });

  it('does not render materialization evidence from timeline payload when snapshot omits it', async () => {
    const workspace = buildWorkspace(
      {
        snapshot: {
          runId: 'run_123',
          status: 'completed',
          startedAt: '2026-03-28T10:00:00Z',
          completedAt: '2026-03-28T10:00:30Z',
          environment: 'dev',
          gitSha: 'abc123def',
          execution: undefined,
        },
      },
      {
        state: 'available',
        events: [
          {
            eventId: 'evt-run-completed',
            eventType: 'RunCompleted',
            runId: 'run_123',
            emittedAt: '2026-03-28T10:00:30Z',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            planId: 'plan_123',
            planVersion: '1.0.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'id-run-completed',
            payloadVersion: 1,
            runSeq: 8,
            persistedAt: '2026-03-28T10:00:30Z',
            payload: {
              materialization: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'analytics.daily_sales',
                rowsWritten: 1284,
                startedAt: '2026-03-28T10:00:05Z',
                completedAt: '2026-03-28T10:00:28Z',
                durationMs: 23000,
              },
            },
          } as RunEvent,
        ],
      }
    );

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunWorkspaceState workspace={workspace} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Materialization evidence');
    expect(container.textContent).toContain(
      'Result evidence is not available yet for this run snapshot.'
    );
    expect(container.textContent).not.toContain('analytics.daily_sales');
    expect(container.textContent).not.toMatch(/1,?284/);
  });

  it('ignores stale prior-attempt diagnostics and materialization when a newer attempt completed', async () => {
    const workspace = buildWorkspace(
      {
        snapshot: {
          runId: 'run_123',
          status: 'completed',
          startedAt: '2026-03-28T10:00:00Z',
          completedAt: '2026-03-28T10:00:30Z',
          environment: 'dev',
          gitSha: 'abc123def',
          failedStepId: undefined,
          errorReason: undefined,
          currentStepId: undefined,
          materialization: undefined,
        },
      },
      {
        state: 'available',
        events: [
          {
            eventId: 'evt-old-step-failed',
            eventType: 'StepFailed',
            runId: 'run_123',
            emittedAt: '2026-03-28T10:00:10Z',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            planId: 'plan_123',
            planVersion: '1.0.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'id-old-step-failed',
            payloadVersion: 1,
            stepId: 'step-old',
            runSeq: 3,
            persistedAt: '2026-03-28T10:00:10Z',
            payload: {
              reason: 'OLD_ATTEMPT_FAILURE',
            },
          } as RunEvent,
          {
            eventId: 'evt-old-run-completed',
            eventType: 'RunCompleted',
            runId: 'run_123',
            emittedAt: '2026-03-28T10:00:12Z',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            planId: 'plan_123',
            planVersion: '1.0.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'id-old-run-completed',
            payloadVersion: 1,
            runSeq: 4,
            persistedAt: '2026-03-28T10:00:12Z',
            payload: {
              resultEvidence: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'analytics.old_attempt',
                rowsWritten: 42,
                startedAt: '2026-03-28T10:00:05Z',
                completedAt: '2026-03-28T10:00:12Z',
                durationMs: 7000,
              },
            },
          } as RunEvent,
          {
            eventId: 'evt-current-run-started',
            eventType: 'RunStarted',
            runId: 'run_123',
            emittedAt: '2026-03-28T10:00:20Z',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            planId: 'plan_123',
            planVersion: '1.0.0',
            engineAttemptId: 2,
            logicalAttemptId: 2,
            idempotencyKey: 'id-current-run-started',
            payloadVersion: 1,
            runSeq: 5,
            persistedAt: '2026-03-28T10:00:20Z',
            payload: {
              executor: 'postgres',
            },
          } as RunEvent,
          {
            eventId: 'evt-current-run-completed',
            eventType: 'RunCompleted',
            runId: 'run_123',
            emittedAt: '2026-03-28T10:00:30Z',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            planId: 'plan_123',
            planVersion: '1.0.0',
            engineAttemptId: 2,
            logicalAttemptId: 2,
            idempotencyKey: 'id-current-run-completed',
            payloadVersion: 1,
            runSeq: 6,
            persistedAt: '2026-03-28T10:00:30Z',
            payload: {
              executor: 'postgres',
            },
          } as RunEvent,
        ],
      }
    );

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunWorkspaceState workspace={workspace} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).not.toContain('Failure diagnostics');
    expect(container.textContent).not.toContain('OLD_ATTEMPT_FAILURE');
    expect(container.textContent).not.toContain('analytics.old_attempt');
    expect(container.textContent).toContain(
      'Result evidence is not available yet for this run snapshot.'
    );
  });

  it('renders execution provenance from step-started artifact refs', async () => {
    const workspace = buildWorkspace(undefined, {
      state: 'available',
      events: [
        buildStepStartedEvent({
          stepId: 'step-transform',
          payload: {
            stepArtifactRef: {
              artifactKind: 'dbt.compiled-sql',
              storageUri: 's3://dvt-artifacts/dev/compiled/orders_daily.sql',
              sha256: 'a'.repeat(64),
              sizeBytes: 2048,
              encoding: 'utf-8',
            },
          },
        }),
        buildStepStartedEvent({
          eventId: 'evt-step-started-2',
          stepId: 'step-evidence',
          payload: {
            compiledCodeRef: {
              storageUri: 's3://dvt-artifacts/dev/compiled/evidence.sql',
              sha256: 'b'.repeat(64),
              sizeBytes: 128,
              encoding: 'utf-8',
            },
          },
        }),
      ],
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunWorkspaceState workspace={workspace} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Execution provenance');
    expect(container.textContent).toContain('step-transform');
    expect(container.textContent).toContain('dbt.compiled-sql');
    expect(container.textContent).toContain('s3://dvt-artifacts/dev/compiled/orders_daily.sql');
    expect(container.textContent).toContain(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
    expect(container.textContent).toContain('2.0 KB');
    expect(container.textContent).toContain('step-evidence');
    expect(container.textContent).toContain('compiled-code');
    expect(container.textContent).toContain('s3://dvt-artifacts/dev/compiled/evidence.sql');
  });

  it('does not render failure diagnostics from timeline events when snapshot omits them', async () => {
    const workspace = buildWorkspace(
      {
        snapshot: {
          runId: 'run_123',
          status: 'failed',
          startedAt: '2026-03-28T10:00:00Z',
          completedAt: '2026-03-28T10:00:30Z',
          environment: 'dev',
          gitSha: 'abc123def',
          execution: undefined,
        },
      },
      {
        state: 'available',
        events: [
          {
            eventId: 'evt-step-failed',
            eventType: 'StepFailed',
            runId: 'run_123',
            emittedAt: '2026-03-28T10:00:20Z',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            planId: 'plan_123',
            planVersion: '1.0.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'id-step-failed',
            payloadVersion: 1,
            stepId: 'step-load',
            runSeq: 5,
            persistedAt: '2026-03-28T10:00:20Z',
            payload: {
              reason: 'SINK_WRITE_FAILED',
            },
          },
        ],
      }
    );

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunWorkspaceState workspace={workspace} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).not.toContain('Failure diagnostics');
    expect(container.textContent).not.toContain('SINK_WRITE_FAILED');
    expect(container.textContent).toContain('Event timeline');
    expect(container.textContent).toContain('Step: step-load');
  });

  it('uses the latest logical attempt when falling back to failure diagnostics', async () => {
    const workspace = buildWorkspace(
      {
        snapshot: {
          runId: 'run_123',
          status: 'failed',
          startedAt: '2026-03-28T10:00:00Z',
          completedAt: '2026-03-28T10:00:30Z',
          environment: 'dev',
          gitSha: 'abc123def',
          failedStepId: undefined,
          errorReason: undefined,
          currentStepId: undefined,
          materialization: undefined,
        },
      },
      {
        state: 'available',
        events: [
          {
            eventId: 'evt-old-step-failed',
            eventType: 'StepFailed',
            runId: 'run_123',
            emittedAt: '2026-03-28T10:00:10Z',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            planId: 'plan_123',
            planVersion: '1.0.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'id-old-step-failed',
            payloadVersion: 1,
            stepId: 'step-old',
            runSeq: 3,
            persistedAt: '2026-03-28T10:00:10Z',
            payload: {
              reason: 'OLD_ATTEMPT_FAILURE',
            },
          } as RunEvent,
          {
            eventId: 'evt-current-step-failed',
            eventType: 'StepFailed',
            runId: 'run_123',
            emittedAt: '2026-03-28T10:00:25Z',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            planId: 'plan_123',
            planVersion: '1.0.0',
            engineAttemptId: 2,
            logicalAttemptId: 2,
            idempotencyKey: 'id-current-step-failed',
            payloadVersion: 1,
            stepId: 'step-current',
            runSeq: 6,
            persistedAt: '2026-03-28T10:00:25Z',
            payload: {
              reason: 'CURRENT_ATTEMPT_FAILURE',
            },
          } as RunEvent,
        ],
      }
    );

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunWorkspaceState workspace={workspace} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Failure diagnostics');
    expect(container.textContent).toContain('step-current');
    expect(container.textContent).toContain('CURRENT_ATTEMPT_FAILURE');
    expect(container.textContent).not.toContain('OLD_ATTEMPT_FAILURE');
  });

  it('renders error and not-found states', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <>
            <RunDetailErrorState runId="run_500" message="Runtime service is unavailable" />
            <RunNotFoundState runId="run_missing" />
          </>
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Run workspace unavailable');
    expect(container.textContent).toContain('Runtime service is unavailable');
    expect(container.textContent).toContain('Run not found');
    expect(container.textContent).toContain('run_missing');
  });
});
