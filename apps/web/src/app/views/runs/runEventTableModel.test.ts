import { describe, expect, it } from 'vitest';

import { iso, stepId } from '../../testing/contractTestUtils';
import type { RunEvent } from '../../types/engine';
import { buildRunEventTableRows } from './runEventTableModel';

function buildEvent(overrides: Partial<RunEvent>): RunEvent {
  return {
    eventId: 'evt-1',
    eventType: 'StepStarted',
    runId: 'run_1',
    emittedAt: iso('2026-05-18T10:00:00.000Z'),
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    planId: 'plan-1',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: 'id-1',
    payloadVersion: 1,
    runSeq: 1,
    persistedAt: iso('2026-05-18T10:00:00.000Z'),
    ...overrides,
  } as RunEvent;
}

describe('runEventTableModel', () => {
  it('maps event chronology through shared presentation semantics', () => {
    const rows = buildRunEventTableRows([
      buildEvent({
        eventId: 'evt-start',
        eventType: 'StepStarted',
        stepId: stepId('step-load'),
        payload: { message: 'Loading source rows' },
      }),
      buildEvent({
        eventId: 'evt-failed',
        eventType: 'RunFailed',
        runSeq: 2,
        emittedAt: iso('2026-05-18T10:01:00.000Z'),
      }),
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        eventId: 'evt-start',
        eventType: 'StepStarted',
        runSeq: 1,
        level: 'INFO',
        headline: 'Step started',
        detail: 'Loading source rows',
        stepId: 'step-load',
      }),
      expect.objectContaining({
        eventId: 'evt-failed',
        eventType: 'RunFailed',
        runSeq: 2,
        level: 'ERROR',
        headline: 'Run failed',
        stepId: null,
      }),
    ]);
  });

  it('keeps unknown event types readable without inventing authority', () => {
    const rows = buildRunEventTableRows([
      buildEvent({
        eventId: 'evt-custom',
        eventType: 'AdapterHeartbeat' as RunEvent['eventType'],
      }),
    ]);

    expect(rows[0]).toEqual(
      expect.objectContaining({ headline: 'AdapterHeartbeat', level: 'INFO' })
    );
  });
});
