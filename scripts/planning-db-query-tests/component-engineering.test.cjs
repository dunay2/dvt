const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildComponentIntegrityRows,
  parseArgs,
  readComponentEngineeringComponentDriftRows,
  readComponentEngineeringComponentMetadataRows,
  readComponentIntegrityRows,
  readComponentEngineeringQualityRows,
  readComponentEngineeringRecordRows,
  readComponentEngineeringRuleCatalogRows,
  readComponentEngineeringRuleEvaluationRows,
  resolveQueryName,
} = require('../planning-db-query.cjs');

test('component integrity query behavior lives in a focused read-model component', () => {
  const componentIntegrityComponent = require('../planning-db/queries/component-integrity-query.cjs');

  assert.equal(
    componentIntegrityComponent.buildComponentIntegrityRows,
    buildComponentIntegrityRows
  );
  assert.equal(componentIntegrityComponent.readComponentIntegrityRows, readComponentIntegrityRows);
});

test('parseArgs parses component integrity and rail vocabulary validation filters', () => {
  assert.deepEqual(
    parseArgs([
      'component-integrity',
      '--component',
      'SYS-WEB-ROOT',
      '--kind',
      'fitness_gap',
      '--state',
      'fail',
      '--severity',
      'error',
      '--limit',
      '5',
    ]),
    {
      queryName: 'component-integrity',
      filters: {
        component: 'SYS-WEB-ROOT',
        kind: 'fitness_gap',
        state: 'fail',
        severity: 'error',
        limit: 5,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'rail-vocabulary',
      '--rail',
      'ApiCreateWidget',
      '--kind',
      'surface_named_rail',
      '--state',
      'active',
      '--limit',
      '5',
    ]),
    {
      queryName: 'rail-vocabulary',
      filters: {
        rail: 'ApiCreateWidget',
        kind: 'surface_named_rail',
        state: 'active',
        limit: 5,
      },
    }
  );

  assert.equal(resolveQueryName('rail-duplicates'), 'rail-duplicates');
  assert.equal(resolveQueryName('filesystem-coverage'), 'filesystem-coverage');
  assert.equal(resolveQueryName('component-validation'), 'component-validation');
});

test('buildComponentIntegrityRows shows component validation findings', () => {
  assert.deepEqual(
    buildComponentIntegrityRows([
      {
        finding_kind: 'fitness_gap',
        severity: 'error',
        component_id: 'SYS-WEB-ROOT',
        component_name: 'Web root',
        finding_state: 'fail',
        path: 'apps/web/src/App.tsx',
        related_component_id: 'SYS-WEB-APP-BOOTSTRAP',
        relation_id: 'REL-AUTO-WEB-ROOT-WEB-APP-BOOTSTRAP',
        evidence_count: 31,
        action_hint: 'Record architecture.component_relation or refactor the dependency.',
        source_view: 'architecture.component_fitness_gap_summary_query',
      },
    ]),
    [
      [
        'fitness_gap',
        'error',
        'SYS-WEB-ROOT',
        'Web root',
        'fail',
        'apps/web/src/App.tsx',
        'SYS-WEB-APP-BOOTSTRAP',
        'REL-AUTO-WEB-ROOT-WEB-APP-BOOTSTRAP',
        31,
        'Record architecture.component_relation or refactor the dependency.',
        'architecture.component_fitness_gap_summary_query',
      ],
    ]
  );
});

test('parseArgs parses component engineering record filters for database governance inspection', () => {
  const command = parseArgs(['cer', '--component', 'SYS-API-HTTP-ENTRYPOINTS', '--limit', '1']);

  assert.deepEqual(command, {
    queryName: 'cer',
    filters: {
      component: 'SYS-API-HTTP-ENTRYPOINTS',
      limit: 1,
    },
  });
});

test('parseArgs parses component engineering record schema version filters', () => {
  const command = parseArgs([
    'cer',
    '--component',
    'SYS-API-HTTP-ENTRYPOINTS',
    '--schema-version',
    'v2',
    '--limit',
    '1',
  ]);

  assert.deepEqual(command, {
    queryName: 'cer',
    filters: {
      component: 'SYS-API-HTTP-ENTRYPOINTS',
      schemaVersion: 'v2',
      limit: 1,
    },
  });
});

