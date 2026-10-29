const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildComponentRoadmapRows,
  buildArchitectureDependencyClassificationRows,
  buildArchitectureDependencyObservationRows,
  buildArchitectureFitnessGapRows,
  buildArchitectureFitnessRows,
  buildArchitecturePathMappingRows,
  parseArgs,
  readComponentRoadmapRows,
  readArchitectureDependencyClassificationRows,
  readArchitectureDependencyObservationRows,
  readArchitectureFitnessGapRows,
  readArchitectureFitnessRows,
  readArchitecturePathMappingRows,
  runQuery,
} = require('../planning-db-query.cjs');

test('component architecture fitness query behavior lives in a focused read-model component', () => {
  const architectureFitnessComponent = require('../planning-db/queries/component-architecture-fitness-query.cjs');

  assert.equal(
    architectureFitnessComponent.buildArchitectureDependencyObservationRows,
    buildArchitectureDependencyObservationRows
  );
  assert.equal(
    architectureFitnessComponent.buildArchitecturePathMappingRows,
    buildArchitecturePathMappingRows
  );
  assert.equal(
    architectureFitnessComponent.buildArchitectureDependencyClassificationRows,
    buildArchitectureDependencyClassificationRows
  );
  assert.equal(
    architectureFitnessComponent.buildArchitectureFitnessRows,
    buildArchitectureFitnessRows
  );
  assert.equal(
    architectureFitnessComponent.buildArchitectureFitnessGapRows,
    buildArchitectureFitnessGapRows
  );
  assert.equal(
    architectureFitnessComponent.readArchitectureDependencyObservationRows,
    readArchitectureDependencyObservationRows
  );
  assert.equal(
    architectureFitnessComponent.readArchitecturePathMappingRows,
    readArchitecturePathMappingRows
  );
  assert.equal(
    architectureFitnessComponent.readArchitectureDependencyClassificationRows,
    readArchitectureDependencyClassificationRows
  );
  assert.equal(
    architectureFitnessComponent.readArchitectureFitnessRows,
    readArchitectureFitnessRows
  );
  assert.equal(
    architectureFitnessComponent.readArchitectureFitnessGapRows,
    readArchitectureFitnessGapRows
  );
});

test('parseArgs keeps architecture fitness state filters on the DB fitness state field', () => {
  const command = parseArgs([
    'architecture-fitness-gaps',
    '--state',
    'fail',
    '--kind',
    'undeclared_dependency',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'architecture-fitness-gaps',
    filters: {
      state: 'fail',
      kind: 'undeclared_dependency',
      limit: 5,
    },
  });
});

test('parseArgs parses component roadmap query filters', () => {
  assert.deepEqual(
    parseArgs([
      'component-roadmap',
      '--component',
      'docs/architecture/components/web/index.md',
      '--state',
      'planned',
      '--kind',
      'planned_component_missing_db_component',
      '--path',
      'docs/planning/proposals/mandatory/governance-and-docs/example.md',
      '--gaps',
      'true',
      '--limit',
      '9',
    ]),
    {
      queryName: 'component-roadmap',
      filters: {
        component: 'docs/architecture/components/web/index.md',
        state: 'planned',
        kind: 'planned_component_missing_db_component',
        path: 'docs/planning/proposals/mandatory/governance-and-docs/example.md',
        gaps: true,
        limit: 9,
      },
    }
  );
});

test('buildComponentRoadmapRows exposes implementation, planning, and gap state', () => {
  const rows = buildComponentRoadmapRows([
    {
      component_id: 'SYS-WEB-ROOT',
      component_name: 'Web Root',
      implementation_state: 'implemented',
      planning_state: 'programmed',
      gap_kind: 'none',
      architecture_status: 'accepted',
      engineering_quality_state: 'pass',
      planned_feature_count: 2,
      implemented_feature_count: 1,
      source_path: 'docs/architecture/components/web/index.md',
    },
  ]);

  assert.deepEqual(rows, [
    [
      'SYS-WEB-ROOT',
      'Web Root',
      'implemented',
      'programmed',
      'none',
      'accepted',
      'pass',
      2,
      1,
      'docs/architecture/components/web/index.md',
    ],
  ]);
});

