const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRailVocabularyRows,
  buildCommandQueryRailRows,
  buildCreationIntentRows,
  buildDbSurfaceRows,
  buildRepositoryCommandRows,
  parseArgs,
  readCommandQueryRailRows,
  readCreationIntentRows,
  readDbSurfaceRows,
  readRailVocabularyRows,
  readRepositoryCommandRows,
  runQuery,
} = require('../planning-db-query.cjs');

test('command/query rail query behavior lives in a focused read-model component', () => {
  const commandQueryRailQueryComponent = require('../planning-db/queries/command-query-rail-query.cjs');

  assert.equal(commandQueryRailQueryComponent.buildCommandQueryRailRows, buildCommandQueryRailRows);
  assert.equal(commandQueryRailQueryComponent.buildCreationIntentRows, buildCreationIntentRows);
  assert.equal(commandQueryRailQueryComponent.readCommandQueryRailRows, readCommandQueryRailRows);
  assert.equal(commandQueryRailQueryComponent.readCreationIntentRows, readCreationIntentRows);
});

test('DB surface inventory query behavior lives in a focused read-model component', () => {
  const dbSurfaceInventoryComponent = require('../planning-db/db-surface-inventory.cjs');

  assert.equal(dbSurfaceInventoryComponent.buildDbSurfaceRows, buildDbSurfaceRows);
  assert.equal(dbSurfaceInventoryComponent.readDbSurfaceRows, readDbSurfaceRows);
});

test('rail vocabulary query behavior lives in a focused read-model component', () => {
  const railVocabularyComponent = require('../planning-db/queries/rail-vocabulary-query.cjs');

  assert.equal(railVocabularyComponent.buildRailVocabularyRows, buildRailVocabularyRows);
  assert.equal(railVocabularyComponent.readRailVocabularyRows, readRailVocabularyRows);
});

test('parseArgs parses DB surface inventory query filters', () => {
  const command = parseArgs([
    'db-surfaces',
    '--surface',
    'Architecture design authority',
    '--state',
    'database',
    '--kind',
    'db_command',
    '--limit',
    '5',
  ]);

  assert.equal(command.queryName, 'db-surfaces');
  assert.equal(command.filters.surface, 'Architecture design authority');
  assert.equal(command.filters.state, 'database');
  assert.equal(command.filters.kind, 'db_command');
  assert.equal(command.filters.limit, 5);
});

