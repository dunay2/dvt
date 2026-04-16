// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';

import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';
import type { RunSummaryItem } from '../../ports/runs';
import { iso, stepId } from '../../testing/contractTestUtils';
import type { RunEvent } from '../../types/engine';
import {
  RunDetailErrorState,
  RunDegradedState,
  RunListState,
  RunMissingState,
  RunsEmptyState,
  RunsErrorState,
  RunWorkspaceState,
} from './RunStates';

function buildSummary(overrides?: Partial<RunSummaryItem>): RunSummaryItem {
  return {
    runId: 'run_123',
    planId: 'plan_123',
    status: 'running',
    environment: 'dev',
    gitSha: 'abc123def',
    startedAt: '2026-03-28T10:00:00.000Z',
    ...overrides,
  };
}

type RunEventFixture = Partial<{
  eventId: string;
  eventType: RunEvent['eventType'];
  runId: string;
  emittedAt: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  idempotencyKey: string;
  payloadVersion: number;
  stepId: string;
  runSeq: number;
  persistedAt: string;
  payload: unknown;
}>;

function toRunEvent(event: Record<string, unknown>): RunEvent {
  return event as unknown as RunEvent;
}

function buildRunEvent(overrides: RunEventFixture = {}): RunEvent {
  return toRunEvent({
    eventId: overrides.eventId ?? 'evt-step-started',
    eventType: overrides.eventType ?? 'StepStarted',
    runId: overrides.runId ?? 'run_123',
    emittedAt: iso(overrides.emittedAt ?? '2026-03-28T10:01:00.000Z'),
    tenantId: overrides.tenantId ?? 'tenant-1',
    projectId: overrides.projectId ?? 'project-1',
    environmentId: overrides.environmentId ?? 'env-1',
    planId: overrides.planId ?? 'plan_123',
    planVersion: overrides.planVersion ?? '1.0.0',
    engineAttemptId: overrides.engineAttemptId ?? 1,
    logicalAttemptId: overrides.logicalAttemptId ?? 1,
    idempotencyKey: overrides.idempotencyKey ?? 'id-1',
    payloadVersion: overrides.payloadVersion ?? 1,
    ...(overrides.stepId === undefined
      ? { stepId: stepId('step-1') }
      : { stepId: stepId(overrides.stepId) }),
    runSeq: overrides.runSeq ?? 1,
    persistedAt: iso(overrides.persistedAt ?? overrides.emittedAt ?? '2026-03-28T10:01:00.000Z'),
    ...(overrides.payload === undefined ? {} : { payload: overrides.payload }),
  });
}

