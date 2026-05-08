const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildNextTaskRows,
  buildHashDriftRows,
  buildSummaryRows,
  buildTaskRows,
  parseArgs,
  readNextTaskRows,
  readHashDriftSummary,
  readSummary,
  readTaskRows,
  resolveQueryName,
} = require('./planning-db-query.cjs');

test('resolveQueryName defaults to summary and rejects unknown query names', () => {
  assert.equal(resolveQueryName(undefined), 'summary');
  assert.equal(resolveQueryName('summary'), 'summary');
  assert.equal(resolveQueryName('hash-drift'), 'hash-drift');
  assert.equal(resolveQueryName('tasks'), 'tasks');
  assert.equal(resolveQueryName('next'), 'next');
  assert.throws(() => resolveQueryName('unknown'), /Unknown planning DB query "unknown"/);
});

test('parseArgs parses task query filters for daily DB-first planning work', () => {
  const command = parseArgs([
    'tasks',
    '--lane',
    'C',
    '--status',
    'review',
    '--claimed-by',
    'codex',
    '--limit',
    '10',
  ]);

  assert.deepEqual(command, {
    queryName: 'tasks',
    filters: {
      laneId: 'C',
      status: 'review',
      claimedBy: 'codex',
      limit: 10,
    },
  });
});

test('buildSummaryRows exposes planning and governance content counts without expensive hash drift', () => {
  const rows = buildSummaryRows({
    lanes: 5,
    tasks: 250,
    reviewTasks: 9,
    governanceFiles: 4255,
    driftFiles: 41,
    legacyFiles: 0,
    governanceComponents: 32,
    governanceComponentFiles: 4255,
    governanceFingerprints: 4255,
    governanceCoverageRows: 128,
    governanceRemediationTasks: 43,
    governanceRemediationP0: 3,
    planningLocalTaskOverlays: 2,
    planningLocalOperations: 5,
  });

  assert.deepEqual(rows, [
    ['planning.lanes', 5],
    ['planning.tasks', 250],
    ['planning.tasks.review', 9],
    ['governance.files', 4255],
    ['governance.files.drift', 41],
    ['governance.files.legacy', 0],
    ['governance.components', 32],
    ['governance.component_files', 4255],
    ['governance.fingerprints', 4255],
    ['governance.coverage_rows', 128],
    ['governance.remediation_tasks', 43],
    ['governance.remediation_tasks.p0', 3],
    ['planning.local_task_overlays', 2],
    ['planning.local_operations', 5],
  ]);
});

test('buildHashDriftRows exposes hash drift as an explicit heavy query result', () => {
  assert.deepEqual(buildHashDriftRows({ governanceHashDrift: 3 }), [['governance.hash_drift', 3]]);
});

test('readSummary counts review tasks from the effective task view without hash drift', async () => {
  let capturedSql = '';
  const client = {
    async query(sql) {
      capturedSql = sql;
      return {
        rows: [
          {
            lanes: 5,
            tasks: 250,
            reviewTasks: 9,
            governanceFiles: 4255,
            driftFiles: 41,
            legacyFiles: 0,
            governanceComponents: 32,
            governanceComponentFiles: 4255,
            governanceFingerprints: 4255,
            governanceCoverageRows: 128,
            governanceRemediationTasks: 43,
            governanceRemediationP0: 3,
            planningLocalTaskOverlays: 2,
            planningLocalOperations: 5,
          },
        ],
      };
    },
  };

  const summary = await readSummary(client);

  assert.equal(summary.governanceHashDrift, undefined);
  assert.match(capturedSql, /planning_effective_tasks where status = 'review'/);
  assert.doesNotMatch(capturedSql, /governance_file_hash_drift/);
});

test('readHashDriftSummary queries only the explicit hash drift projection', async () => {
  let capturedSql = '';
  const client = {
    async query(sql) {
      capturedSql = sql;
      return { rows: [{ governanceHashDrift: 0 }] };
    },
  };

  const summary = await readHashDriftSummary(client);

  assert.equal(summary.governanceHashDrift, 0);
  assert.match(capturedSql, /governance_file_hash_drift/);
});

test('buildTaskRows formats effective task rows with claim and progress context', () => {
  const rows = buildTaskRows([
    {
      lane_id: 'C',
      task_id: 'AR-C10',
      priority: 'P0',
      status: 'review',
      progress_pct: '80.00',
      claimed_by: 'codex',
      objective: 'Move existing task operations to DB overlays.',
    },
  ]);

  assert.deepEqual(rows, [
    [
      'C',
      'AR-C10',
      'P0',
      'review',
      '80%',
      'codex',
      'Move existing task operations to DB overlays.',
    ],
  ]);
});

test('buildNextTaskRows selects queued tasks whose dependencies are done in effective state', () => {
  const rows = buildNextTaskRows([
    {
      lane_id: 'A',
      task_id: 'DONE-1',
      priority: 'P0',
      status: 'done',
      progress_pct: 100,
      claimed_by: null,
      dependency: 'none',
      objective: 'Completed prerequisite.',
      target: 'Evidence accepted.',
    },
    {
      lane_id: 'A',
      task_id: 'READY-1',
      priority: 'P1',
      status: 'queued',
      progress_pct: 0,
      claimed_by: null,
      dependency: 'DONE-1',
      objective: 'Ready task.',
      target: 'Start now.',
    },
    {
      lane_id: 'A',
      task_id: 'BLOCKED-1',
      priority: 'P0',
      status: 'queued',
      progress_pct: 0,
      claimed_by: null,
      dependency: 'MISSING-1',
      objective: 'Blocked task.',
      target: 'Wait.',
    },
  ]);

  assert.deepEqual(
    rows.map((row) => row[1]),
    ['READY-1']
  );
});

test('readTaskRows queries the effective task view with stable filters', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readTaskRows(client, {
    laneId: 'C',
    status: 'review',
    claimedBy: 'codex',
    limit: 10,
  });

  assert.match(captured.sql, /from planning_query_store\.planning_effective_tasks/);
  assert.match(captured.sql, /lane_id = \$1/);
  assert.match(captured.sql, /status = \$2/);
  assert.match(captured.sql, /claimed_by = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['C', 'review', 'codex', 10]);
});

test('readNextTaskRows reads effective tasks before applying dependency routing', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readNextTaskRows(client, { laneId: 'A', limit: 5 });

  assert.match(captured.sql, /from planning_query_store\.planning_effective_tasks/);
  assert.match(captured.sql, /lane_id = \$1/);
  assert.deepEqual(captured.params, ['A']);
});
