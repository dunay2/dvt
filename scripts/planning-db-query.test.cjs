const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildGovernanceComponentRows,
  buildGovernanceCoverageRows,
  buildGovernanceDriftRows,
  buildGovernanceFileRows,
  buildGovernanceRemediationRows,
  buildHashDriftRows,
  buildPrReadinessRows,
  buildSummaryRows,
  buildTaskRows,
  buildRepositoryCommandRows,
  parseArgs,
  readGovernanceComponentRows,
  readGovernanceCoverageRows,
  readGovernanceDriftRows,
  readGovernanceFileRows,
  readGovernanceRemediationRows,
  readPlanningArtifactRows,
  readPlanningDependencyRows,
  readPlanningEvidenceRows,
  readPlanningStatusEventRows,
  readPrReadinessRows,
  readRepositoryCommandRows,
  readNextTaskRows,
  readHashDriftSummary,
  readOpenTaskRows,
  readSummary,
  readTaskRows,
  formatQueryError,
  resolveQueryName,
} = require('./planning-db-query.cjs');

test('resolveQueryName defaults to summary and rejects unknown query names', () => {
  assert.equal(resolveQueryName(undefined), 'summary');
  assert.equal(resolveQueryName('summary'), 'summary');
  assert.equal(resolveQueryName('hash-drift'), 'hash-drift');
  assert.equal(resolveQueryName('tasks'), 'tasks');
  assert.equal(resolveQueryName('open'), 'open');
  assert.equal(resolveQueryName('next'), 'next');
  assert.equal(resolveQueryName('dependencies'), 'dependencies');
  assert.equal(resolveQueryName('evidence'), 'evidence');
  assert.equal(resolveQueryName('status-events'), 'status-events');
  assert.equal(resolveQueryName('artifacts'), 'artifacts');
  assert.equal(resolveQueryName('files'), 'files');
  assert.equal(resolveQueryName('components'), 'components');
  assert.equal(resolveQueryName('coverage'), 'coverage');
  assert.equal(resolveQueryName('remediation'), 'remediation');
  assert.equal(resolveQueryName('drift'), 'drift');
  assert.equal(resolveQueryName('commands'), 'commands');
  assert.equal(resolveQueryName('pr-readiness'), 'pr-readiness');
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

test('parseArgs parses governance query filters for DB-first governance inspection', () => {
  const command = parseArgs([
    'files',
    '--component',
    'SYS-DOCS-GOVERNANCE',
    '--state',
    'drift',
    '--path',
    'docs/planning/status/example.md',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'files',
    filters: {
      component: 'SYS-DOCS-GOVERNANCE',
      governanceState: 'drift',
      path: 'docs/planning/status/example.md',
      limit: 5,
    },
  });
});

test('parseArgs parses repository command query filters for DB-first catalog inspection', () => {
  const command = parseArgs([
    'commands',
    '--command-domain',
    'planning-db',
    '--type',
    'package_script',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'commands',
    filters: {
      commandDomain: 'planning-db',
      type: 'package_script',
      limit: 5,
    },
  });
});

test('formatQueryError preserves nested connection failures for unavailable DB', () => {
  const ipv6Error = Object.assign(new Error('connect ECONNREFUSED ::1:55432'), {
    code: 'ECONNREFUSED',
  });
  const ipv4Error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:55432'), {
    code: 'ECONNREFUSED',
  });
  const error = new AggregateError([ipv6Error, ipv4Error]);

  const message = formatQueryError(error);

  assert.match(message, /Planning DB is unavailable/);
  assert.match(message, /connect ECONNREFUSED ::1:55432/);
  assert.match(message, /connect ECONNREFUSED 127\.0\.0\.1:55432/);
  assert.match(message, /pnpm planning:db:up/);
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
    planningTaskDependencies: 40,
    planningTaskEvidenceRefs: 30,
    planningTaskStatusEvents: 250,
    planningArtifacts: 2,
    repositoryCommands: 220,
    repositoryCommandUnknown: 4,
    repositoryCommandRuntimeFanout: 16,
    prReadinessChecks: 1,
    prReadinessBlocking: 1,
  });

  assert.deepEqual(rows, [
    ['planning.source_authority', 'database'],
    ['planning.lanes', 5],
    ['planning.tasks', 250],
    ['planning.tasks.review', 9],
    ['planning.task_dependencies', 40],
    ['planning.task_evidence_refs', 30],
    ['planning.task_status_events', 250],
    ['planning.artifacts', 2],
    ['repository.commands', 220],
    ['repository.commands.unknown', 4],
    ['repository.commands.runtime_fanout', 16],
    ['repository.pr_readiness', 1],
    ['repository.pr_readiness.blocking', 1],
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
            planningTaskDependencies: 40,
            planningTaskEvidenceRefs: 30,
            planningTaskStatusEvents: 250,
            planningArtifacts: 2,
            repositoryCommands: 220,
            repositoryCommandUnknown: 4,
            repositoryCommandRuntimeFanout: 16,
            prReadinessChecks: 1,
            prReadinessBlocking: 1,
          },
        ],
      };
    },
  };

  const summary = await readSummary(client);

  assert.equal(summary.governanceHashDrift, undefined);
  assert.match(capturedSql, /planning_effective_tasks where status = 'review'/);
  assert.match(capturedSql, /planning_task_dependencies/);
  assert.match(capturedSql, /planning_task_evidence_refs/);
  assert.match(capturedSql, /planning_task_status_events/);
  assert.match(capturedSql, /planning_artifacts/);
  assert.match(capturedSql, /repository_commands/);
  assert.match(capturedSql, /pr_readiness_checks/);
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