function buildStepStartedEvent(overrides?: Partial<RunEvent>): RunEvent {
  return buildRunEvent(overrides as RunEventFixture);
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
      startedAt: '2026-03-28T10:00:00.000Z',
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

  it('renders the governed empty state with canvas guidance', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunsEmptyState />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('No runs available');
    expect(container.textContent).toContain('Go to canvas to plan and start a run');
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
    expect(container.textContent).toContain('Runtime snapshot');
    expect(container.textContent).toContain('Event timeline');
    expect(container.textContent).toContain('StepStarted');
    expect(container.textContent).toContain('INFO');
    expect(container.textContent).toContain('Step started');
    expect(container.textContent).toContain('Step: step-1');
    expect(container.textContent).not.toContain('Console');
    expect(container.textContent).not.toContain('Materialization evidence');
    expect(container.textContent).not.toContain(
      'Result evidence is not available yet for this run snapshot.'
    );
  });

  it('renders persisted-plan and authoring provenance from snapshot fields', async () => {
    const workspace = buildWorkspace({
      snapshot: {
        runId: 'run_123',
        status: 'completed',
        startedAt: '2026-03-28T10:00:00.000Z',
        completedAt: '2026-03-28T10:00:30.000Z',
        environment: 'dev',
        gitSha: 'abc123def',
        provenance: {
          persistedPlan: {
            planRecordId: 'plan-record-1',
            planVersion: '1.0',
            sourceRef: 'plan://persisted/plan-record-1',
            canonicalPlanSha256: 'a'.repeat(64),
          },
          authoring: {
            graphArtifact: {
              repo: 'acme/warehouse',
              path: 'graphs/orders.flow.yaml',
              ref: 'refs/heads/main',
              commitSha: '1'.repeat(40),
              contentSha256: '2'.repeat(64),
            },
            sqlArtifact: {
              repo: 'acme/warehouse',
              path: 'models/orders_daily.sql',
              commitSha: '3'.repeat(40),
            },
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

    expect(container.textContent).toContain('Plan and authoring provenance');
    expect(container.textContent).toContain('plan-record-1');
    expect(container.textContent).toContain('plan://persisted/plan-record-1');
    expect(container.textContent).toContain(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
    expect(container.textContent).toContain('Graph artifact');
    expect(container.textContent).toContain('acme/warehouse:graphs/orders.flow.yaml');
    expect(container.textContent).toContain('SQL artifact');
    expect(container.textContent).toContain('acme/warehouse:models/orders_daily.sql');
  });

  it('renders materialization evidence for completed snapshots', async () => {
    const workspace = buildWorkspace({
      snapshot: {
        runId: 'run_123',
        status: 'completed',
        executor: 'postgres',
        startedAt: '2026-03-28T10:00:00.000Z',
        completedAt: '2026-03-28T10:00:30.000Z',
        environment: 'dev',
        gitSha: 'abc123def',
        execution: {
          materialization: {
            executor: 'postgres',
            environmentId: 'env-1',
            sinkTable: 'analytics.orders_daily',
            rowsWritten: 42,
            startedAt: '2026-03-28T10:00:05.000Z',
            completedAt: '2026-03-28T10:00:25.000Z',
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
    expect(container.textContent).toContain('Executor');
    expect(container.textContent).toContain('postgres');
    expect(container.textContent).toContain('analytics.orders_daily');
    expect(container.textContent).toContain('42');
  });

  it('renders failure diagnostics without materialization evidence on failed snapshots', async () => {
    const workspace = buildWorkspace({
      snapshot: {
        runId: 'run_123',
        status: 'failed',
        executor: 'postgres',
        startedAt: '2026-03-28T10:00:00.000Z',
        completedAt: '2026-03-28T10:00:30.000Z',
        environment: 'dev',
        gitSha: 'abc123def',
        execution: {
          failure: {
            stepId: 'step-transform',
            reason: 'STEP_FAILURE',
            message: 'duplicate key value violates unique constraint',
            failedAt: '2026-03-28T10:00:20.000Z',
          },
          materialization: {
            executor: 'postgres',
            environmentId: 'env-1',
            sinkTable: 'analytics.orders_daily',
            rowsWritten: 42,
            startedAt: '2026-03-28T10:00:05.000Z',
            completedAt: '2026-03-28T10:00:25.000Z',
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

    expect(container.textContent).not.toContain('Materialization evidence');
    expect(container.textContent).not.toContain(
      'Result evidence is not available yet for this run snapshot.'
    );
    expect(container.textContent).not.toContain('analytics.orders_daily');
    expect(container.textContent).toContain('Executor');
    expect(container.textContent).toContain('postgres');
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
          startedAt: '2026-03-28T10:00:00.000Z',
          completedAt: '2026-03-28T10:00:30.000Z',
          environment: 'dev',
          gitSha: 'abc123def',
          execution: undefined,
        },
      },
      {
        state: 'available',
        events: [
          buildRunEvent({
            eventId: 'evt-run-completed',
            eventType: 'RunCompleted',
            emittedAt: '2026-03-28T10:00:30.000Z',
            idempotencyKey: 'id-run-completed',
            runSeq: 8,
            persistedAt: '2026-03-28T10:00:30.000Z',
            payload: {
              materialization: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'analytics.daily_sales',
                rowsWritten: 1284,
                startedAt: '2026-03-28T10:00:05.000Z',
                completedAt: '2026-03-28T10:00:28.000Z',
                durationMs: 23000,
              },
            },
          }),
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
          startedAt: '2026-03-28T10:00:00.000Z',
          completedAt: '2026-03-28T10:00:30.000Z',
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
          buildRunEvent({
            eventId: 'evt-old-step-failed',
            eventType: 'StepFailed',
            emittedAt: '2026-03-28T10:00:10.000Z',
            idempotencyKey: 'id-old-step-failed',
            stepId: 'step-old',
            runSeq: 3,
            persistedAt: '2026-03-28T10:00:10.000Z',
            payload: {
              reason: 'OLD_ATTEMPT_FAILURE',
            },
          }),
          buildRunEvent({
            eventId: 'evt-old-run-completed',
            eventType: 'RunCompleted',
            emittedAt: '2026-03-28T10:00:12.000Z',
            idempotencyKey: 'id-old-run-completed',
            runSeq: 4,
            persistedAt: '2026-03-28T10:00:12.000Z',
            payload: {
              resultEvidence: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'analytics.old_attempt',
                rowsWritten: 42,
                startedAt: '2026-03-28T10:00:05.000Z',
                completedAt: '2026-03-28T10:00:12.000Z',
                durationMs: 7000,
              },
            },
          }),
          buildRunEvent({
            eventId: 'evt-current-run-started',
            eventType: 'RunStarted',
            emittedAt: '2026-03-28T10:00:20.000Z',
            engineAttemptId: 2,
            logicalAttemptId: 2,
            idempotencyKey: 'id-current-run-started',
            runSeq: 5,
            persistedAt: '2026-03-28T10:00:20.000Z',
            payload: {
              executor: 'postgres',
            },
          }),
          buildRunEvent({
            eventId: 'evt-current-run-completed',
            eventType: 'RunCompleted',
            emittedAt: '2026-03-28T10:00:30.000Z',
            engineAttemptId: 2,
            logicalAttemptId: 2,
            idempotencyKey: 'id-current-run-completed',
            runSeq: 6,
            persistedAt: '2026-03-28T10:00:30.000Z',
            payload: {
              executor: 'postgres',
            },
          }),
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
          stepId: stepId('step-transform'),
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
          stepId: stepId('step-evidence'),
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
          startedAt: '2026-03-28T10:00:00.000Z',
          completedAt: '2026-03-28T10:00:30.000Z',
          environment: 'dev',
          gitSha: 'abc123def',
          execution: undefined,
        },
      },
      {
        state: 'available',
        events: [
          buildRunEvent({
            eventId: 'evt-step-failed',
            eventType: 'StepFailed',
            emittedAt: '2026-03-28T10:00:20.000Z',
            idempotencyKey: 'id-step-failed',
            stepId: 'step-load',
            runSeq: 5,
            persistedAt: '2026-03-28T10:00:20.000Z',
            payload: {
              reason: 'SINK_WRITE_FAILED',
            },
          }),
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

  it('does not derive failure diagnostics from timeline attempts when snapshot omits them', async () => {
    const workspace = buildWorkspace(
      {
        snapshot: {
          runId: 'run_123',
          status: 'failed',
          startedAt: '2026-03-28T10:00:00.000Z',
          completedAt: '2026-03-28T10:00:30.000Z',
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
          buildRunEvent({
            eventId: 'evt-old-step-failed',
            eventType: 'StepFailed',
            emittedAt: '2026-03-28T10:00:10.000Z',
            idempotencyKey: 'id-old-step-failed',
            stepId: 'step-old',
            runSeq: 3,
            persistedAt: '2026-03-28T10:00:10.000Z',
            payload: {
              reason: 'OLD_ATTEMPT_FAILURE',
            },
          }),
          buildRunEvent({
            eventId: 'evt-current-step-failed',
            eventType: 'StepFailed',
            emittedAt: '2026-03-28T10:00:25.000Z',
            engineAttemptId: 2,
            logicalAttemptId: 2,
            idempotencyKey: 'id-current-step-failed',
            stepId: 'step-current',
            runSeq: 6,
            persistedAt: '2026-03-28T10:00:25.000Z',
            payload: {
              reason: 'CURRENT_ATTEMPT_FAILURE',
            },
          }),
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
    expect(container.textContent).not.toContain('CURRENT_ATTEMPT_FAILURE');
    expect(container.textContent).not.toContain('OLD_ATTEMPT_FAILURE');
    expect(container.textContent).toContain('Event timeline');
    expect(container.textContent).toContain('Step: step-current');
  });

  it('renders error and missing states', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <>
            <RunsErrorState message="Runtime service is unavailable" />
            <RunDetailErrorState runId="run_500" message="Runtime service is unavailable" />
            <RunMissingState runId="run_missing" />
          </>
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Run list unavailable');
    expect(container.textContent).toContain('Run workspace unavailable');
    expect(container.textContent).toContain('Runtime service is unavailable');
    expect(container.textContent).toContain('Run not found');
    expect(container.textContent).toContain('run_missing');
  });

  it('renders the explicit degraded state notice', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunDegradedState message="Timeline is temporarily unavailable because runtime event service is degraded." />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Timeline degraded');
    expect(container.textContent).toContain(
      'Snapshot truth is still available for this run. Timeline detail is partial or temporarily unavailable.'
    );
  });
});