test('buildArchitectureFitnessRows exposes rule, state, and evidence subject', () => {
  const rows = buildArchitectureFitnessRows([
    {
      scan_id: 'scan-1',
      design_id: 'design-21-component-architecture-fitness-dbfirst',
      fitness_rule_id: 'DVT-ARCH-003',
      subject_kind: 'observation',
      subject_id: 'obs-1',
      result_state: 'fail',
      severity: 'error',
      reason: 'Observed internal dependency is not declared.',
    },
  ]);

  assert.deepEqual(rows, [
    [
      'scan-1',
      'design-21-component-architecture-fitness-dbfirst',
      'DVT-ARCH-003',
      'observation',
      'obs-1',
      'fail',
      'error',
      'Observed internal dependency is not declared.',
    ],
  ]);
});

test('buildArchitectureFitnessGapRows exposes prioritized architecture gap groups', () => {
  const rows = buildArchitectureFitnessGapRows([
    {
      scan_id: 'scan-1',
      design_id: 'design-21-component-architecture-fitness-dbfirst',
      gap_kind: 'unmapped_source',
      fitness_state: 'fail',
      severity: 'error',
      source_prefix: 'apps/api/src',
      target_prefix: '-',
      source_component_id: null,
      target_component_id: null,
      relation_type: 'depends_on',
      observation_count: 42,
      test_observation_count: 3,
      sample_source_path: 'apps/api/src/application/ports/auth.ts',
      sample_import_literal: '@dvt/contracts',
      action_hint: 'Record or refine architecture.component ownership for the source prefix.',
    },
  ]);

  assert.deepEqual(rows, [
    [
      'scan-1',
      'design-21-component-architecture-fitness-dbfirst',
      'unmapped_source',
      'fail',
      'error',
      'apps/api/src',
      '-',
      '-',
      '-',
      'depends_on',
      42,
      3,
      'apps/api/src/application/ports/auth.ts',
      '@dvt/contracts',
      'Record or refine architecture.component ownership for the source prefix.',
    ],
  ]);
});

test('readArchitectureDependencyClassificationRows queries observed-vs-declared DB facts', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureDependencyClassificationRows(client, {
    design: 'design-21-component-architecture-fitness-dbfirst',
    scan: 'scan-1',
    classification: 'undeclared_dependency',
    component: 'SYS-WEB-ROOT',
    limit: 9,
  });

  assert.match(captured.sql, /from architecture\.component_dependency_classification_query/);
  assert.match(captured.sql, /design_id = \$1/);
  assert.match(captured.sql, /scan_id = \$2/);
  assert.match(captured.sql, /dependency_classification = \$3/);
  assert.match(captured.sql, /\(source_component_id = \$4 or target_component_id = \$4\)/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'design-21-component-architecture-fitness-dbfirst',
    'scan-1',
    'undeclared_dependency',
    'SYS-WEB-ROOT',
    9,
  ]);
});

test('readArchitectureFitnessGapRows queries DB-owned prioritized architecture gaps', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureFitnessGapRows(client, {
    design: 'design-21-component-architecture-fitness-dbfirst',
    scan: 'scan-1',
    kind: 'unmapped_source',
    state: 'fail',
    severity: 'error',
    component: 'SYS-WEB-ROOT',
    limit: 8,
  });

  assert.match(captured.sql, /from architecture\.component_fitness_gap_summary_query/);
  assert.match(captured.sql, /design_id = \$1/);
  assert.match(captured.sql, /scan_id = \$2/);
  assert.match(captured.sql, /gap_kind = \$3/);
  assert.match(captured.sql, /fitness_state = \$4/);
  assert.match(captured.sql, /severity = \$5/);
  assert.match(captured.sql, /\(source_component_id = \$6 or target_component_id = \$6\)/);
  assert.match(captured.sql, /limit \$7/);
  assert.deepEqual(captured.params, [
    'design-21-component-architecture-fitness-dbfirst',
    'scan-1',
    'unmapped_source',
    'fail',
    'error',
    'SYS-WEB-ROOT',
    8,
  ]);
});

