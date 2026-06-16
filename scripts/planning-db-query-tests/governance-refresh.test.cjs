const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGovernanceRefreshRunRows, parseArgs, runQuery } = require('../planning-db-query.cjs');

test('parseArgs parses governance refresh run ledger filters', () => {
  assert.deepEqual(
    parseArgs([
      'governance-refresh-runs',
      '--run',
      'refresh-run-1',
      '--state',
      'failed',
      '--limit',
      '5',
    ]),
    {
      queryName: 'governance-refresh-runs',
      filters: {
        runId: 'refresh-run-1',
        state: 'failed',
        limit: 5,
      },
    }
  );
});

test('buildGovernanceRefreshRunRows formats DB-first refresh ledger rows', () => {
  assert.deepEqual(
    buildGovernanceRefreshRunRows([
      {
        run_id: 'refresh-run-1',
        run_state: 'passed',
        actor: 'codex',
        generation_passes: 2,
        max_passes: 3,
        stage_count: 21,
        failed_stage_count: 0,
        started_at: '2026-06-11T12:00:00.000Z',
        completed_at: '2026-06-11T12:01:00.000Z',
        error_summary: '',
      },
    ]),
    [
      [
        'refresh-run-1',
        'passed',
        'codex',
        'passes=2/3',
        'stages=21 failed=0',
        '2026-06-11T12:00:00.000Z',
        '2026-06-11T12:01:00.000Z',
        '',
      ],
    ]
  );
});

test('runQuery dispatches governance-refresh-runs through the DB-first run ledger', async () => {
  const calls = [];
  const fakeClient = {
    async connect() {},
    async end() {},
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await runQuery({
    queryName: 'governance-refresh-runs',
    filters: { runId: 'refresh-run-1', state: 'passed', limit: 5 },
    client: fakeClient,
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /governance_refresh_run_query/);
  assert.deepEqual(calls[0].params, ['refresh-run-1', 'passed', 5]);
});
