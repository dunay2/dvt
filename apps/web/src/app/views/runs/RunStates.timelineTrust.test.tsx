// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { stepId } from '../../testing/contractTestUtils';
import { RunWorkspaceState } from './RunStates';
import {
  buildRunEvent,
  buildStepStartedEvent,
  buildWorkspace,
  createRunStatesHarness,
  selectRunDetailTab,
} from './test/RunStatesHarness';

describe('RunStates timeline trust boundaries', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;

  beforeEach(() => {
    harness = createRunStatesHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('does not render materialization evidence from timeline payload when snapshot omits it', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace(
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
        )}
      />
    );

    await selectRunDetailTab(harness.container, 'Result');

    expect(harness.container.textContent).toContain('Materialization evidence');
    expect(harness.container.textContent).toContain(
      'Result evidence is not available yet for this run snapshot.'
    );
    expect(harness.container.textContent).not.toContain('analytics.daily_sales');
    expect(harness.container.textContent).not.toMatch(/1,?284/);
  });

  it('ignores stale prior-attempt diagnostics and materialization when a newer attempt completed', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace(
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
                payload: { reason: 'OLD_ATTEMPT_FAILURE' },
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
                payload: { executor: 'postgres' },
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
                payload: { executor: 'postgres' },
              }),
            ],
          }
        )}
      />
    );

    await selectRunDetailTab(harness.container, 'Diagnostics and events');

    expect(harness.container.textContent).not.toContain('Failure diagnostics');
    expect(harness.container.textContent).not.toContain('OLD_ATTEMPT_FAILURE');

    await selectRunDetailTab(harness.container, 'Result');

    expect(harness.container.textContent).not.toContain('analytics.old_attempt');
    expect(harness.container.textContent).toContain(
      'Result evidence is not available yet for this run snapshot.'
    );
  });

  it('renders execution provenance from step-started artifact refs', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace(undefined, {
          state: 'available',
          events: [
            buildStepStartedEvent({
              stepId: stepId('step-transform'),
              payload: {
                stepArtifactRef: {
                  artifactKind: 'compiled-sql',
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
                stepArtifactRef: {
                  artifactKind: 'compiled-sql',
                  storageUri: 's3://dvt-artifacts/dev/compiled/evidence.sql',
                  sha256: 'b'.repeat(64),
                  sizeBytes: 128,
                  encoding: 'utf-8',
                },
              },
            }),
          ],
        })}
      />
    );

    await selectRunDetailTab(harness.container, 'Provenance');

    expect(harness.container.textContent).toContain('Execution provenance');
    expect(
      harness.container.querySelector('[data-slot="run-execution-provenance-card"]')
    ).not.toBeNull();
    expect(harness.container.textContent).toContain('step-transform');
    expect(harness.container.textContent).toContain('compiled-sql');
    expect(harness.container.textContent).toContain(
      's3://dvt-artifacts/dev/compiled/orders_daily.sql'
    );
    expect(harness.container.textContent).toContain('a'.repeat(64));
    expect(harness.container.textContent).toContain('2.0 KB');
    expect(harness.container.textContent).toContain('step-evidence');
    expect(harness.container.textContent).toContain('compiled-sql');
    expect(harness.container.textContent).toContain('s3://dvt-artifacts/dev/compiled/evidence.sql');
  });

  it('does not render failure diagnostics from timeline events when snapshot omits them', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace(
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
                payload: { reason: 'SINK_WRITE_FAILED' },
              }),
            ],
          }
        )}
      />
    );

    await selectRunDetailTab(harness.container, 'Diagnostics and events');

    expect(harness.container.textContent).not.toContain('Failure diagnostics');
    expect(harness.container.textContent).not.toContain('SINK_WRITE_FAILED');
    expect(harness.container.textContent).toContain('Event timeline');
    expect(harness.container.textContent).toContain('step-load');
  });

  it('does not derive failure diagnostics from timeline attempts when snapshot omits them', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace(
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
                payload: { reason: 'OLD_ATTEMPT_FAILURE' },
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
                payload: { reason: 'CURRENT_ATTEMPT_FAILURE' },
              }),
            ],
          }
        )}
      />
    );

    await selectRunDetailTab(harness.container, 'Diagnostics and events');

    expect(harness.container.textContent).not.toContain('Failure diagnostics');
    expect(harness.container.textContent).not.toContain('CURRENT_ATTEMPT_FAILURE');
    expect(harness.container.textContent).not.toContain('OLD_ATTEMPT_FAILURE');
    expect(harness.container.textContent).toContain('Event timeline');
    expect(harness.container.textContent).toContain('step-current');
  });

  it('keeps accumulated timeline evidence visible while feed health is degraded', async () => {
    const bufferedEvent = buildStepStartedEvent({ stepId: stepId('step-buffered') });

    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace(
          {
            eventFeedHealth: {
              state: 'degraded',
              events: [bufferedEvent],
              canRetry: true,
            },
          },
          { state: 'available', events: [bufferedEvent] }
        )}
      />
    );

    await selectRunDetailTab(harness.container, 'Diagnostics and events');

    expect(harness.container.textContent).toContain('Degraded');
    expect(harness.container.textContent).toContain('step-buffered');
  });
});
