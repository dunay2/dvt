const test = require('node:test');
const {
  assert,
  importedTask,
  buildAuditRows,
  planTaskDefinitionOperation,
  planTaskLocalOperation,
  validateTaskStatus,
} = require('./helpers.cjs');

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

test('planTaskLocalOperation rebases stale local task state to the current imported source', () => {
  const operation = planTaskLocalOperation({
    command: {
      kind: 'task_update',
      actor: 'codex',
      laneId: 'A',
      taskId: 'GOV-S3',
      status: 'queued',
      expectedRevision: null,
      idempotencyKey: 'rebase-stale-local-task-state',
    },
    importedTask,
    currentState: {
      sourcePath: 'docs/planning/state/agent-lane-a.yaml',
      baseSourceContentSha256: 'b'.repeat(64),
      revision: 4,
      status: 'in_progress',
      progressPct: 65,
      evidenceRefs: ['docs/planning/closeouts/stale-overlay.md'],
      statusReason: 'Previous local progress should remain visible after a new operation',
      claimedBy: null,
      claimToken: null,
      claimExpiresAt: null,
    },
    operationId: 'op-rebase',
    now: '2026-05-07T10:00:00.000Z',
  });

  assert.equal(operation.state.revision, 5);
  assert.equal(operation.state.status, 'queued');
  assert.equal(operation.state.progressPct, 65);
  assert.deepEqual(operation.state.evidenceRefs, ['docs/planning/closeouts/stale-overlay.md']);
  assert.equal(operation.state.baseSourceContentSha256, importedTask.sourceContentSha256);
  assert.equal(operation.audit.baseSourceContentSha256, importedTask.sourceContentSha256);
  assert.equal(operation.audit.previousRevision, 4);
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

test('planTaskDefinitionOperation creates a local task definition with auditable raw task', () => {
  const operation = planTaskDefinitionOperation({
    command: {
      kind: 'task_create',
      actor: 'codex',
      laneId: 'E',
      taskId: 'F-29-E2E',
      parentTaskId: 'F-29',
      priority: 'P0',
      status: 'queued',
      objective: 'Prove the next E2E route through the planning DB command rail.',
      dependency: 'F-28-C',
      target: 'apps/web/cypress/e2e/canvas',
      complexity: 'M',
      effortPoints: 3,
      progressPct: 0,
      evidenceRefs: ['aider/tasks/07-f-29-e2e.md'],
      statusReason: 'Created through planning DB command rail.',
      idempotencyKey: 'create-f29',
    },
    importedLane: {
      laneId: 'E',
      sourcePath: 'docs/planning/state/agent-lane-e.yaml',
      sourceContentSha256: 'b'.repeat(64),
    },
    importedTask: null,
    localDefinition: null,
    localTombstone: null,
    operationId: 'op-create',
    now: '2026-05-10T10:00:00.000Z',
  });

  assert.equal(operation.definition.laneId, 'E');
  assert.equal(operation.definition.taskId, 'F-29-E2E');
  assert.equal(operation.definition.sourcePath, 'docs/planning/state/agent-lane-e.yaml');
  assert.equal(operation.definition.sourceContentSha256, 'b'.repeat(64));
  assert.equal(operation.definition.parentTaskId, 'F-29');
  assert.equal(operation.definition.rawTask.task_id, 'F-29-E2E');
  assert.equal(operation.definition.rawTask.parent_task, 'F-29');
  assert.equal(operation.definition.rawTask.parent_task_id, undefined);
  assert.equal(
    operation.definition.rawTask.objective,
    'Prove the next E2E route through the planning DB command rail.'
  );
  assert.equal(operation.definition.rawTask.effort_points, 3);
  assert.equal(operation.audit.operationType, 'task_create');
  assert.equal(operation.audit.resultingRevision, 0);
});

test('planTaskDefinitionOperation rejects duplicate task creation', () => {
  assert.throws(
    () =>
      planTaskDefinitionOperation({
        command: {
          kind: 'task_create',
          actor: 'codex',
          laneId: 'E',
          taskId: 'F-29-E2E',
          objective: 'Duplicate task.',
          status: 'queued',
          idempotencyKey: 'duplicate',
        },
        importedLane: {
          laneId: 'E',
          sourcePath: 'docs/planning/state/agent-lane-e.yaml',
          sourceContentSha256: 'b'.repeat(64),
        },
        importedTask,
        localDefinition: null,
        localTombstone: null,
        operationId: 'op-duplicate',
        now: '2026-05-10T10:00:00.000Z',
      }),
    /Planning task E\/F-29-E2E already exists/
  );
});

test('planTaskDefinitionOperation deletes an effective task with revision guard', () => {
  const operation = planTaskDefinitionOperation({
    command: {
      kind: 'task_delete',
      actor: 'codex',
      laneId: 'A',
      taskId: 'GOV-S3',
      expectedRevision: 2,
      statusReason: 'Closed by DB-owned task lifecycle command.',
      idempotencyKey: 'delete-gov-s3',
    },
    importedLane: null,
    importedTask,
    localDefinition: null,
    localTombstone: null,
    currentState: { revision: 2 },
    operationId: 'op-delete',
    now: '2026-05-10T10:00:00.000Z',
  });

  assert.equal(operation.tombstone.laneId, 'A');
  assert.equal(operation.tombstone.taskId, 'GOV-S3');
  assert.equal(operation.tombstone.baseSourceContentSha256, importedTask.sourceContentSha256);
  assert.equal(operation.tombstone.statusReason, 'Closed by DB-owned task lifecycle command.');
  assert.equal(operation.state.revision, 3);
  assert.equal(operation.state.statusReason, 'Closed by DB-owned task lifecycle command.');
  assert.equal(operation.audit.operationType, 'task_delete');
  assert.equal(operation.audit.previousRevision, 2);
  assert.equal(operation.audit.resultingRevision, 3);
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
