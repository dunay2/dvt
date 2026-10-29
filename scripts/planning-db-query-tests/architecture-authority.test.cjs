const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildArchitectureComponentRows,
  buildArchitectureDesignRows,
  buildArchitectureIoRows,
  buildArchitectureRelationRows,
  buildArchitectureTestRows,
  buildArchitectureObservabilityRows,
  readArchitectureFlowRows,
  parseArgs,
  readArchitectureComponentRows,
  readArchitectureDesignRows,
  readArchitectureRelationRows,
  readArchitectureTestRows,
  readArchitectureObservabilityRows,
  runQuery,
} = require('../planning-db-query.cjs');

test('parseArgs parses architecture authority query filters', () => {
  assert.deepEqual(
    parseArgs([
      'architecture-designs',
      '--design',
      'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
      '--status',
      'review',
      '--owner',
      'Architecture',
      '--limit',
      '5',
    ]),
    {
      queryName: 'architecture-designs',
      filters: {
        design: 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
        status: 'review',
        owner: 'Architecture',
        limit: 5,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'architecture-components',
      '--component',
      'SYS-RUNTIME-ENGINE-CORE',
      '--kind',
      'module',
      '--layer',
      'application',
    ]),
    {
      queryName: 'architecture-components',
      filters: {
        component: 'SYS-RUNTIME-ENGINE-CORE',
        kind: 'module',
        layer: 'application',
      },
    }
  );
});

test('architecture evidence query exposes provenance and proof state', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /evidence_origin/u);
      assert.match(sql, /verification_state/u);
      return {
        rows: [
          {
            evidence_id: 'EVIDENCE-LOCAL-TEST',
            design_id: 'DESIGN-LOCAL-TEST',
            subject_kind: 'test',
            subject_id: 'TEST-DB-FIRST',
            evidence_kind: 'test',
            evidence_origin: 'local_execution',
            result_state: 'pass',
            verification_state: 'verified',
            freshness_state: 'fresh',
            source_ref: 'pnpm test',
            source_path: 'scripts/example.test.cjs',
            source_verification_state: 'verified',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'architecture-evidence',
    filters: { limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'EVIDENCE-LOCAL-TEST',
      'DESIGN-LOCAL-TEST',
      'test',
      'TEST-DB-FIRST',
      'test',
      'local_execution',
      'pass',
      'verified',
      'fresh',
      'verified',
      'scripts/example.test.cjs',
      'pnpm test',
    ],
  ]);
});

test('readArchitectureDesignRows queries the DB architecture design authority view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureDesignRows(client, {
    design: 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
    status: 'review',
    owner: 'Architecture',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.design_query/);
  assert.match(captured.sql, /design_id = \$1/);
  assert.match(captured.sql, /status = \$2/);
  assert.match(captured.sql, /owner = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
    'review',
    'Architecture',
    5,
  ]);
});

test('readArchitectureComponentRows queries the DB architecture component view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureComponentRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    kind: 'module',
    layer: 'application',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.component_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /kind = \$2/);
  assert.match(captured.sql, /layer = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-CORE', 'module', 'application', 5]);
});

test('readArchitectureRelationRows queries the DB architecture relation graph view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureRelationRows(client, {
    component: 'SYS-RUNTIME-ENGINE-APPLICATION',
    kind: 'calls',
    status: 'declared',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.component_relation_query/);
  assert.match(captured.sql, /\(source_component_id = \$1 or target_component_id = \$1\)/);
  assert.match(captured.sql, /relation_type = \$2/);
  assert.match(captured.sql, /status = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-APPLICATION', 'calls', 'declared', 5]);
});