test('readOpenTaskRows queries the DB open-task view without duplicating status logic', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readOpenTaskRows(client, {
    laneId: 'C',
    priority: 'P1',
    limit: 10,
  });

  assert.match(captured.sql, /from planning_query_store\.planning_open_tasks/);
  assert.doesNotMatch(captured.sql, /status not in/i);
  assert.match(captured.sql, /lane_id = \$1/);
  assert.match(captured.sql, /priority = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['C', 'P1', 10]);
});

test('readNextTaskRows queries the DB next-task view without duplicating dependency logic', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return {
        rows: [
          {
            lane_id: 'C',
            task_id: 'READY-C',
            priority: 'P1',
            status: 'queued',
            progress_pct: 0,
            claimed_by: null,
            dependency: 'DONE-A',
            objective: 'Ready task.',
            target: 'Start now.',
          },
        ],
      };
    },
  };

  const rows = await readNextTaskRows(client, { laneId: 'C', limit: 5 });

  assert.match(captured.sql, /from planning_query_store\.planning_next_tasks/);
  assert.doesNotMatch(captured.sql, /from planning_query_store\.planning_effective_tasks/);
  assert.doesNotMatch(captured.sql, /regexp_split_to_table/);
  assert.match(captured.sql, /lane_id = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['C', 5]);
  assert.deepEqual(
    rows.map((row) => `${row[0]}/${row[1]}`),
    ['C/READY-C']
  );
});

test('planning relation queries read normalized DB views', async () => {
  const captured = [];
  const client = {
    async query(sql, params) {
      captured.push({ sql, params });
      return { rows: [] };
    },
  };

  await readPlanningDependencyRows(client, { laneId: 'E', limit: 3 });
  await readPlanningEvidenceRows(client, { laneId: 'A', limit: 4 });
  await readPlanningStatusEventRows(client, { laneId: 'C', limit: 5 });
  await readPlanningArtifactRows(client, { kind: 'workboard', limit: 6 });

  assert.match(captured[0].sql, /from planning_query_store\.planning_task_dependencies/);
  assert.match(captured[1].sql, /from planning_query_store\.planning_task_evidence_refs/);
  assert.match(captured[2].sql, /from planning_query_store\.planning_task_status_events/);
  assert.match(captured[3].sql, /from planning_query_store\.planning_artifacts/);
  assert.deepEqual(captured[0].params, ['E', 3]);
  assert.deepEqual(captured[1].params, ['A', 4]);
  assert.deepEqual(captured[2].params, ['C', 5]);
  assert.deepEqual(captured[3].params, ['workboard', 6]);
});

test('readRepositoryCommandRows queries the DB repository command catalog view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readRepositoryCommandRows(client, {
    commandDomain: 'planning-db',
    type: 'package_script',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.repository_command_query/);
  assert.match(captured.sql, /domain = \$1/);
  assert.match(captured.sql, /command_type = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['planning-db', 'package_script', 5]);
});

test('buildRepositoryCommandRows formats DB-owned repository command catalog rows', () => {
  const rows = buildRepositoryCommandRows([
    {
      command_type: 'package_script',
      command_name: 'planning:db:query',
      command_path: null,
      domain: 'planning-db',
      sensitivity: 'planning-query-store',
      runtime_fanout: true,
      referenced_file_count: 1,
    },
    {
      command_type: 'command_file',
      command_name: null,
      command_path: 'scripts/planning-db-query.cjs',
      domain: 'planning-db',
      sensitivity: 'planning-query-store',
      runtime_fanout: false,
      referenced_file_count: 0,
    },
  ]);

  assert.deepEqual(rows, [
    [
      'package_script',
      'planning:db:query',
      'planning-db',
      'planning-query-store',
      'runtime-fanout',
      1,
    ],
    [
      'command_file',
      'scripts/planning-db-query.cjs',
      'planning-db',
      'planning-query-store',
      '-',
      0,
    ],
  ]);
});

test('readPrReadinessRows queries the DB-owned PR readiness view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readPrReadinessRows(client, { limit: 5 });

  assert.match(captured.sql, /from planning_query_store\.pr_readiness_query/);
  assert.match(captured.sql, /order by blocking desc, readiness_id/);
  assert.match(captured.sql, /limit \$1/);
  assert.deepEqual(captured.params, [5]);
});

