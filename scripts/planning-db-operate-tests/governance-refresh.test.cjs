const test = require('node:test');

const { assert, parseArgs, planGovernanceRefreshRunRecordOperation } = require('./helpers.cjs');
const {
  buildGovernanceRefreshStageRunRows,
} = require('../planning-db/governance-refresh-write-rail.cjs');

test('parseArgs builds a governance refresh run record command', () => {
  const command = parseArgs([
    'governance-refresh',
    'record-run',
    '--run',
    'refresh-run-1',
    '--actor',
    'codex',
    '--source-ref',
    'pnpm governance:refresh',
    '--source-content-sha256',
    'f'.repeat(64),
    '--state',
    'passed',
    '--generation-passes',
    '2',
    '--max-passes',
    '3',
  ]);

  assert.equal(command.kind, 'governance_refresh_run_record');
  assert.equal(command.runId, 'refresh-run-1');
  assert.equal(command.runState, 'passed');
  assert.equal(command.generationPasses, 2);
  assert.equal(command.maxPasses, 3);
});

test('buildGovernanceRefreshStageRunRows normalizes generation and database stages', () => {
  const rows = buildGovernanceRefreshStageRunRows({
    runId: 'refresh-run-1',
    stages: {
      generationStages: [
        { id: 'docs-sync', script: 'docs:sync' },
        { id: 'planning-db-import', script: 'planning:db:import', args: ['--', '--if-stale'] },
      ],
      databaseStages: [{ id: 'planning-db-check', script: 'planning:db:check' }],
    },
    result: {
      generationPasses: 2,
      generationStagesRun: ['docs:sync', 'planning:db:import', 'docs:sync', 'planning:db:import'],
      databaseStagesRun: ['planning:db:check'],
    },
  });

  assert.deepEqual(
    rows.map((row) => [
      row.stageGroup,
      row.passNumber,
      row.stageIndex,
      row.stageId,
      row.stageScript,
      row.stageState,
    ]),
    [
      ['generation', 1, 1, 'docs-sync', 'docs:sync', 'passed'],
      ['generation', 1, 2, 'planning-db-import', 'planning:db:import', 'passed'],
      ['generation', 2, 1, 'docs-sync', 'docs:sync', 'passed'],
      ['generation', 2, 2, 'planning-db-import', 'planning:db:import', 'passed'],
      ['database', 1, 1, 'planning-db-check', 'planning:db:check', 'passed'],
    ]
  );
});

test('planGovernanceRefreshRunRecordOperation creates a DB-first run ledger plan', () => {
  const command = parseArgs([
    'governance-refresh',
    'record-run',
    '--run',
    'refresh-run-1',
    '--actor',
    'codex',
    '--source-ref',
    'pnpm governance:refresh',
    '--source-content-sha256',
    'f'.repeat(64),
    '--state',
    'passed',
    '--generation-passes',
    '1',
    '--max-passes',
    '3',
  ]);

  const planned = planGovernanceRefreshRunRecordOperation({
    command,
    existingRun: null,
    operationId: 'op-refresh-run-1',
    now: new Date('2026-06-11T12:00:00.000Z'),
  });

  assert.equal(planned.audit.operationType, 'governance_refresh_run_record');
  assert.equal(planned.run.runId, 'refresh-run-1');
  assert.equal(planned.run.runState, 'passed');
  assert.equal(planned.run.revision, 0);
  assert.equal(planned.audit.resultingRevision, 0);
});
