const test = require('node:test');
const { assert, assertIdempotentReplayMatches } = require('./helpers.cjs');

test('assertIdempotentReplayMatches rejects same key with different command payload', () => {
  assert.throws(
    () =>
      assertIdempotentReplayMatches(
        {
          operation_type: 'task_update',
          actor: 'codex',
          lane_id: 'A',
          task_id: 'GOV-S3',
          expected_revision: null,
          payload: { status: 'review', progressPct: null, statusReason: null, evidenceRefs: [] },
        },
        {
          kind: 'task_update',
          actor: 'codex',
          laneId: 'A',
          taskId: 'GOV-S3',
          expectedRevision: null,
          status: 'done',
          progressPct: null,
          statusReason: null,
          evidenceRefs: [],
          idempotencyKey: 'same-key',
        }
      ),
    /Idempotency key "same-key" already belongs to a different planning operation/
  );
});

test('assertIdempotentReplayMatches accepts jsonb payloads with reordered keys', () => {
  assert.doesNotThrow(() =>
    assertIdempotentReplayMatches(
      {
        operation_type: 'task_update',
        actor: 'codex',
        lane_id: 'A',
        task_id: 'GOV-S3',
        expected_revision: null,
        payload: {
          evidenceRefs: [],
          statusReason: null,
          progressPct: null,
          status: 'review',
        },
      },
      {
        kind: 'task_update',
        actor: 'codex',
        laneId: 'A',
        taskId: 'GOV-S3',
        expectedRevision: null,
        status: 'review',
        progressPct: null,
        statusReason: null,
        evidenceRefs: [],
        idempotencyKey: 'same-key',
      }
    )
  );
});

test('assertIdempotentReplayMatches rejects stale idempotent replays after task revision advances', () => {
  assert.throws(
    () =>
      assertIdempotentReplayMatches(
        {
          operation_type: 'task_release',
          actor: 'codex',
          lane_id: 'A',
          task_id: 'GOV-S3',
          expected_revision: null,
          resulting_revision: 3,
          payload: {},
        },
        {
          kind: 'task_release',
          actor: 'codex',
          laneId: 'A',
          taskId: 'GOV-S3',
          expectedRevision: null,
          idempotencyKey: 'release-key',
        },
        { revision: 4 }
      ),
    /Idempotency key "release-key" already completed at revision 3, but A\/GOV-S3 is now at revision 4/
  );
});
