const test = require('node:test');
const assert = require('node:assert/strict');

const { runPlanningDbQueryCli } = require('./helpers.cjs');
const {
  buildDbtProjectRoundtripCapabilityStatusRows,
  parseArgs,
  readDbtProjectRoundtripCapabilityStatusRows,
} = require('../planning-db-query.cjs');

test('planning DB query CLI documents the DBT round-trip capability projection', () => {
  const result = runPlanningDbQueryCli(['dbt-roundtrip-capabilities', '--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB query: dbt-roundtrip-capabilities/);
  assert.match(result.stdout, /--phase 4/);
  assert.match(result.stdout, /--filter PreviewExecutionPlan/);
});

test('DBT round-trip capability query behavior lives in a focused read-model component', () => {
  const queryComponent = require('../planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs');

  assert.equal(
    queryComponent.buildDbtProjectRoundtripCapabilityStatusRows,
    buildDbtProjectRoundtripCapabilityStatusRows
  );
  assert.equal(
    queryComponent.readDbtProjectRoundtripCapabilityStatusRows,
    readDbtProjectRoundtripCapabilityStatusRows
  );
});

test('parseArgs maps DBT round-trip phase, state, and rail filters', () => {
  assert.deepEqual(
    parseArgs([
      'dbt-roundtrip-capabilities',
      '--phase',
      '4',
      '--state',
      'current',
      '--filter',
      'PreviewExecutionPlan',
      '--limit',
      '10',
    ]),
    {
      queryName: 'dbt-roundtrip-capabilities',
      filters: {
        limit: 10,
        phase: '4',
        rail: 'PreviewExecutionPlan',
        state: 'current',
      },
    }
  );
});

test('buildDbtProjectRoundtripCapabilityStatusRows exposes expected and current posture', () => {
  assert.deepEqual(
    buildDbtProjectRoundtripCapabilityStatusRows([
      {
        phase_id: 'phase-4',
        phase_order: 4,
        phase_name: 'File-backed Preview and Run',
        rail_type: 'command',
        rail_name: 'PreviewExecutionPlan',
        ddd_owner: 'Canvas execution preview/readiness presentation',
        expected_rail_status: 'implemented',
        rail_status: 'implemented',
        expected_mechanization_status: 'implemented',
        mechanization_status: 'implemented',
        expected_is_gap: false,
        is_gap: false,
        expected_implemented: true,
        implementation_ref_count: 3,
        projection_state: 'current',
        reviewed_pr_url: 'https://github.com/dunay2/dvt/pull/1962',
        reviewed_commit_sha: 'f65d187319db03651c000e7907f4ddb8f3b0ea17',
      },
    ]),
    [
      [
        'phase-4',
        '4',
        'File-backed Preview and Run',
        'command',
        'PreviewExecutionPlan',
        'Canvas execution preview/readiness presentation',
        'implemented',
        'implemented',
        'implemented',
        'implemented',
        'false',
        'false',
        'true',
        '3',
        'current',
        'https://github.com/dunay2/dvt/pull/1962',
        'f65d187319db03651c000e7907f4ddb8f3b0ea17',
      ],
    ]
  );
});

test('readDbtProjectRoundtripCapabilityStatusRows reads only the governed projection', async () => {
  const captured = { sql: '', params: [] };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readDbtProjectRoundtripCapabilityStatusRows(client, {
    phase: '4',
    rail: 'PreviewExecutionPlan',
    state: 'current',
    limit: 8,
  });

  assert.match(
    captured.sql,
    /from planning_query_store\.dbt_project_roundtrip_capability_status_query/
  );
  assert.match(captured.sql, /phase_order = \$1/);
  assert.match(captured.sql, /rail_name = \$2/);
  assert.match(captured.sql, /projection_state = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [4, 'PreviewExecutionPlan', 'current', 8]);
});

test('DBT round-trip capability query rejects non-positive and fractional phases', async () => {
  const queryComponent = require('../planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs');
  const client = { query: async () => ({ rows: [] }) };

  await assert.rejects(
    () => queryComponent.readDbtProjectRoundtripCapabilityStatusRows(client, { phase: '0' }),
    /Expected a positive integer/
  );
  await assert.rejects(
    () => queryComponent.readDbtProjectRoundtripCapabilityStatusRows(client, { phase: '4.5' }),
    /Expected a positive integer/
  );
});
