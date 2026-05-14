import { asIsoUtcString, type EventEnvelope } from '@dvt/contracts';

export function cloneEvent(event: EventEnvelope): EventEnvelope {
  return { ...event };
}

export function makeRunQueuedEvent(runSeq = 1): EventEnvelope {
  return {
    eventId: `evt-canary-${runSeq}`,
    eventType: 'RunQueued',
    runId: 'run-canary-1',
    tenantId: 'tenant-canary',
    projectId: 'project-canary',
    environmentId: 'env-canary',
    planId: 'plan-canary',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: asIsoUtcString('2026-03-10T00:00:00.000Z'),
    idempotencyKey: `key-canary-${runSeq}`,
    payloadVersion: 1,
    runSeq,
    persistedAt: asIsoUtcString('2026-03-10T00:00:00.000Z'),
  };
}