test('readArchitectureTestRows queries DB-owned component test evidence', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureTestRows(client, {
    component: 'SYS-RUNTIME-ENGINE-APPLICATION',
    kind: 'integration',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.component_test/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /test_kind = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-APPLICATION', 'integration', 5]);
});

test('buildArchitectureTestRows formats component test evidence', () => {
  assert.deepEqual(
    buildArchitectureTestRows([
      {
        test_id: 'TEST-ENGINE-LIFECYCLE',
        component_id: 'SYS-RUNTIME-ENGINE-APPLICATION',
        test_path: 'packages/@dvt/engine/test/lifecycle.test.ts',
        test_kind: 'integration',
        coverage_level: 'behavior',
        required: true,
        validation_command: 'pnpm --filter @dvt/engine test',
      },
    ]),
    [
      [
        'TEST-ENGINE-LIFECYCLE',
        'SYS-RUNTIME-ENGINE-APPLICATION',
        'packages/@dvt/engine/test/lifecycle.test.ts',
        'integration',
        'behavior',
        'true',
        'pnpm --filter @dvt/engine test',
      ],
    ]
  );
});

test('readArchitectureObservabilityRows queries DB-owned component observability evidence', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureObservabilityRows(client, {
    component: 'SYS-API-OPS-ROUTES',
    kind: 'log',
    state: 'implemented',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.component_observability/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /signal_kind = \$2/);
  assert.match(captured.sql, /status = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['SYS-API-OPS-ROUTES', 'log', 'implemented', 5]);
});

test('buildArchitectureObservabilityRows formats component observability evidence', () => {
  assert.deepEqual(
    buildArchitectureObservabilityRows([
      {
        observability_id: 'OBS-API-OPS-ROUTES-READINESS-DB-PROBE-FAILED',
        component_id: 'SYS-API-OPS-ROUTES',
        signal_name: 'api.health.readiness.database_probe_failed',
        signal_kind: 'log',
        required: true,
        status: 'implemented',
      },
    ]),
    [
      [
        'OBS-API-OPS-ROUTES-READINESS-DB-PROBE-FAILED',
        'SYS-API-OPS-ROUTES',
        'api.health.readiness.database_probe_failed',
        'log',
        'true',
        'implemented',
      ],
    ]
  );
});

test('readArchitectureFlowRows filters component participation through entry, exit, and flow steps', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureFlowRows(client, {
    component: 'SYS-RUNTIME-ENGINE-STATE-STORE',
    kind: 'command',
    status: 'declared',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.component_flow_query flow/);
  assert.match(captured.sql, /flow\.entry_component_id = \$3/);
  assert.match(captured.sql, /flow\.exit_component_id = \$3/);
  assert.match(captured.sql, /from architecture\.component_flow_step_query step/);
  assert.match(captured.sql, /step\.flow_id = flow\.flow_id/);
  assert.match(captured.sql, /step\.component_id = \$3/);
  assert.deepEqual(captured.params, ['command', 'declared', 'SYS-RUNTIME-ENGINE-STATE-STORE', 5]);
});

test('buildArchitecture rows expose Fowler-relevant authority columns', () => {
  assert.deepEqual(
    buildArchitectureDesignRows([
      {
        design_id: 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
        work_item_id: 'DATABASE-AUTHORITY',
        status: 'review',
        owner: 'Architecture',
        rail_ref: 'CreateArchitectureDesign',
        fowler_signal: 'Hidden authority',
      },
    ]),
    [
      [
        'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
        'DATABASE-AUTHORITY',
        'review',
        'Architecture',
        'CreateArchitectureDesign',
        'Hidden authority',
      ],
    ]
  );

  assert.deepEqual(
    buildArchitectureComponentRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        name: 'Runtime engine core',
        kind: 'module',
        layer: 'application',
        owner: 'Architecture',
        status: 'declared',
        maturity_score: 75,
      },
    ]),
    [
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'Runtime engine core',
        'module',
        'application',
        'Architecture',
        'declared',
        75,
      ],
    ]
  );

  assert.deepEqual(
    buildArchitectureIoRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        io_id: 'PORT-ENGINE-START-RUN',
        io_kind: 'port',
        metadata: { portKind: 'command' },
        io_name: 'StartRun',
        direction: 'inbound',
        contract_id: 'CONTRACT-ENGINE-START-RUN',
        runtime: 'node',
      },
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        io_id: 'ADAPTER-ENGINE-TEMPORAL',
        io_kind: 'adapter',
        io_name: 'TemporalProviderAdapter',
        direction: 'outbound',
        runtime: 'node',
      },
    ]),
    [
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'PORT-ENGINE-START-RUN',
        'port',
        'command',
        'StartRun',
        'inbound',
        'CONTRACT-ENGINE-START-RUN',
        'node',
      ],
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'ADAPTER-ENGINE-TEMPORAL',
        'adapter',
        'adapter',
        'TemporalProviderAdapter',
        'outbound',
        '-',
        'node',
      ],
    ]
  );

  assert.deepEqual(
    buildArchitectureRelationRows([
      {
        relation_id: 'REL-1',
        source_component_id: 'A',
        target_component_id: 'B',
        relation_type: 'calls',
        direction: 'outbound',
        sync_async: 'sync',
        status: 'declared',
      },
    ]),
    [['REL-1', 'A', 'B', 'calls', 'outbound', 'sync', 'declared']]
  );
});