test('runQuery dispatches architecture-fitness through the database fitness read model', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /component_fitness_query/);
      return {
        rows: [
          {
            scan_id: 'scan-1',
            design_id: 'design-21-component-architecture-fitness-dbfirst',
            fitness_rule_id: 'DVT-ARCH-003',
            subject_kind: 'observation',
            subject_id: 'obs-1',
            result_state: 'fail',
            severity: 'error',
            reason: 'Observed internal dependency is not declared.',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'architecture-fitness',
    filters: { rule: 'DVT-ARCH-003', state: 'fail', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'scan-1',
      'design-21-component-architecture-fitness-dbfirst',
      'DVT-ARCH-003',
      'observation',
      'obs-1',
      'fail',
      'error',
      'Observed internal dependency is not declared.',
    ],
  ]);
});

test('runQuery dispatches architecture-fitness-gaps through the database summary read model', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /component_fitness_gap_summary_query/);
      return {
        rows: [
          {
            scan_id: 'scan-1',
            design_id: 'design-21-component-architecture-fitness-dbfirst',
            gap_kind: 'undeclared_dependency',
            fitness_state: 'fail',
            severity: 'error',
            source_prefix: 'apps/web/src',
            target_prefix: 'packages/@dvt/contracts/src',
            source_component_id: 'SYS-WEB',
            target_component_id: 'SYS-CONTRACTS',
            relation_type: 'depends_on',
            observation_count: 2,
            test_observation_count: 0,
            sample_source_path: 'apps/web/src/app/App.tsx',
            sample_import_literal: '@dvt/contracts',
            action_hint: 'Record architecture.component_relation or refactor the dependency.',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'architecture-fitness-gaps',
    filters: { kind: 'undeclared_dependency', state: 'fail', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'scan-1',
      'design-21-component-architecture-fitness-dbfirst',
      'undeclared_dependency',
      'fail',
      'error',
      'apps/web/src',
      'packages/@dvt/contracts/src',
      'SYS-WEB',
      'SYS-CONTRACTS',
      'depends_on',
      2,
      0,
      'apps/web/src/app/App.tsx',
      '@dvt/contracts',
      'Record architecture.component_relation or refactor the dependency.',
    ],
  ]);
});

test('readComponentRoadmapRows queries the database component roadmap with gap filters', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentRoadmapRows(client, {
    component: 'docs/architecture/components/web/index.md',
    state: 'planned',
    kind: 'planned_component_missing_db_component',
    path: 'docs/planning/proposals/mandatory/governance-and-docs/example.md',
    gaps: true,
    limit: 7,
  });

  assert.match(captured.sql, /from planning_query_store\.component_roadmap_query/);
  assert.match(captured.sql, /\(component_id = \$1 or component_ref = \$1\)/);
  assert.match(captured.sql, /implementation_state = \$2/);
  assert.match(captured.sql, /gap_kind = \$3/);
  assert.match(captured.sql, /source_path = \$4/);
  assert.match(captured.sql, /gap_kind <> 'none'/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'docs/architecture/components/web/index.md',
    'planned',
    'planned_component_missing_db_component',
    'docs/planning/proposals/mandatory/governance-and-docs/example.md',
    7,
  ]);
});

test('runQuery dispatches component-roadmap through the database component map', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /component_roadmap_query/);
      return {
        rows: [
          {
            component_id: 'docs/architecture/components/web/index.md',
            component_name: 'docs/architecture/components/web/index.md',
            implementation_state: 'planned',
            planning_state: 'open',
            gap_kind: 'planned_component_missing_db_component',
            architecture_status: 'missing',
            engineering_quality_state: 'missing',
            planned_feature_count: 1,
            implemented_feature_count: 0,
            source_path: 'docs/planning/proposals/mandatory/governance-and-docs/example.md',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'component-roadmap',
    filters: { state: 'planned', gaps: true, limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'docs/architecture/components/web/index.md',
      'docs/architecture/components/web/index.md',
      'planned',
      'open',
      'planned_component_missing_db_component',
      'missing',
      'missing',
      1,
      0,
      'docs/planning/proposals/mandatory/governance-and-docs/example.md',
    ],
  ]);
});
