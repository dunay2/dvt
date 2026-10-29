const test = require('node:test');
const assert = require('node:assert/strict');
const { runPlanningDbQueryCli } = require('./helpers.cjs');

const {
  buildCanvasComponentRegistryDriftRows,
  parseArgs,
  readCanvasComponentRegistryDriftRows,
} = require('../planning-db-query.cjs');

test('planning DB query CLI prints Canvas component registry drift help', () => {
  const result = runPlanningDbQueryCli(['canvas-component-registry-drift', '--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB query: canvas-component-registry-drift/);
  assert.match(result.stdout, /--state unmapped_canvas_component_file/);
  assert.match(result.stdout, /--component web\.component\.canvas\.CanvasViewport/);
  assert.doesNotMatch(result.stderr, /Unknown planning DB query|Missing value/);
});

test('Canvas component registry drift query behavior lives in a focused read-model component', () => {
  const canvasComponentRegistryDriftQueryComponent = require('../planning-db/queries/canvas-component-registry-drift-query.cjs');

  assert.equal(
    canvasComponentRegistryDriftQueryComponent.buildCanvasComponentRegistryDriftRows,
    buildCanvasComponentRegistryDriftRows
  );
  assert.equal(
    canvasComponentRegistryDriftQueryComponent.readCanvasComponentRegistryDriftRows,
    readCanvasComponentRegistryDriftRows
  );
});

test('parseArgs parses Canvas component registry drift filters', () => {
  assert.deepEqual(
    parseArgs([
      'canvas-component-registry-drift',
      '--state',
      'unmapped_canvas_component_file',
      '--path',
      'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
      '--component',
      'web.component.canvas.DbtNodeCard',
      '--kind',
      'node-card',
      '--severity',
      'blocker',
      '--limit',
      '10',
    ]),
    {
      queryName: 'canvas-component-registry-drift',
      filters: {
        component: 'web.component.canvas.DbtNodeCard',
        kind: 'node-card',
        limit: 10,
        path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        severity: 'blocker',
        state: 'unmapped_canvas_component_file',
      },
    }
  );
});

test('parseArgs maps Canvas component registry drift common filter to component', () => {
  assert.deepEqual(
    parseArgs([
      'canvas-component-registry-drift',
      '--filter',
      'web.component.canvas.GraphNodeCard',
      '--limit',
      '20',
    ]),
    {
      queryName: 'canvas-component-registry-drift',
      filters: {
        component: 'web.component.canvas.GraphNodeCard',
        limit: 20,
      },
    }
  );
});

test('buildCanvasComponentRegistryDriftRows formats registry drift findings', () => {
  assert.deepEqual(
    buildCanvasComponentRegistryDriftRows([
      {
        severity: 'blocker',
        drift_state: 'unmapped_canvas_component_file',
        file_path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        expected_component_id: 'web.component.canvas.DbtNodeCard',
        registered_component_ids: [],
        surface_role: 'node-card',
        action_hint:
          'Register the Canvas file in frontend_component_local_files before changing UI behavior.',
      },
    ]),
    [
      [
        'blocker',
        'unmapped_canvas_component_file',
        'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        'web.component.canvas.DbtNodeCard',
        '[]',
        'node-card',
        'Register the Canvas file in frontend_component_local_files before changing UI behavior.',
      ],
    ]
  );
});

test('readCanvasComponentRegistryDriftRows queries DB-owned Canvas registry drift', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCanvasComponentRegistryDriftRows(client, {
    component: 'web.component.canvas.DbtNodeCard',
    kind: 'node-card',
    path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
    severity: 'blocker',
    state: 'unmapped_canvas_component_file',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.canvas_component_registry_drift_query/);
  assert.match(captured.sql, /drift_state = \$1/);
  assert.match(captured.sql, /file_path = \$2/);
  assert.match(captured.sql, /expected_component_id = \$3/);
  assert.match(captured.sql, /surface_role = \$4/);
  assert.match(captured.sql, /severity = \$5/);
  assert.match(captured.sql, /limit \$6/);
  assert.deepEqual(captured.params, [
    'unmapped_canvas_component_file',
    'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
    'web.component.canvas.DbtNodeCard',
    'node-card',
    'blocker',
    5,
  ]);
});

test('readCanvasCqRailDriftRows compares Canvas UX rails with canonical rail catalog', async () => {
  const {
    buildCanvasCqRailDriftRows,
    readCanvasCqRailDriftRows,
  } = require('../planning-db/queries/canvas-cq-rail-drift-query.cjs');
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return {
        rows: [
          {
            record_id: 'canvas-menu.add-source',
            record_type: 'context_action',
            component_id: 'web.component.canvas.CanvasContextMenu',
            requested_rail_name: 'OpenCanvasAddSourceDialog',
            canonical_rail_name: 'OpenCanvasSourceImportDialog',
            rail_type: 'command',
            drift_state: 'legacy_alias',
            severity: 'warning',
            action_hint:
              'Use canonical rail OpenCanvasSourceImportDialog instead of alias OpenCanvasAddSourceDialog.',
          },
        ],
      };
    },
  };

  const rows = await readCanvasCqRailDriftRows(client, {
    state: 'legacy_alias',
    rail: 'OpenCanvasAddSourceDialog',
    component: 'web.component.canvas.CanvasContextMenu',
    taskId: 'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.canvas_cq_rail_drift_query/);
  assert.match(captured.sql, /drift_state = \$1/);
  assert.match(captured.sql, /requested_rail_name = \$2/);
  assert.match(captured.sql, /component_id = \$3/);
  assert.match(captured.sql, /canonical_task_id = \$4/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'legacy_alias',
    'OpenCanvasAddSourceDialog',
    'web.component.canvas.CanvasContextMenu',
    'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
    5,
  ]);
  assert.deepEqual(buildCanvasCqRailDriftRows(rows), [
    [
      'warning',
      'legacy_alias',
      'canvas-menu.add-source',
      'context_action',
      'web.component.canvas.CanvasContextMenu',
      'OpenCanvasAddSourceDialog',
      'OpenCanvasSourceImportDialog',
      'command',
      'Use canonical rail OpenCanvasSourceImportDialog instead of alias OpenCanvasAddSourceDialog.',
    ],
  ]);
});

test('planning DB query CLI exposes Canvas CQ rail drift help', () => {
  const result = runPlanningDbQueryCli(['canvas-cq-rail-drift', '--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB query: canvas-cq-rail-drift/);
  assert.match(result.stdout, /--component <id>/);
  assert.match(result.stdout, /--rail <name>/);
  assert.doesNotMatch(result.stderr, /Unknown planning DB query/);
});