test('parseArgs parses repository command query filters for database catalog inspection', () => {
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

test('parseArgs parses command/query rail catalog filters for database gap and duplicate inspection', () => {
  const command = parseArgs([
    'command-query-rails',
    '--type',
    'query',
    '--status',
    'missing-backend-rail',
    '--owner',
    'WidgetReadModel',
    '--duplicates',
    'true',
    '--gaps',
    'true',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'command-query-rails',
    filters: {
      type: 'query',
      status: 'missing-backend-rail',
      owner: 'WidgetReadModel',
      duplicates: true,
      gaps: true,
      limit: 5,
    },
  });
});

test('parseArgs maps command/query rail common filter to broad rail search', () => {
  const command = parseArgs(['command-query-rails', '--filter', 'Warehouse', '--limit', '5']);

  assert.deepEqual(command, {
    queryName: 'command-query-rails',
    filters: {
      search: 'Warehouse',
      limit: 5,
    },
  });
});

test('parseArgs parses creation intent preflight filters for AI reuse checks', () => {
  const command = parseArgs([
    'creation-intent',
    '--intent',
    'I want to create ListWidgets',
    '--type',
    'query',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'creation-intent',
    filters: {
      intent: 'I want to create ListWidgets',
      type: 'query',
      limit: 5,
    },
  });
});

test('parseArgs requires an intent before querying creation preflight', () => {
  assert.throws(
    () => parseArgs(['creation-intent', '--limit', '5']),
    /creation-intent requires --intent/
  );
});

test('buildCommandQueryRailRows shows rail implementation, gap, and duplicate state', () => {
  assert.deepEqual(
    buildCommandQueryRailRows([
      {
        rail_type: 'query',
        rail_name: 'ListWidgets',
        ddd_owner: 'WidgetReadModel',
        rail_status: 'declared',
        implementation_ref_count: 2,
        is_gap: false,
        is_duplicate: true,
        feature_id: 'EXAMPLE-FEATURE',
        source_path: 'docs/planning/proposals/mandatory/example.md',
      },
    ]),
    [
      [
        'query',
        'ListWidgets',
        'WidgetReadModel',
        'declared',
        'implemented',
        'duplicate',
        'EXAMPLE-FEATURE',
        'docs/planning/proposals/mandatory/example.md',
      ],
    ]
  );
});

test('buildCreationIntentRows turns rail matches into AI pre-create guidance', () => {
  assert.deepEqual(
    buildCreationIntentRows([
      {
        rail_type: 'query',
        rail_name: 'ListWidgets',
        ddd_owner: 'WidgetReadModel',
        rail_status: 'declared',
        implementation_ref_count: 2,
        documentation_ref_count: 1,
        is_gap: false,
        is_duplicate: false,
        intent_match_score: 42,
        feature_id: 'EXAMPLE-FEATURE',
        source_path: 'docs/planning/proposals/mandatory/example.md',
      },
      {
        rail_type: 'command',
        rail_name: 'CreateWidget',
        ddd_owner: 'WidgetAggregate',
        rail_status: 'planned',
        implementation_ref_count: 0,
        documentation_ref_count: 2,
        is_gap: true,
        is_duplicate: true,
        intent_match_score: 18,
        feature_id: 'WIDGET-FEATURE',
        source_path: 'docs/planning/proposals/mandatory/widget.md',
      },
      {
        rail_type: 'query',
        rail_name: 'ResolveLegacyWidgets',
        ddd_owner: 'LegacyWidgetReadModel',
        rail_status: 'retired',
        implementation_ref_count: 1,
        documentation_ref_count: 1,
        is_gap: false,
        is_duplicate: false,
        intent_match_score: 12,
        feature_id: 'LEGACY-WIDGET-FEATURE',
        source_path: 'docs/planning/proposals/mandatory/legacy-widget.md',
      },
    ]),
    [
      [
        'reuse-existing-rail',
        'query',
        'ListWidgets',
        'WidgetReadModel',
        'declared',
        'implemented',
        '-',
        42,
        'EXAMPLE-FEATURE',
        'docs/planning/proposals/mandatory/example.md',
      ],
      [
        'resolve-duplicate-before-creating',
        'command',
        'CreateWidget',
        'WidgetAggregate',
        'planned',
        'gap',
        'duplicate',
        18,
        'WIDGET-FEATURE',
        'docs/planning/proposals/mandatory/widget.md',
      ],
      [
        'retired-rail-do-not-reuse',
        'query',
        'ResolveLegacyWidgets',
        'LegacyWidgetReadModel',
        'retired',
        'implemented',
        '-',
        12,
        'LEGACY-WIDGET-FEATURE',
        'docs/planning/proposals/mandatory/legacy-widget.md',
      ],
    ]
  );
});

test('buildCreationIntentRows explicitly reports when no existing rail matches', () => {
  assert.deepEqual(buildCreationIntentRows([], { intent: 'Create Widget dashboard' }), [
    [
      'register-new-rail-before-creating',
      '-',
      'Create Widget dashboard',
      '-',
      'no-existing-rail',
      'gap',
      '-',
      0,
      '-',
      'docs/architecture/command-query-rail-governance.md',
    ],
  ]);
});

test('buildRailVocabularyRows shows canonical rail vocabulary findings', () => {
  assert.deepEqual(
    buildRailVocabularyRows([
      {
        finding_kind: 'semantic_duplicate',
        severity: 'error',
        rail_type: 'query',
        rail_name: 'ApiListWidgetsQuery',
        canonical_name: 'ListWidgets',
        bounded_context: 'Planning DB',
        ddd_owner: 'WidgetReadModel',
        rail_status: 'implemented',
        vocabulary_state: 'active',
        duplicate_count: 2,
        action_hint: 'Choose one canonical rail name and deprecate aliases.',
        source_path: 'docs/planning/proposals/mandatory/example.md',
      },
    ]),
    [
      [
        'semantic_duplicate',
        'error',
        'query',
        'ApiListWidgetsQuery',
        'ListWidgets',
        'Planning DB',
        'WidgetReadModel',
        'implemented',
        'active',
        2,
        'Choose one canonical rail name and deprecate aliases.',
        'docs/planning/proposals/mandatory/example.md',
      ],
    ]
  );
});

test('buildDbSurfaceRows shows DB authority and authority mode for operators', () => {
  assert.deepEqual(
    buildDbSurfaceRows([
      {
        surface_name: 'Architecture design authority',
        authority_mode: 'database',
        write_rail_kind: 'db_command',
        read_query_rail: 'pnpm planning:db:query architecture-designs',
        source_ref: 'tools/planning-db/schema.sql',
        database_write_eligible: true,
        revision: 0,
        updated_by: 'migration',
      },
    ]),
    [
      [
        'Architecture design authority',
        'database',
        'db_command',
        'true',
        '0',
        'migration',
        'tools/planning-db/schema.sql',
      ],
    ]
  );
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

test('readCommandQueryRailRows queries the DB command/query rail catalog view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCommandQueryRailRows(client, {
    rail: 'RecordFeatureMechanizationRail',
    type: 'query',
    status: 'missing-backend-rail',
    owner: 'WidgetReadModel',
    gaps: true,
    duplicates: true,
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.command_query_rail_query/);
  assert.match(captured.sql, /rail_type = \$1/);
  assert.match(captured.sql, /rail_status = \$2/);
  assert.match(captured.sql, /ddd_owner = \$3/);
  assert.match(captured.sql, /rail_name = \$4/);
  assert.match(captured.sql, /is_duplicate = \$5/);
  assert.match(captured.sql, /is_gap = \$6/);
  assert.match(captured.sql, /limit \$7/);
  assert.deepEqual(captured.params, [
    'query',
    'missing-backend-rail',
    'WidgetReadModel',
    'RecordFeatureMechanizationRail',
    true,
    true,
    5,
  ]);
});

test('readCommandQueryRailRows filters command/query rails by broad search text', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCommandQueryRailRows(client, {
    search: 'Warehouse',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.command_query_rail_query/);
  assert.match(captured.sql, /lower\(rail_name\) like lower\(\$1\)/);
  assert.match(captured.sql, /lower\(ddd_owner\) like lower\(\$1\)/);
  assert.match(captured.sql, /lower\(feature_id\) like lower\(\$1\)/);
  assert.match(captured.sql, /lower\(source_path\) like lower\(\$1\)/);
  assert.match(captured.sql, /normalized_rail_name like \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['%Warehouse%', '%warehouse%', 5]);
});

test('readCommandQueryRailRows normalizes spaced rail filters for camel-case database terms', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCommandQueryRailRows(client, {
    search: 'Source Import',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.command_query_rail_query/);
  assert.match(captured.sql, /lower\(rail_name\) like lower\(\$1\)/);
  assert.match(captured.sql, /normalized_rail_name like \$2/);
  assert.match(
    captured.sql,
    /regexp_replace\(lower\(coalesce\(ddd_owner, ''\)\), '\[\^a-z0-9\]', '', 'g'\) like \$2/
  );
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['%Source Import%', '%sourceimport%', 5]);
});

test('readCreationIntentRows queries existing rails from the database rail catalog', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCreationIntentRows(client, {
    intent: 'I want to create ListWidgets',
    type: 'query',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.command_query_rail_query/);
  assert.match(captured.sql, /intent_match_score/);
  assert.match(captured.sql, /normalized_rail_name/);
  assert.match(captured.sql, /rail_type = \$4/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'I want to create ListWidgets',
    'i want to create listwidgets',
    ['listwidgets'],
    'query',
    5,
  ]);
});