test('buildPrReadinessRows formats DB-owned ARC blockers for CLI output', () => {
  const rows = buildPrReadinessRows([
    {
      readiness_id: 'current',
      effective_arc_level: 'ARC-2',
      blocking: true,
      trigger_count: 1,
      missing_requirements: ['evidenceDoc', 'riskUpdate'],
      evidence_doc_status: 'missing',
      risk_update_status: 'missing',
      required_checks: ['lint', 'test', 'docs-validation'],
    },
  ]);

  assert.deepEqual(rows, [
    [
      'current',
      'ARC-2',
      'blocking',
      1,
      'evidenceDoc,riskUpdate',
      'evidence:missing',
      'risk:missing',
      'lint,test,docs-validation',
    ],
  ]);
});

test('buildGovernanceFileRows formats DB-owned governance file rows', () => {
  const rows = buildGovernanceFileRows([
    {
      path: 'docs/planning/status/system-governance-file-index.files.yaml',
      component_unit: 'SYS-DOCS-GOVERNANCE',
      owning_unit: 'SYS-DOCS-GOVERNANCE',
      governance_state: 'drift',
      is_drift: true,
      is_legacy: false,
    },
  ]);

  assert.deepEqual(rows, [
    [
      'docs/planning/status/system-governance-file-index.files.yaml',
      'SYS-DOCS-GOVERNANCE',
      'SYS-DOCS-GOVERNANCE',
      'drift',
      'drift',
      '-',
    ],
  ]);
});

test('readGovernanceFileRows queries the DB governance file view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceFileRows(client, {
    component: 'SYS-DOCS-GOVERNANCE',
    governanceState: 'drift',
    path: 'docs/planning/status/example.md',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_file_query/);
  assert.doesNotMatch(captured.sql, /system-governance-file-index\.files\.yaml/);
  assert.match(captured.sql, /component_unit = \$1/);
  assert.match(captured.sql, /governance_state = \$2/);
  assert.match(captured.sql, /path = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'SYS-DOCS-GOVERNANCE',
    'drift',
    'docs/planning/status/example.md',
    5,
  ]);
});

test('readGovernanceComponentRows queries the DB governance component view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceComponentRows(client, {
    component: 'SYS-DOCS-GOVERNANCE',
    governanceState: 'stable',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_component_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /governance_state = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['SYS-DOCS-GOVERNANCE', 'stable', 5]);
});

test('readGovernanceCoverageRows queries the DB governance coverage view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceCoverageRows(client, {
    kind: 'component',
    component: 'SYS-DOCS-GOVERNANCE',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_coverage_query/);
  assert.match(captured.sql, /coverage_kind = \$1/);
  assert.match(captured.sql, /component_id = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['component', 'SYS-DOCS-GOVERNANCE', 5]);
});

test('readGovernanceRemediationRows queries the DB governance remediation view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceRemediationRows(client, {
    priority: 'P0',
    component: 'SYS-DOCS-GOVERNANCE',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_remediation_query/);
  assert.match(captured.sql, /priority = \$1/);
  assert.match(captured.sql, /component_unit = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['P0', 'SYS-DOCS-GOVERNANCE', 5]);
});

test('readGovernanceDriftRows queries the DB governance drift view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceDriftRows(client, {
    component: 'SYS-DOCS-GOVERNANCE',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_drift_query/);
  assert.doesNotMatch(captured.sql, /from planning_query_store\.governance_file_hash_drift/);
  assert.match(captured.sql, /component_unit = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['SYS-DOCS-GOVERNANCE', 5]);
});

test('governance row builders format DB rows for CLI output', () => {
  assert.deepEqual(
    buildGovernanceComponentRows([
      {
        component_id: 'SYS-DOCS-GOVERNANCE',
        file_count: 42,
        governance_state: 'stable',
        is_drift: false,
        is_legacy: false,
        ddd_owner: 'DocsGovernance',
      },
    ]),
    [['SYS-DOCS-GOVERNANCE', 42, 'stable', '-', '-', 'DocsGovernance']]
  );
  assert.deepEqual(
    buildGovernanceCoverageRows([
      {
        coverage_kind: 'component',
        name: 'SYS-DOCS-GOVERNANCE',
        count_value: 42,
        file_count: 42,
        component_id: 'SYS-DOCS-GOVERNANCE',
      },
    ]),
    [['component', 'SYS-DOCS-GOVERNANCE', 42, 42, 'SYS-DOCS-GOVERNANCE']]
  );
  assert.deepEqual(
    buildGovernanceRemediationRows([
      {
        priority: 'P0',
        task_id: 'GOV-1',
        component_unit: 'SYS-DOCS-GOVERNANCE',
        file_count: 4,
        reason: 'Component is too broad.',
      },
    ]),
    [['P0', 'GOV-1', 'SYS-DOCS-GOVERNANCE', 4, 'Component is too broad.']]
  );
  assert.deepEqual(
    buildGovernanceDriftRows([
      {
        path: 'docs/example.md',
        component_unit: 'SYS-DOCS-GOVERNANCE',
        owning_unit: 'SYS-DOCS-GOVERNANCE',
        drift_fields: ['governance_hash', 'state_fingerprint'],
      },
    ]),
    [
      [
        'docs/example.md',
        'SYS-DOCS-GOVERNANCE',
        'SYS-DOCS-GOVERNANCE',
        'governance_hash,state_fingerprint',
      ],
    ]
  );
});
