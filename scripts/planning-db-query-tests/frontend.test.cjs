const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCanvasUxdbSpecificationRows,
  buildFrontendComponentFileRows,
  buildFrontendComponentRailRows,
  buildFrontendComponentRows,
  buildFrontendMechanicalTruthRows,
  parseArgs,
  readFrontendComponentFileRows,
  readFrontendComponentRailRows,
  readFrontendComponentRows,
  readFrontendMechanicalTruthRows,
  readCanvasUxdbSpecificationRows,
  runQuery,
} = require('../planning-db-query.cjs');

test('frontend mechanical truth query behavior lives in a focused read-model component', () => {
  const frontendMechanicalTruthComponent = require('../planning-db/frontend-mechanical-truth-inventory.cjs');

  assert.equal(
    frontendMechanicalTruthComponent.buildFrontendMechanicalTruthRows,
    buildFrontendMechanicalTruthRows
  );
  assert.equal(
    frontendMechanicalTruthComponent.readFrontendMechanicalTruthRows,
    readFrontendMechanicalTruthRows
  );
});

test('frontend component reflection query behavior lives in a focused read-model component', () => {
  const frontendComponentReflectionComponent = require('../planning-db/frontend-component-inventory.cjs');

  assert.equal(
    frontendComponentReflectionComponent.buildFrontendComponentRows,
    buildFrontendComponentRows
  );
  assert.equal(
    frontendComponentReflectionComponent.buildFrontendComponentFileRows,
    buildFrontendComponentFileRows
  );
  assert.equal(
    frontendComponentReflectionComponent.buildFrontendComponentRailRows,
    buildFrontendComponentRailRows
  );
  assert.equal(
    frontendComponentReflectionComponent.readFrontendComponentRows,
    readFrontendComponentRows
  );
  assert.equal(
    frontendComponentReflectionComponent.readFrontendComponentFileRows,
    readFrontendComponentFileRows
  );
  assert.equal(
    frontendComponentReflectionComponent.readFrontendComponentRailRows,
    readFrontendComponentRailRows
  );
});

test('Canvas UX database specification query behavior lives in a focused read-model component', () => {
  const canvasSpecificationComponent = require('../planning-db/queries/canvas-uxdb-specification-query.cjs');

  assert.equal(
    canvasSpecificationComponent.buildCanvasUxdbSpecificationRows,
    buildCanvasUxdbSpecificationRows
  );
  assert.equal(
    canvasSpecificationComponent.readCanvasUxdbSpecificationRows,
    readCanvasUxdbSpecificationRows
  );
});

test('parseArgs parses frontend mechanical truth filters for database screen inspection', () => {
  const command = parseArgs([
    'frontend-surfaces',
    '--kind',
    'route',
    '--state',
    'preview',
    '--path',
    '/canvas',
    '--owner',
    'Canvas workbench',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'frontend-surfaces',
    filters: {
      kind: 'route',
      state: 'preview',
      path: '/canvas',
      owner: 'Canvas workbench',
      limit: 5,
    },
  });
});

test('parseArgs parses frontend component reflection filters for database component inspection', () => {
  assert.deepEqual(parseArgs(['frontend-components', '--filter', 'SourceImport', '--limit', '5']), {
    queryName: 'frontend-components',
    filters: {
      search: 'SourceImport',
      limit: 5,
    },
  });

  assert.deepEqual(
    parseArgs([
      'frontend-components',
      '--component',
      'web.component.canvas.CanvasToolbar',
      '--kind',
      'route-toolbar',
      '--state',
      'current',
      '--owner',
      'Canvas workbench',
      '--surface',
      'web.canvas.graph',
      '--limit',
      '5',
    ]),
    {
      queryName: 'frontend-components',
      filters: {
        component: 'web.component.canvas.CanvasToolbar',
        kind: 'route-toolbar',
        state: 'current',
        owner: 'Canvas workbench',
        surface: 'web.canvas.graph',
        limit: 5,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'frontend-component-files',
      '--component',
      'web.component.canvas.CanvasToolbar',
      '--kind',
      'component',
      '--path',
      'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
      '--limit',
      '3',
    ]),
    {
      queryName: 'frontend-component-files',
      filters: {
        component: 'web.component.canvas.CanvasToolbar',
        kind: 'component',
        path: 'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
        limit: 3,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'frontend-component-rails',
      '--component',
      'web.component.canvas.CanvasToolbar',
      '--rail',
      'PreviewExecutionPlan',
      '--kind',
      'command',
      '--status',
      'implemented-api',
      '--limit',
      '4',
    ]),
    {
      queryName: 'frontend-component-rails',
      filters: {
        component: 'web.component.canvas.CanvasToolbar',
        rail: 'PreviewExecutionPlan',
        kind: 'command',
        status: 'implemented-api',
        limit: 4,
      },
    }
  );
});

