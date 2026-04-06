import { describe, expect, it } from 'vitest';
import { formatRunEventAsLogLine, levelForEventType } from './formatLogLine';
import type { RunEvent } from '../../types/engine';

function makeEvent(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    eventId: 'evt_1',
    eventType: 'StepStarted',
    runId: 'run_1',
    emittedAt: '2026-04-06T10:35:14.000Z',
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'e1',
    planId: 'plan_1',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: 'run_1-evt_1',
    payloadVersion: 1,
    stepId: 'stg_orders',
    runSeq: 1,
    persistedAt: '2026-04-06T10:35:14.000Z',
    ...overrides,
  } as RunEvent;
}

describe('formatRunEventAsLogLine', () => {
  it('formats a StepStarted event', () => {
    const line = formatRunEventAsLogLine(makeEvent());
    expect(line).toContain('[INFO]');
    expect(line).toContain('Step stg_orders started');
  });

  it('formats a StepCompleted event', () => {
    const line = formatRunEventAsLogLine(makeEvent({ eventType: 'StepCompleted' }));
    expect(line).toContain('[SUCCESS]');
    expect(line).toContain('Step stg_orders completed');
  });

  it('formats a StepFailed event with payload message', () => {
    const line = formatRunEventAsLogLine(
      makeEvent({
        eventType: 'StepFailed',
        payload: { message: 'OOM killed' },
      })
    );
    expect(line).toContain('[ERROR]');
    expect(line).toContain('Step stg_orders failed: OOM killed');
  });

  it('formats a RunStarted event', () => {
    const line = formatRunEventAsLogLine(
      makeEvent({ eventType: 'RunStarted', stepId: undefined as never })
    );
    expect(line).toContain('[INFO]');
    expect(line).toContain('Run started');
  });

  it('formats a RunCompleted event', () => {
    const line = formatRunEventAsLogLine(
      makeEvent({ eventType: 'RunCompleted', stepId: undefined as never })
    );
    expect(line).toContain('[SUCCESS]');
    expect(line).toContain('Run completed successfully');
  });

  it('formats a RunFailed event with payload message', () => {
    const line = formatRunEventAsLogLine(
      makeEvent({
        eventType: 'RunFailed',
        stepId: undefined as never,
        payload: { message: 'Timeout exceeded' },
      })
    );
    expect(line).toContain('[ERROR]');
    expect(line).toContain('Run failed: Timeout exceeded');
  });

  it('includes timestamp from emittedAt', () => {
    const line = formatRunEventAsLogLine(makeEvent());
    // The exact format depends on locale, but it should contain digits
    expect(line).toMatch(/^\d{1,2}:\d{2}:\d{2}/);
  });

  it('handles unknown event types gracefully', () => {
    const line = formatRunEventAsLogLine(makeEvent({ eventType: 'CustomEvent' as never }));
    expect(line).toContain('[INFO]');
    expect(line).toContain('CustomEvent');
  });
});

describe('levelForEventType', () => {
  it('returns SUCCESS for completed events', () => {
    expect(levelForEventType('RunCompleted')).toBe('SUCCESS');
    expect(levelForEventType('StepCompleted')).toBe('SUCCESS');
  });

  it('returns ERROR for failure events', () => {
    expect(levelForEventType('RunFailed')).toBe('ERROR');
    expect(levelForEventType('StepFailed')).toBe('ERROR');
  });

  it('returns WARN for pause/cancel events', () => {
    expect(levelForEventType('RunPaused')).toBe('WARN');
    expect(levelForEventType('RunCancelled')).toBe('WARN');
    expect(levelForEventType('StepSkipped')).toBe('WARN');
  });

  it('defaults to INFO for unknown types', () => {
    expect(levelForEventType('SomethingElse')).toBe('INFO');
  });
});