test('parseArgs parses component engineering rule filters', () => {
  assert.deepEqual(
    parseArgs(['component-tree', '--children-of', 'SYS-RUNTIME-ENGINE-CORE', '--limit', '20']),
    {
      queryName: 'component-tree',
      filters: {
        parentUnit: 'SYS-RUNTIME-ENGINE-CORE',
        limit: 20,
      },
    }
  );

  assert.deepEqual(parseArgs(['component-tree', '--parent-unit', 'SYS-RUNTIME-ENGINE-CORE']), {
    queryName: 'component-tree',
    filters: {
      parentUnit: 'SYS-RUNTIME-ENGINE-CORE',
    },
  });

  assert.deepEqual(parseArgs(['component-rules', '--kind', 'responsibility', '--limit', '5']), {
    queryName: 'component-rules',
    filters: {
      kind: 'responsibility',
      limit: 5,
    },
  });

  assert.deepEqual(
    parseArgs([
      'component-rule-evaluations',
      '--component',
      'SYS-RUNTIME-ENGINE-CORE',
      '--state',
      'fail',
      '--kind',
      'CEI-ID-002',
      '--limit',
      '5',
    ]),
    {
      queryName: 'component-rule-evaluations',
      filters: {
        component: 'SYS-RUNTIME-ENGINE-CORE',
        governanceState: 'fail',
        kind: 'CEI-ID-002',
        limit: 5,
      },
    }
  );

  assert.deepEqual(parseArgs(['component-quality', '--component', 'SYS-RUNTIME-ENGINE-CORE']), {
    queryName: 'component-quality',
    filters: {
      component: 'SYS-RUNTIME-ENGINE-CORE',
    },
  });

  assert.deepEqual(
    parseArgs([
      'component-metadata',
      '--component',
      'SYS-RUNTIME-ENGINE-CORE',
      '--state',
      'coverage-required',
      '--no-refresh',
    ]),
    {
      queryName: 'component-metadata',
      autoImportGovernance: false,
      filters: {
        component: 'SYS-RUNTIME-ENGINE-CORE',
        governanceState: 'coverage-required',
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'component-metadata',
      '--component',
      'SYS-RUNTIME-ENGINE-CORE',
      '--state',
      'coverage-required',
      '--refresh',
      '--confirm-expensive-governance-refresh',
    ]),
    {
      queryName: 'component-metadata',
      autoImportGovernance: true,
      filters: {
        component: 'SYS-RUNTIME-ENGINE-CORE',
        governanceState: 'coverage-required',
      },
    }
  );
});

test('parseArgs rejects unsupported component engineering record schema versions', () => {
  assert.throws(
    () => parseArgs(['cer', '--schema-version', 'v3']),
    /Invalid --schema-version "v3". Expected v1 or v2./
  );
});

test('readComponentEngineeringComponentMetadataRows queries the stable component metadata schema view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringComponentMetadataRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    governanceState: 'coverage-required',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.component_metadata_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /governance_state = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-CORE', 'coverage-required', 5]);
});

test('readComponentEngineeringComponentDriftRows queries the DB component drift view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringComponentDriftRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.component_drift_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-CORE', 5]);
});

test('readComponentEngineeringRuleCatalogRows queries DB-backed component rules', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringRuleCatalogRows(client, {
    kind: 'responsibility',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.rule_catalog_query/);
  assert.match(captured.sql, /category = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['responsibility', 5]);
});

test('readComponentEngineeringRuleEvaluationRows queries DB-backed rule evaluations', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringRuleEvaluationRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    governanceState: 'fail',
    kind: 'CEI-ID-002',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.rule_evaluation_query/);
  assert.match(captured.sql, /subject_id = \$1/);
  assert.match(captured.sql, /evaluation_state = \$2/);
  assert.match(captured.sql, /rule_id = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-CORE', 'fail', 'CEI-ID-002', 5]);
});

test('readComponentEngineeringQualityRows queries DB-backed component quality rollups', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringQualityRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.component_quality_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-CORE', 5]);
});

test('readComponentEngineeringRecordRows queries the DB CER view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringRecordRows(client, {
    component: 'SYS-API-HTTP-ENTRYPOINTS',
    limit: 1,
  });

  assert.match(
    captured.sql,
    /from planning_query_store\.governance_component_engineering_record_query/
  );
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['SYS-API-HTTP-ENTRYPOINTS', 1]);
});

test('readComponentEngineeringRecordRows queries the DB CER v2 view when requested', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringRecordRows(client, {
    component: 'SYS-API-HTTP-ENTRYPOINTS',
    schemaVersion: 'v2',
    limit: 1,
  });

  assert.match(
    captured.sql,
    /from planning_query_store\.governance_component_engineering_record_v2_query/
  );
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['SYS-API-HTTP-ENTRYPOINTS', 1]);
});
