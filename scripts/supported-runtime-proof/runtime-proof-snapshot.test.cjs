'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { projectCanonicalSnapshot } = require('./runtime-proof-snapshot.cjs');

test('projects the full persisted event history with canonical run-domain semantics', async () => {
  const events = [
    makeEvent(1, 'RunQueued', '2026-08-03T00:00:00.000Z'),
    makeEvent(2, 'RunStarted', '2026-08-03T00:00:01.000Z'),
    makeEvent(3, 'RunCompleted', '2026-08-03T00:00:02.000Z'),
  ];

  const projected = await projectCanonicalSnapshot('run-1', events);

  assert.deepEqual(projected, {
    snapshot: {
      schemaVersion: 1,
      runId: 'run-1',
      status: 'COMPLETED',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
      startedAt: '2026-08-03T00:00:01.000Z',
      completedAt: '2026-08-03T00:00:02.000Z',
    },
    last_run_seq: 3,
  });
});

function makeEvent(runSeq, eventType, emittedAt) {
  return {
    run_seq: runSeq,
    payload: {
      eventId: `event-${runSeq}`,
      runId: 'run-1',
      tenantId: 'tenant-1',
      eventType,
      emittedAt,
      runSeq,
      payload: {},
    },
  };
}
