const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertIdempotentReplayMatches,
  buildAuditRows,
  parseArgs,
  planTaskLocalOperation,
  validateTaskStatus,
} = require('./planning-db-operate.cjs');

const importedTask = {
  laneId: 'A',
  taskId: 'GOV-S3',
  sourcePath: 'docs/planning/state/agent-lane-a.yaml',
  sourceContentSha256: 'a'.repeat(64),
  status: 'in_progress',
  progressPct: 25,
  statusReason: 'Imported from lane file',
  evidenceRefs: [
    'docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md',
  ],
};

test('parseArgs builds a task update command with actor, revision, and evidence', () => {
  const command = parseArgs([
    'task',
    'update',
    '--lane',
    'A',
    '--task',
    'GOV-S3',
    '--actor',
    'codex',
    '--status',
    'review',
    '--progress',
    '80',
    '--reason',
    'DB-first local operation in review',
    '--evidence',
    'docs/evidence/ED-20260507-gov-s3-local-db.md',
    '--expected-revision',
    '2',
    '--idempotency-key',
    'codex-gov-s3-review',
  ]);

  assert.equal(command.kind, 'task_update');
  assert.equal(command.laneId, 'A');
  assert.equal(command.taskId, 'GOV-S3');
  assert.equal(command.actor, 'codex');
  assert.equal(command.status, 'review');
  assert.equal(command.progressPct, 80);
  assert.equal(command.expectedRevision, 2);
  assert.deepEqual(command.evidenceRefs, ['docs/evidence/ED-20260507-gov-s3-local-db.md']);
});

test('parseArgs rejects missing actor and invalid task status', () => {
  assert.throws(
    () => parseArgs(['task', 'claim', '--lane', 'A', '--task', 'GOV-S3']),
    /Missing required --actor/
  );

  assert.throws(
    () =>
      parseArgs([
        'task',
        'update',
        '--lane',
        'A',
        '--task',
        'GOV-S3',
        '--actor',
        'codex',
        '--status',
        'almost-done',
      ]),
    /Invalid planning task status "almost-done"/
  );
});

test('parseArgs derives different default idempotency keys for different updates', () => {
  const reviewCommand = parseArgs([
    'task',
    'update',
    '--lane',
    'A',
    '--task',
    'GOV-S3',
    '--actor',
    'codex',
    '--status',
    'review',
  ]);
  const doneCommand = parseArgs([
    'task',
    'update',
    '--lane',
    'A',
    '--task',
    'GOV-S3',
    '--actor',
    'codex',
    '--status',
    'done',
  ]);

  assert.notEqual(reviewCommand.idempotencyKey, doneCommand.idempotencyKey);
});

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

test('validateTaskStatus accepts the lane task statuses used by governance planning', () => {
  for (const status of ['queued', 'in_progress', 'blocked', 'review', 'done']) {
    assert.equal(validateTaskStatus(status), status);
  }
});

test('planTaskLocalOperation applies optimistic revisions and creates an audit payload', () => {
  const operation = planTaskLocalOperation({
    command: {
      kind: 'task_update',
      actor: 'codex',
      laneId: 'A',
      taskId: 'GOV-S3',
      status: 'done',
      progressPct: 100,
      statusReason: 'Local DB authoring command validated',
      evidenceRefs: [
        'docs/planning/closeouts/20260507-gov-s2-doc-driven-operating-framework-closeout.md',
      ],
      expectedRevision: 2,
      idempotencyKey: 'codex-gov-s3-done',
    },
    importedTask,
    currentState: {
      revision: 2,
      claimedBy: 'codex',
      claimToken: 'claim-token',
      claimExpiresAt: '2026-05-07T12:00:00.000Z',
    },
    operationId: 'op-1',
    now: '2026-05-07T10:00:00.000Z',
  });

  assert.equal(operation.state.revision, 3);
  assert.equal(operation.state.status, 'done');
  assert.equal(operation.state.progressPct, 100);
  assert.equal(operation.audit.operationType, 'task_update');
  assert.equal(operation.audit.expectedRevision, 2);
  assert.equal(operation.audit.resultingRevision, 3);
  assert.equal(operation.audit.baseSourceContentSha256, importedTask.sourceContentSha256);
});

test('planTaskLocalOperation rejects stale expected revisions', () => {
  assert.throws(
    () =>
      planTaskLocalOperation({
        command: {
          kind: 'task_update',
          actor: 'codex',
          laneId: 'A',
          taskId: 'GOV-S3',
          expectedRevision: 1,
          idempotencyKey: 'stale',
        },
        importedTask,
        currentState: { revision: 2 },
        operationId: 'op-2',
        now: '2026-05-07T10:00:00.000Z',
      }),
    /Stale planning task revision for A\/GOV-S3: expected 1 but current revision is 2/
  );
});

test('planTaskLocalOperation creates a claim token and preserves audit across command shape', () => {
  const operation = planTaskLocalOperation({
    command: {
      kind: 'task_claim',
      actor: 'codex',
      laneId: 'A',
      taskId: 'GOV-S3',
      ttlMinutes: 90,
      idempotencyKey: 'claim-gov-s3',
    },
    importedTask,
    currentState: null,
    operationId: 'op-claim',
    now: '2026-05-07T10:00:00.000Z',
  });

  assert.equal(operation.state.revision, 1);
  assert.equal(operation.state.claimedBy, 'codex');
  assert.equal(operation.state.claimToken, 'op-claim');
  assert.equal(operation.state.claimExpiresAt, '2026-05-07T11:30:00.000Z');
  assert.equal(operation.audit.operationType, 'task_claim');
});

test('buildAuditRows formats durable local audit rows for CLI output', () => {
  const rows = buildAuditRows([
    {
      operation_id: 'op-1',
      operation_type: 'task_update',
      actor: 'codex',
      lane_id: 'A',
      task_id: 'GOV-S3',
      expected_revision: 2,
      resulting_revision: 3,
      created_at: '2026-05-07T10:00:00.000Z',
    },
  ]);

  assert.deepEqual(rows, [
    '2026-05-07T10:00:00.000Z op-1 task_update A/GOV-S3 actor=codex expected=2 resulting=3',
  ]);
});
