const test = require('node:test');
const {
  assert,
  assertDocsResolutionIdempotentReplayMatches,
  buildDocsResolutionAuditRows,
  materializeDocsResolutionCommand,
  parseArgs,
  planDocsResolutionOperation,
} = require('./helpers.cjs');

test('parseArgs builds docs disposition and task gap resolution commands', () => {
  const docsCommand = parseArgs([
    'docs-disposition',
    'resolve',
    '--kind',
    'unknown_task_like_id',
    '--path',
    'docs/planning/status/example.md',
    '--reference',
    'WEB-123',
    '--actor',
    'codex',
    '--resolution',
    'ignored',
    '--reason',
    'Historical reference, not an active planning task.',
  ]);

  assert.equal(docsCommand.kind, 'docs_disposition_resolve');
  assert.equal(docsCommand.resolutionScope, 'docs_disposition');
  assert.equal(docsCommand.issueKind, 'unknown_task_like_id');
  assert.equal(docsCommand.documentPath, 'docs/planning/status/example.md');
  assert.equal(docsCommand.referenceText, 'WEB-123');
  assert.equal(docsCommand.actor, 'codex');
  assert.equal(docsCommand.resolutionStatus, 'ignored');
  assert.match(docsCommand.idempotencyKey, /^docs_disposition_resolve:codex:/);

  const taskGapCommand = parseArgs([
    'task-gap',
    'resolve',
    '--kind',
    'done_or_review_without_evidence',
    '--lane',
    'A',
    '--task',
    'GOV-S3',
    '--actor',
    'codex',
    '--reason',
    'Evidence is linked through the closeout trace.',
    '--target-lane',
    'A',
    '--target-task',
    'GOV-S3',
  ]);

  assert.equal(taskGapCommand.kind, 'task_gap_resolve');
  assert.equal(taskGapCommand.resolutionScope, 'task_gap');
  assert.equal(taskGapCommand.issueKind, 'done_or_review_without_evidence');
  assert.equal(taskGapCommand.laneId, 'A');
  assert.equal(taskGapCommand.taskId, 'GOV-S3');
  assert.equal(taskGapCommand.resolutionStatus, 'resolved');
  assert.equal(taskGapCommand.targetLaneId, 'A');
  assert.equal(taskGapCommand.targetTaskId, 'GOV-S3');
});

test('materializeDocsResolutionCommand derives source-aware default idempotency keys', () => {
  const command = parseArgs([
    'docs-disposition',
    'resolve',
    '--kind',
    'unknown_task_like_id',
    '--path',
    'docs/planning/status/example.md',
    '--reference',
    'WEB-123',
    '--actor',
    'codex',
    '--resolution',
    'ignored',
    '--reason',
    'Historical reference, not an active planning task.',
  ]);

  const first = materializeDocsResolutionCommand(command, {
    action_kind: 'unknown_task_like_id',
    document_path: 'docs/planning/status/example.md',
    reference_text: 'WEB-123',
    source_content_sha256: 'c'.repeat(64),
  });
  const second = materializeDocsResolutionCommand(command, {
    action_kind: 'unknown_task_like_id',
    document_path: 'docs/planning/status/example.md',
    reference_text: 'WEB-123',
    source_content_sha256: 'd'.repeat(64),
  });

  assert.notEqual(first.idempotencyKey, second.idempotencyKey);
  assert.equal(first.sourceContentSha256, 'c'.repeat(64));
  assert.equal(second.sourceContentSha256, 'd'.repeat(64));
});

test('assertDocsResolutionIdempotentReplayMatches rejects stale source-hash replays', () => {
  assert.throws(
    () =>
      assertDocsResolutionIdempotentReplayMatches(
        {
          operation_type: 'docs_disposition_resolve',
          actor: 'codex',
          resolution_scope: 'docs_disposition',
          issue_kind: 'unknown_task_like_id',
          document_path: 'docs/planning/status/example.md',
          reference_text: 'WEB-123',
          lane_id: null,
          task_id: null,
          resolution_status: 'ignored',
          source_content_sha256: 'c'.repeat(64),
          payload: {
            resolutionScope: 'docs_disposition',
            issueKind: 'unknown_task_like_id',
            documentPath: 'docs/planning/status/example.md',
            referenceText: 'WEB-123',
            laneId: null,
            taskId: null,
            resolutionStatus: 'ignored',
            reason: 'Historical reference, not an active planning task.',
            targetLaneId: null,
            targetTaskId: null,
          },
        },
        {
          kind: 'docs_disposition_resolve',
          actor: 'codex',
          resolutionScope: 'docs_disposition',
          issueKind: 'unknown_task_like_id',
          documentPath: 'docs/planning/status/example.md',
          referenceText: 'WEB-123',
          laneId: null,
          taskId: null,
          resolutionStatus: 'ignored',
          reason: 'Historical reference, not an active planning task.',
          targetLaneId: null,
          targetTaskId: null,
          sourceContentSha256: 'd'.repeat(64),
          idempotencyKey: 'resolve-doc-gap',
        }
      ),
    /already completed for source hash/
  );
});

