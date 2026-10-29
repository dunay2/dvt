const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildComponentEngineeringRecordRows,
  buildComponentEngineeringComponentDriftRows,
  buildComponentEngineeringComponentMetadataRows,
  buildComponentEngineeringComponentTreeRows,
  buildComponentEngineeringQualityRows,
  buildGovernanceComponentRows,
  buildGovernanceCoverageRows,
  buildGovernanceDriftRows,
  buildGovernanceFileRows,
  buildGovernanceUnitRows,
  buildGovernanceRemediationRows,
  buildHashDriftRows,
  buildComponentEngineeringRuleCatalogRows,
  buildComponentEngineeringRuleEvaluationRows,
  parseArgs,
  readGovernanceComponentRows,
  readGovernanceCoverageRows,
  readGovernanceDriftRows,
  readGovernanceUnitRows,
  readGovernanceRemediationRows,
  readHashDriftSummary,
} = require('../planning-db-query.cjs');

test('parseArgs parses governance query filters for database governance inspection', () => {
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

test('parseArgs parses governance unit tree filters for database parent navigation', () => {
  const command = parseArgs([
    'units',
    '--unit',
    'SYS-API-ROOT',
    '--parent',
    'SYS-API',
    '--state',
    'coverage-required',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'units',
    filters: {
      component: 'SYS-API-ROOT',
      parentUnit: 'SYS-API',
      governanceState: 'coverage-required',
      limit: 5,
    },
  });
});

test('buildHashDriftRows exposes hash drift as an explicit heavy query result', () => {
  assert.deepEqual(buildHashDriftRows({ governanceHashDrift: 3 }), [['governance.hash_drift', 3]]);
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

test('readGovernanceUnitRows queries the DB governance unit tree view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceUnitRows(client, {
    component: 'SYS-API-ROOT',
    parentUnit: 'SYS-API',
    governanceState: 'coverage-required',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_unit_query/);
  assert.match(captured.sql, /unit_id = \$1/);
  assert.match(captured.sql, /parent_id = \$2/);
  assert.match(captured.sql, /governance_state = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['SYS-API-ROOT', 'SYS-API', 'coverage-required', 5]);
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
    buildGovernanceUnitRows([
      {
        unit_id: 'SYS-API-ROOT',
        name: 'API root module',
        level: 'module',
        parent_id: 'SYS-API',
        governance_state: 'coverage-required',
        direct_file_count: 0,
        descendant_file_count: 243,
        ddd_owner: null,
        is_materialized_component: false,
      },
    ]),
    [['SYS-API-ROOT', 'API root module', 'module', 'SYS-API', 'coverage-required', 0, 243, '-']]
  );
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
    buildComponentEngineeringComponentTreeRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        name: 'Runtime engine core',
        component_level: 'component',
        parent_component_id: 'SYS-RUNTIME-ROOT',
        governance_state: 'coverage-required',
        direct_file_count: 12,
        descendant_file_count: 189,
        ddd_owner: 'AS',
        is_leaf_component: false,
      },
    ]),
    [
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'Runtime engine core',
        'component',
        'SYS-RUNTIME-ROOT',
        'coverage-required',
        12,
        189,
        'AS',
        'false',
      ],
    ]
  );
  assert.deepEqual(
    buildComponentEngineeringComponentDriftRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        drift_code: 'children_required_without_children',
        metadata: { componentId: 'SYS-RUNTIME-ENGINE-CORE' },
      },
    ]),
    [
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'children_required_without_children',
        '{"componentId":"SYS-RUNTIME-ENGINE-CORE"}',
      ],
    ]
  );
  assert.deepEqual(
    buildComponentEngineeringComponentMetadataRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        name: 'Runtime engine core',
        owned_concern: 'Owns deterministic runtime orchestration.',
        metadata_state: 'declared',
        quality_state: 'warn',
        direct_file_count: 0,
        descendant_file_count: 189,
        drift_codes: ['missing_public_api'],
      },
    ]),
    [
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'Runtime engine core',
        'declared',
        'warn',
        0,
        189,
        'missing_public_api',
        'Owns deterministic runtime orchestration.',
      ],
    ]
  );
  assert.deepEqual(
    buildComponentEngineeringRuleCatalogRows([
      {
        rule_id: 'CEI-RESP-001',
        category: 'responsibility',
        severity: 'error',
        subject_level: 'component',
        drift_code: 'missing_owned_concern',
      },
    ]),
    [['CEI-RESP-001', 'responsibility', 'error', 'component', 'missing_owned_concern']]
  );
  assert.deepEqual(
    buildComponentEngineeringRuleEvaluationRows([
      {
        rule_id: 'CEI-ID-006',
        subject_id: 'SYS-RUNTIME-ENGINE-CORE',
        evaluation_state: 'pass',
        severity: 'error',
        drift_code: null,
      },
    ]),
    [['CEI-ID-006', 'SYS-RUNTIME-ENGINE-CORE', 'pass', 'error', '-']]
  );
  assert.deepEqual(
    buildComponentEngineeringQualityRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        name: 'Runtime engine core',
        component_level: 'component',
        quality_state: 'pass',
        direct_file_count: 0,
        descendant_file_count: 189,
        children_count: 16,
        test_file_count: 0,
        failing_rule_count: 0,
        drift_codes: [],
      },
    ]),
    [['SYS-RUNTIME-ENGINE-CORE', 'Runtime engine core', 'component', 'pass', 0, 189, 16, 0, 0, '-']]
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
  assert.deepEqual(
    buildComponentEngineeringRecordRows([
      {
        component_id: 'SYS-API-HTTP-ENTRYPOINTS',
        record: {
          identity: {
            componentId: 'SYS-API-HTTP-ENTRYPOINTS',
            name: 'API HTTP entrypoints',
          },
          publicContract: {
            commandQueryRails: 'API HTTP command/query route rails',
          },
        },
      },
    ]),
    [
      {
        identity: {
          componentId: 'SYS-API-HTTP-ENTRYPOINTS',
          name: 'API HTTP entrypoints',
        },
        publicContract: {
          commandQueryRails: 'API HTTP command/query route rails',
        },
      },
    ]
  );
});
