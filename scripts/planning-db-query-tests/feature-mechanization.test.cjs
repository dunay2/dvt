const test = require('node:test');
const assert = require('node:assert/strict');
const { runPlanningDbQueryCli } = require('./helpers.cjs');

const {
  buildFeatureMechanizationComponentRows,
  buildFeatureMechanizationFeatureRows,
  buildFeatureMechanizationRailRows,
  buildFeatureMechanizationSymbolRows,
  buildFeatureMechanizationValidationRows,
  parseArgs,
  readFeatureMechanizationComponentRows,
  readFeatureMechanizationFeatureRows,
  readFeatureMechanizationRailRows,
  readFeatureMechanizationSymbolRows,
  readFeatureMechanizationValidationRows,
} = require('../planning-db-query.cjs');

test('planning DB query CLI prints feature mechanization help without unsupported filter examples', () => {
  const result = runPlanningDbQueryCli(['feature-mechanization-components', '--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB query: feature-mechanization-components/);
  assert.match(result.stdout, /--state implemented/);
  assert.doesNotMatch(result.stdout, /--filter E-PROP-DISP-1/);
  assert.doesNotMatch(result.stderr, /Unknown planning DB query|Missing value/);
});

test('feature mechanization query behavior lives in a focused read-model component', () => {
  const featureMechanizationQueryComponent = require('../planning-db/queries/feature-mechanization-query.cjs');

  assert.equal(
    featureMechanizationQueryComponent.buildFeatureMechanizationFeatureRows,
    buildFeatureMechanizationFeatureRows
  );
  assert.equal(
    featureMechanizationQueryComponent.buildFeatureMechanizationComponentRows,
    buildFeatureMechanizationComponentRows
  );
  assert.equal(
    featureMechanizationQueryComponent.buildFeatureMechanizationSymbolRows,
    buildFeatureMechanizationSymbolRows
  );
  assert.equal(
    featureMechanizationQueryComponent.buildFeatureMechanizationRailRows,
    buildFeatureMechanizationRailRows
  );
  assert.equal(
    featureMechanizationQueryComponent.buildFeatureMechanizationValidationRows,
    buildFeatureMechanizationValidationRows
  );
  assert.equal(
    featureMechanizationQueryComponent.readFeatureMechanizationFeatureRows,
    readFeatureMechanizationFeatureRows
  );
  assert.equal(
    featureMechanizationQueryComponent.readFeatureMechanizationComponentRows,
    readFeatureMechanizationComponentRows
  );
  assert.equal(
    featureMechanizationQueryComponent.readFeatureMechanizationSymbolRows,
    readFeatureMechanizationSymbolRows
  );
  assert.equal(
    featureMechanizationQueryComponent.readFeatureMechanizationRailRows,
    readFeatureMechanizationRailRows
  );
  assert.equal(
    featureMechanizationQueryComponent.readFeatureMechanizationValidationRows,
    readFeatureMechanizationValidationRows
  );
});

test('parseArgs parses feature mechanization DB-first query filters', () => {
  assert.deepEqual(parseArgs(['feature-mechanization', '--limit', '10']), {
    queryName: 'feature-mechanization',
    filters: {
      limit: 10,
    },
  });

  assert.deepEqual(
    parseArgs(['feature-mechanization', '--filter', 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1']),
    {
      queryName: 'feature-mechanization',
      filters: {
        featureId: 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      },
    }
  );

  assert.deepEqual(
    parseArgs(['feature-mechanization-components', '--state', 'implemented', '--limit', '10']),
    {
      queryName: 'feature-mechanization-components',
      filters: {
        state: 'implemented',
        limit: 10,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'feature-mechanization-symbols',
      '--path',
      'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
      '--limit',
      '10',
    ]),
    {
      queryName: 'feature-mechanization-symbols',
      filters: {
        path: 'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
        limit: 10,
      },
    }
  );

  assert.deepEqual(
    parseArgs(['feature-mechanization-rails', '--rail', 'ListFeatureMechanizationRails']),
    {
      queryName: 'feature-mechanization-rails',
      filters: {
        rail: 'ListFeatureMechanizationRails',
      },
    }
  );

  assert.deepEqual(parseArgs(['feature-mechanization-validations', '--kind', 'completion']), {
    queryName: 'feature-mechanization-validations',
    filters: {
      kind: 'completion',
    },
  });
});

test('feature mechanization row builders expose DB-first operator views', () => {
  assert.deepEqual(
    buildFeatureMechanizationFeatureRows([
      {
        feature_id: 'FEATURE-ONE',
        mechanization_status: 'implemented',
        implementation_plan: 'docs/planning/example.md',
        component_count: 2,
        rail_count: 3,
        symbol_count: 4,
        validation_count: 5,
        source_paths: [
          'docs/planning/example.md',
          'tools/planning-db/migrations/620_feature_mechanization_feature_set_union.sql',
        ],
      },
    ]),
    [
      [
        'FEATURE-ONE',
        'implemented',
        'docs/planning/example.md',
        2,
        3,
        4,
        5,
        '["docs/planning/example.md","tools/planning-db/migrations/620_feature_mechanization_feature_set_union.sql"]',
      ],
    ]
  );

  assert.deepEqual(
    buildFeatureMechanizationComponentRows([
      {
        feature_id: 'FEATURE-ONE',
        mechanization_status: 'implemented',
        component_ref: 'docs/architecture/components/web/example.md',
        source_path: 'docs/planning/example.md',
      },
    ]),
    [
      [
        'FEATURE-ONE',
        'implemented',
        'docs/architecture/components/web/example.md',
        'docs/planning/example.md',
      ],
    ]
  );

  assert.deepEqual(
    buildFeatureMechanizationSymbolRows([
      {
        feature_id: 'FEATURE-ONE',
        symbol_name: 'readFeatureMechanizationFeatureRows',
        symbol_path: 'scripts/planning-db/queries/feature-mechanization-query.cjs',
        ddd_owner: 'Planning DB governance read model',
        cq_rails: ['ListFeatureMechanizationFeatures'],
        source_path: 'docs/planning/example.md',
      },
    ]),
    [
      [
        'FEATURE-ONE',
        'readFeatureMechanizationFeatureRows',
        'scripts/planning-db/queries/feature-mechanization-query.cjs',
        'Planning DB governance read model',
        '["ListFeatureMechanizationFeatures"]',
        'docs/planning/example.md',
      ],
    ]
  );

  assert.deepEqual(
    buildFeatureMechanizationRailRows([
      {
        feature_id: 'FEATURE-ONE',
        rail_type: 'query',
        rail_name: 'ListFeatureMechanizationFeatures',
        ddd_owner: 'Planning DB governance read model',
        rail_status: 'implemented',
        rail_source: 'imported',
        source_path: 'docs/planning/example.md',
      },
    ]),
    [
      [
        'FEATURE-ONE',
        'query',
        'ListFeatureMechanizationFeatures',
        'Planning DB governance read model',
        'implemented',
        'imported',
        'docs/planning/example.md',
      ],
    ]
  );

  assert.deepEqual(
    buildFeatureMechanizationValidationRows([
      {
        feature_id: 'FEATURE-ONE',
        validation_kind: 'completion',
        validation_ref: 'node --test scripts/planning-db-query.test.cjs',
        source_path: 'docs/planning/example.md',
      },
    ]),
    [
      [
        'FEATURE-ONE',
        'completion',
        'node --test scripts/planning-db-query.test.cjs',
        'docs/planning/example.md',
      ],
    ]
  );
});

test('feature mechanization readers query DB-first manifest projections', async () => {
  const captured = [];
  const client = {
    async query(sql, params) {
      captured.push({ sql, params });
      return { rows: [] };
    },
  };

  await readFeatureMechanizationFeatureRows(client, {
    featureId: 'FEATURE-ONE',
    state: 'implemented',
    path: 'docs/planning/example.md',
    limit: 5,
  });
  await readFeatureMechanizationComponentRows(client, { state: 'implemented', limit: 6 });
  await readFeatureMechanizationSymbolRows(client, {
    path: 'scripts/planning-db/queries/feature-mechanization-query.cjs',
    limit: 7,
  });
  await readFeatureMechanizationRailRows(client, {
    rail: 'ListFeatureMechanizationRails',
    type: 'query',
    limit: 8,
  });
  await readFeatureMechanizationValidationRows(client, { kind: 'completion', limit: 9 });

  const sqlText = captured.map((entry) => entry.sql).join('\n');

  assert.equal(captured.length, 5);
  assert.match(sqlText, /from planning_query_store\.command_query_rail_manifest_query/);
  assert.match(sqlText, /distinct on \(rail\.rail_id\)/);
  assert.match(sqlText, /raw_manifest \? 'featureId'/);
  assert.match(captured[0].sql, /manifest\.feature_id = \$1/);
  assert.match(captured[0].sql, /manifest\.mechanization_status = \$2/);
  assert.match(captured[0].sql, /manifest\.source_path = \$3/);
  assert.match(captured[0].sql, /count\(distinct filtered_rails\.rail_id\)/);
  assert.match(captured[0].sql, /count\(distinct component_ref\.value\)/);
  assert.match(captured[0].sql, /count\(distinct symbol_key\)/);
  assert.match(captured[0].sql, /count\(distinct validation_ref\)/);
  assert.match(
    captured[0].sql,
    /jsonb_agg\(\s*distinct filtered_rails\.source_path order by filtered_rails\.source_path\s*\)/
  );
  assert.deepEqual(captured[0].params, [
    'FEATURE-ONE',
    'implemented',
    'docs/planning/example.md',
    5,
  ]);
  assert.match(captured[1].sql, /jsonb_array_elements_text/);
  assert.match(captured[1].sql, /componentGuides/);
  assert.deepEqual(captured[1].params, ['implemented', 6]);
  assert.match(captured[2].sql, /jsonb_array_elements/);
  assert.match(captured[2].sql, /symbols/);
  assert.match(captured[2].sql, /filtered_manifests as/);
  assert.match(
    captured[2].sql,
    /distinct on \(symbol_rows\.feature_id, symbol_path, symbol_name\)/
  );
  assert.match(captured[2].sql, /manifest\.raw_manifest @> jsonb_build_object/);
  assert.match(captured[2].sql, /symbol_ref\.value->>'path' = \$1/);
  assert.deepEqual(captured[2].params, [
    'scripts/planning-db/queries/feature-mechanization-query.cjs',
    7,
  ]);
  assert.match(captured[3].sql, /rail\.rail_type = \$1/);
  assert.match(captured[3].sql, /rail\.rail_name = \$2/);
  assert.match(captured[3].sql, /raw_manifest \? 'featureId'/);
  assert.deepEqual(captured[3].params, ['query', 'ListFeatureMechanizationRails', 8]);
  assert.match(captured[4].sql, /validation_rows\.validation_kind = \$1/);
  assert.match(captured[4].sql, /completionGate/);
  assert.deepEqual(captured[4].params, ['completion', 9]);
});
