const test = require('node:test');
const {
  assert,
  assertDocsResolutionIdempotentReplayMatches,
  buildDocsResolutionAuditRows,
  materializeDocsResolutionCommand,
  parseArgs,
  planDocsResolutionOperation,
} = require('./helpers.cjs');

test('parseArgs builds a docs disposition resolution command', () => {
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
          resolution_status: 'ignored',
          source_content_sha256: 'c'.repeat(64),
          payload: {
            resolutionScope: 'docs_disposition',
            issueKind: 'unknown_task_like_id',
            documentPath: 'docs/planning/status/example.md',
            referenceText: 'WEB-123',
            resolutionStatus: 'ignored',
            reason: 'Historical reference, not an active planning task.',
          },
        },
        {
          kind: 'docs_disposition_resolve',
          actor: 'codex',
          resolutionScope: 'docs_disposition',
          issueKind: 'unknown_task_like_id',
          documentPath: 'docs/planning/status/example.md',
          referenceText: 'WEB-123',
          resolutionStatus: 'ignored',
          reason: 'Historical reference, not an active planning task.',
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

  assert.match(operation.resolution.resolutionKey, /^docs_disposition:[a-f0-9]{64}$/);
  assert.equal(operation.resolution.sourceContentSha256, 'c'.repeat(64));
  assert.equal(operation.resolution.resolutionStatus, 'ignored');
  assert.equal(operation.audit.operationType, 'docs_disposition_resolve');
  assert.equal(operation.audit.resolutionKey, operation.resolution.resolutionKey);
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