test('readCreationIntentRows canonicalizes retired execution preview intent aliases', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCreationIntentRows(client, {
    intent: 'PreviewExecutablePlan',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.command_query_rail_query/);
  assert.deepEqual(captured.params, [
    'PreviewExecutablePlan',
    'previewexecutionplan',
    ['previewexecutionplan'],
    5,
  ]);

  await readCreationIntentRows(client, {
    intent: 'previewexecutableplan',
    limit: 5,
  });

  assert.deepEqual(captured.params, [
    'previewexecutableplan',
    'previewexecutionplan',
    ['previewexecutionplan'],
    5,
  ]);
});

test('readDbSurfaceRows queries the database surface inventory view with real predicates', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readDbSurfaceRows(client, {
    surface: 'Architecture design authority',
    state: 'database',
    kind: 'db_command',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.db_governance_surface_query/);
  assert.match(captured.sql, /surface_name = \$1/);
  assert.match(captured.sql, /authority_mode = \$2/);
  assert.match(captured.sql, /write_rail_kind = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['Architecture design authority', 'database', 'db_command', 5]);
});

test('runQuery dispatches DB surface inventory through the DB query rail', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /db_governance_surface_query/);
      return {
        rows: [
          {
            surface_name: 'Architecture design authority',
            authority_mode: 'database',
            write_rail_kind: 'db_command',
            source_ref: 'tools/planning-db/schema.sql',
            database_write_eligible: true,
            revision: 0,
            updated_by: 'migration',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'db-surfaces',
    filters: { state: 'database', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'Architecture design authority',
      'database',
      'db_command',
      'true',
      '0',
      'migration',
      'tools/planning-db/schema.sql',
    ],
  ]);
});

test('runQuery dispatches creation-intent through the AI pre-create rail query', async () => {
  const client = {
    async query() {
      return {
        rows: [
          {
            rail_type: 'query',
            rail_name: 'ListWidgets',
            ddd_owner: 'WidgetReadModel',
            rail_status: 'declared',
            implementation_ref_count: 1,
            documentation_ref_count: 2,
            is_gap: false,
            is_duplicate: false,
            intent_match_score: 75,
            feature_id: 'EXAMPLE-FEATURE',
            source_path: 'docs/planning/proposals/mandatory/example.md',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'creation-intent',
    filters: { intent: 'I want to create ListWidgets', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'reuse-existing-rail',
      'query',
      'ListWidgets',
      'WidgetReadModel',
      'declared',
      'implemented',
      '-',
      75,
      'EXAMPLE-FEATURE',
      'docs/planning/proposals/mandatory/example.md',
    ],
  ]);
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
