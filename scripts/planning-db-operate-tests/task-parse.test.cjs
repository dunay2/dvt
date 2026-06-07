const test = require('node:test');
const { assert, parseArgs } = require('./helpers.cjs');

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

test('parseArgs builds task create and delete commands for DB-owned task structure', () => {
  const createCommand = parseArgs([
    'task',
    'create',
    '--lane',
    'E',
    '--task',
    'F-29-E2E',
    '--actor',
    'codex',
    '--priority',
    'P0',
    '--objective',
    'Prove the next E2E route through the planning DB command rail.',
    '--dependency',
    'F-28-C',
    '--target',
    'apps/web/cypress/e2e/canvas',
    '--complexity',
    'M',
    '--effort-points',
    '3',
    '--evidence',
    'aider/tasks/07-f-29-e2e.md',
  ]);

  assert.equal(createCommand.kind, 'task_create');
  assert.equal(createCommand.laneId, 'E');
  assert.equal(createCommand.taskId, 'F-29-E2E');
  assert.equal(createCommand.status, 'queued');
  assert.equal(createCommand.priority, 'P0');
  assert.equal(
    createCommand.objective,
    'Prove the next E2E route through the planning DB command rail.'
  );
  assert.equal(createCommand.effortPoints, 3);
  assert.deepEqual(createCommand.evidenceRefs, ['aider/tasks/07-f-29-e2e.md']);

  const deleteCommand = parseArgs([
    'task',
    'delete',
    '--lane',
    'E',
    '--task',
    'F-29-E2E',
    '--actor',
    'codex',
    '--reason',
    'Superseded by F-30.',
    '--expected-revision',
    '0',
  ]);

  assert.equal(deleteCommand.kind, 'task_delete');
  assert.equal(deleteCommand.statusReason, 'Superseded by F-30.');
  assert.equal(deleteCommand.expectedRevision, 0);
});

test('parseArgs requires task create objective and validates effort points', () => {
  assert.throws(
    () => parseArgs(['task', 'create', '--lane', 'E', '--task', 'F-29-E2E', '--actor', 'codex']),
    /Missing required --objective/
  );

  assert.throws(
    () =>
      parseArgs([
        'task',
        'create',
        '--lane',
        'E',
        '--task',
        'F-29-E2E',
        '--actor',
        'codex',
        '--objective',
        'Invalid effort.',
        '--effort-points',
        '-1',
      ]),
    /Invalid --effort-points "-1"/
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