test('runQuery dispatches frontend-surfaces through the screen truth query', async () => {
  const client = {
    async query() {
      return {
        rows: [
          {
            surface_kind: 'route',
            route_path: '/runs',
            surface_id: 'web.runs.list',
            screen_state: 'operational-product',
            frontend_owner: 'Runs workbench',
            registered_plugin_count: 1,
            consumed_endpoint_count: 1,
            zustand_store_count: 2,
            tanstack_query_count: 1,
            capability_gap_count: 2,
            source_path: 'docs/architecture/components/web/frontend-mechanical-truth-inventory.md',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'frontend-surfaces',
    filters: { state: 'operational-product', path: '/runs', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'route',
      '/runs',
      'web.runs.list',
      'operational-product',
      'Runs workbench',
      1,
      1,
      2,
      1,
      2,
      'docs/architecture/components/web/frontend-mechanical-truth-inventory.md',
    ],
  ]);
});

test('runQuery dispatches frontend component reflection through focused queries', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes('frontend_component_file_query')) {
        return {
          rows: [
            {
              component_id: 'web.component.canvas.CanvasToolbar',
              file_path: 'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
              file_role: 'component',
              exported_symbol: 'CanvasToolbar',
            },
          ],
        };
      }
      if (sql.includes('frontend_component_rail_query')) {
        return {
          rows: [
            {
              component_id: 'web.component.canvas.CanvasToolbar',
              rail_name: 'PreviewExecutionPlan',
              rail_kind: 'command',
              rail_status: 'implemented-api',
            },
          ],
        };
      }
      return {
        rows: [
          {
            component_id: 'web.component.canvas.CanvasToolbar',
            component_name: 'CanvasToolbar',
            component_kind: 'route-toolbar',
            component_status: 'current',
            reuse_decision: 'extract',
            surface_count: 1,
            file_count: 3,
            rail_count: 2,
            evidence_count: 2,
            evidence_ref_count: 3,
            source_path: 'docs/architecture/components/web/frontend-component-inventory.md',
          },
        ],
      };
    },
  };

  const componentRows = await runQuery({
    queryName: 'frontend-components',
    filters: { component: 'web.component.canvas.CanvasToolbar', limit: 5 },
    client,
    print: false,
  });
  const fileRows = await runQuery({
    queryName: 'frontend-component-files',
    filters: { component: 'web.component.canvas.CanvasToolbar', limit: 5 },
    client,
    print: false,
  });
  const railRows = await runQuery({
    queryName: 'frontend-component-rails',
    filters: { component: 'web.component.canvas.CanvasToolbar', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(componentRows, [
    [
      'web.component.canvas.CanvasToolbar',
      'CanvasToolbar',
      'route-toolbar',
      'current',
      'extract',
      1,
      3,
      2,
      3,
      'docs/architecture/components/web/frontend-component-inventory.md',
    ],
  ]);
  assert.deepEqual(fileRows, [
    [
      'web.component.canvas.CanvasToolbar',
      'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
      'component',
      'CanvasToolbar',
    ],
  ]);
  assert.deepEqual(railRows, [
    ['web.component.canvas.CanvasToolbar', 'PreviewExecutionPlan', 'command', 'implemented-api'],
  ]);
  assert.equal(calls.length, 3);
});

test('readCanvasUxdbSpecificationRows queries DB-owned TAREA specification records', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCanvasUxdbSpecificationRows(client, {
    taskId: 'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
    recordType: 'context_action',
    component: 'web.component.canvas.CanvasContextMenu',
    rail: 'ResolveCanvasContextMenu',
    state: 'accepted',
    limit: 5,
  });

  assert.match(
    captured.sql,
    /from planning_query_store\.canvas_uxdb_canonical_specification_query/
  );
  assert.match(captured.sql, /canonical_task_id = \$1/);
  assert.match(captured.sql, /record_type = \$2/);
  assert.match(captured.sql, /component_id = \$3/);
  assert.match(captured.sql, /rail_name = \$4/);
  assert.match(captured.sql, /spec_state = \$5/);
  assert.match(captured.sql, /limit \$6/);
  assert.deepEqual(captured.params, [
    'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
    'context_action',
    'web.component.canvas.CanvasContextMenu',
    'ResolveCanvasContextMenu',
    'accepted',
    5,
  ]);
});

test('buildCanvasUxdbSpecificationRows formats component, rail and legacy posture', () => {
  assert.deepEqual(
    buildCanvasUxdbSpecificationRows([
      {
        record_id: 'node-menu.open-workbench',
        record_type: 'context_action',
        record_title: 'Open node workbench',
        canonical_task_id: 'E-CANVAS-NODE-WORKBENCH-1',
        component_id: 'web.component.canvas.NodeWorkbench',
        rail_name: 'OpenCanvasNodeWorkbench',
        spec_state: 'accepted',
        legacy_posture: 'replaces-direct-properties-inputs-tests-actions',
      },
    ]),
    [
      [
        'node-menu.open-workbench',
        'context_action',
        'Open node workbench',
        'E-CANVAS-NODE-WORKBENCH-1',
        'web.component.canvas.NodeWorkbench',
        'OpenCanvasNodeWorkbench',
        'accepted',
        'replaces-direct-properties-inputs-tests-actions',
      ],
    ]
  );
});
