import type { EventInput, RunBootstrapInput, RunId } from '../../src/types.js';

export const NOW = '2026-02-22T00:00:00.000Z';

export interface InvalidTransitionCase {
  name: string;
  runId: string;
  setup?: EventInput[];
  candidate: EventInput;
}

export function rid(s: string): RunId {
  return s as RunId;
}

export function makeEvent(
  overrides: Partial<EventInput> & {
    runId: string;
    eventType: EventInput['eventType'];
    idempotencyKey: string;
  }
): EventInput {
  return {
    eventId: overrides.idempotencyKey,
    eventType: overrides.eventType,
    runId: overrides.runId,
    tenantId: overrides.tenantId ?? 't1',
    projectId: overrides.projectId ?? 'p1',
    environmentId: overrides.environmentId ?? 'dev',
    planId: overrides.planId ?? 'plan-minimal',
    planVersion: overrides.planVersion ?? '1.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    emittedAt: NOW,
    idempotencyKey: overrides.idempotencyKey,
    payloadVersion: overrides.payloadVersion ?? 1,
    payload: overrides.payload,
    ...(overrides.stepId !== undefined ? { stepId: overrides.stepId } : {}),
  };
}

export function makeBootstrap(runId: string, tenantId = 't1'): RunBootstrapInput {
  return {
    metadata: {
      tenantId,
      projectId: 'p1',
      environmentId: 'dev',
      runId,
      planId: 'plan-minimal',
      planVersion: '1.0',
      logicalAttemptId: 1,
      providerRef: {
        provider: 'mock',
        tenantId,
        workflowId: `wf-${runId}`,
        runId: `pr-${runId}`,
      },
    },
    firstEvents: [
      makeEvent({ runId, eventType: 'RunQueued', idempotencyKey: `${runId}:queued`, tenantId }),
    ],
  };
}

export function buildInvalidTransitionCases(): InvalidTransitionCase[] {
  return [
    {
      name: 'rejects RunPaused on PENDING run',
      runId: 'run-invalid-pause-pending',
      candidate: makeEvent({
        runId: 'run-invalid-pause-pending',
        eventType: 'RunPaused',
        idempotencyKey: 'run-invalid-pause-pending:paused',
      }),
    },
    {
      name: 'rejects RunResumed on RUNNING run',
      runId: 'run-invalid-resume-running',
      candidate: makeEvent({
        runId: 'run-invalid-resume-running',
        eventType: 'RunResumed',
        idempotencyKey: 'run-invalid-resume-running:resumed',
      }),
      setup: [
        makeEvent({
          runId: 'run-invalid-resume-running',
          eventType: 'RunStarted',
          idempotencyKey: 'run-invalid-resume-running:started',
        }),
      ],
    },
    {
      name: 'rejects RunCancelled without cancellation-intent state',
      runId: 'run-invalid-cancel-without-intent',
      candidate: makeEvent({
        runId: 'run-invalid-cancel-without-intent',
        eventType: 'RunCancelled',
        idempotencyKey: 'run-invalid-cancel-without-intent:cancelled',
      }),
      setup: [
        makeEvent({
          runId: 'run-invalid-cancel-without-intent',
          eventType: 'RunStarted',
          idempotencyKey: 'run-invalid-cancel-without-intent:started',
        }),
      ],
    },
    {
      name: 'rejects StepCompleted before StepStarted',
      runId: 'run-invalid-step-complete-before-start',
      candidate: makeEvent({
        runId: 'run-invalid-step-complete-before-start',
        eventType: 'StepCompleted',
        idempotencyKey: 'run-invalid-step-complete-before-start:step-completed',
        stepId: 's1',
      }),
      setup: [
        makeEvent({
          runId: 'run-invalid-step-complete-before-start',
          eventType: 'RunStarted',
          idempotencyKey: 'run-invalid-step-complete-before-start:started',
        }),
      ],
    },
    {
      name: 'rejects StepFailed before StepStarted',
      runId: 'run-invalid-step-fail-before-start',
      candidate: makeEvent({
        runId: 'run-invalid-step-fail-before-start',
        eventType: 'StepFailed',
        idempotencyKey: 'run-invalid-step-fail-before-start:step-failed',
        stepId: 's1',
      }),
      setup: [
        makeEvent({
          runId: 'run-invalid-step-fail-before-start',
          eventType: 'RunStarted',
          idempotencyKey: 'run-invalid-step-fail-before-start:started',
        }),
      ],
    },
  ];
}
