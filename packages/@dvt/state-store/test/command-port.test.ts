import { describe, expect, it } from 'vitest';

import { InMemoryRunStateCommandPort } from '../src/index.js';

function buildMetadata(runId: string): Record<string, unknown> {
  return {
    tenantId: 't-1',
    projectId: 'p-1',
    environmentId: 'e-1',
    runId,
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    provider: 'temporal',
    providerWorkflowId: runId,
    providerRunId: runId,
  };
}

function buildRunStarted(
  runId: string,
  eventId: string,
  idempotencyKey: string
): Record<string, unknown> {
  return {
    eventId,
    eventType: 'RunStarted',
    runId,
    tenantId: 't-1',
    projectId: 'p-1',
    environmentId: 'e-1',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-01-01T00:00:00.000Z',
    idempotencyKey,
  };
}

describe('InMemoryRunStateCommandPort', () => {
  it('bootstraps and appends transitions', async () => {
    const port = new InMemoryRunStateCommandPort();
    const runId = 'run-a';

    await port.bootstrapRun({ metadata: buildMetadata(runId), firstEvents: [] });
    const append = await port.appendTransitions(runId, [
      buildRunStarted(runId, 'ev-1', 'RunStarted|t-1|run-a|1|'),
    ]);

    expect(append.appended).toHaveLength(1);
    const events = port.listEvents(runId);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe('RunStarted');
  });

  it('preserves idempotency on duplicate transitions', async () => {
    const port = new InMemoryRunStateCommandPort();
    const runId = 'run-b';

    await port.bootstrapRun({ metadata: buildMetadata(runId), firstEvents: [] });

    const event = buildRunStarted(runId, 'ev-1', 'RunStarted|t-1|run-b|1|');
    await port.appendTransitions(runId, [event]);
    const second = await port.appendTransitions(runId, [{ ...event, eventId: 'ev-2' }]);

    expect(second.appended).toHaveLength(0);
    expect(second.deduped).toHaveLength(1);
    const events = port.listEvents(runId);
    expect(events).toHaveLength(1);
  });
});
