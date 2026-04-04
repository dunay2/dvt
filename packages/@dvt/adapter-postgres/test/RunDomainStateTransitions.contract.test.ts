import type { EventEnvelope, EventInput, WorkflowSnapshot } from '@dvt/contracts';
import { applyRunEvent, InvalidStateTransitionError } from '@dvt/run-domain';
import { describe, expect, test } from 'vitest';

import { buildInvalidTransitionCases, NOW } from './helpers/runEventFixtures.js';

describe('run-domain transition guards contract (default local suite)', () => {
  const invalidTransitionCases = buildInvalidTransitionCases();

  for (const c of invalidTransitionCases) {
    test(c.name, () => {
      const snapshot = createInitialSnapshot(c.runId);
      const setupEvents = c.setup ?? [];

      for (const [index, event] of setupEvents.entries()) {
        applyRunEvent(snapshot, toEnvelope(event, index + 1));
      }

      expect(() =>
        applyRunEvent(snapshot, toEnvelope(c.candidate, setupEvents.length + 1))
      ).toThrow(InvalidStateTransitionError);
    });
  }
});

function createInitialSnapshot(runId: string): WorkflowSnapshot {
  return {
    runId,
    status: 'PENDING',
    paused: false,
    cancelling: false,
    gatewayDecisions: {},
    steps: {},
  };
}

function toEnvelope(event: EventInput, runSeq: number): EventEnvelope {
  return {
    ...event,
    runSeq,
    persistedAt: NOW,
  };
}