test('parseArgs validates docs resolution scope and status', () => {
  assert.throws(
    () =>
      parseArgs([
        'docs-disposition',
        'resolve',
        '--kind',
        'unknown_task_like_id',
        '--actor',
        'codex',
        '--reason',
        'Missing path.',
      ]),
    /Missing required --path/
  );

  assert.throws(
    () =>
      parseArgs([
        'task-gap',
        'resolve',
        '--kind',
        'done_or_review_without_evidence',
        '--actor',
        'codex',
        '--reason',
        'Missing selector.',
      ]),
    /Task gap resolution requires --path or both --lane and --task/
  );

  assert.throws(
    () =>
      parseArgs([
        'docs-disposition',
        'resolve',
        '--kind',
        'unknown_task_like_id',
        '--path',
        'docs/planning/status/example.md',
        '--actor',
        'codex',
        '--resolution',
        'maybe',
        '--reason',
        'Invalid resolution.',
      ]),
    /Invalid docs resolution status "maybe"/
  );
});

test('planDocsResolutionOperation records source-hash guarded disposition resolutions', () => {
  const operation = planDocsResolutionOperation({
    command: {
      kind: 'docs_disposition_resolve',
      resolutionScope: 'docs_disposition',
      issueKind: 'unknown_task_like_id',
      documentPath: 'docs/planning/status/example.md',
      referenceText: 'WEB-123',
      actor: 'codex',
      resolutionStatus: 'ignored',
      reason: 'Historical reference, not an active planning task.',
      idempotencyKey: 'resolve-doc-gap',
    },
    sourceRow: {
      action_id: 'action-1',
      action_kind: 'unknown_task_like_id',
      document_path: 'docs/planning/status/example.md',
      reference_text: 'WEB-123',
      source_content_sha256: 'c'.repeat(64),
      reason: 'Task-like reference is not registered in planning lanes.',
    },
    operationId: 'op-doc-resolution',
    now: '2026-05-10T12:00:00.000Z',
  });

  assert.equal(
    operation.resolution.resolutionKey,
    'docs_disposition:c1da6232a85c07f5f0e5e77a6fc6449469bbc29e32819cc65fd20581b1f30c4b'
  );
  assert.equal(operation.resolution.sourceContentSha256, 'c'.repeat(64));
  assert.equal(operation.resolution.resolutionStatus, 'ignored');
  assert.equal(operation.audit.operationType, 'docs_disposition_resolve');
  assert.equal(operation.audit.resolutionKey, operation.resolution.resolutionKey);
});

test('planDocsResolutionOperation records task gap links without creating tasks', () => {
  const operation = planDocsResolutionOperation({
    command: {
      kind: 'task_gap_resolve',
      resolutionScope: 'task_gap',
      issueKind: 'active_review_without_task_link',
      documentPath: 'docs/planning/reviews/example.md',
      actor: 'codex',
      resolutionStatus: 'linked',
      reason: 'Linked to the active DB task.',
      targetLaneId: 'A',
      targetTaskId: 'GOV-S3',
      idempotencyKey: 'resolve-task-gap',
    },
    sourceRow: {
      gap_kind: 'active_review_without_task_link',
      lane_id: null,
      task_id: null,
      document_path: 'docs/planning/reviews/example.md',
      source_content_sha256: 'd'.repeat(64),
      reason: 'Active review document has no registered planning task link.',
    },
    operationId: 'op-gap-resolution',
    now: '2026-05-10T12:00:00.000Z',
  });

  assert.equal(operation.resolution.resolutionScope, 'task_gap');
  assert.equal(operation.resolution.issueKind, 'active_review_without_task_link');
  assert.equal(operation.resolution.documentPath, 'docs/planning/reviews/example.md');
  assert.equal(operation.resolution.targetLaneId, 'A');
  assert.equal(operation.resolution.targetTaskId, 'GOV-S3');
  assert.equal(operation.audit.payload.resolutionStatus, 'linked');
});

test('buildDocsResolutionAuditRows formats durable docs resolution audit rows', () => {
  const rows = buildDocsResolutionAuditRows([
    {
      created_at: '2026-05-10T12:00:00.000Z',
      operation_id: 'op-doc-resolution',
      operation_type: 'docs_disposition_resolve',
      actor: 'codex',
      resolution_scope: 'docs_disposition',
      issue_kind: 'unknown_task_like_id',
      document_path: 'docs/planning/status/example.md',
      reference_text: 'WEB-123',
      resolution_status: 'ignored',
    },
  ]);

  assert.deepEqual(rows, [
    '2026-05-10T12:00:00.000Z op-doc-resolution docs_disposition_resolve docs_disposition/unknown_task_like_id docs/planning/status/example.md ref=WEB-123 status=ignored actor=codex',
  ]);
});
