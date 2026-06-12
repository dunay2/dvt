const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildFrontendComponentFileRows,
  buildFrontendComponentRailRows,
  buildFrontendComponentReflectionSnapshot,
  buildFrontendComponentRows,
  normalizeList,
  readFrontendComponentFileRows,
  readFrontendComponentRailRows,
  readFrontendComponentRows,
} = require('./planning-db/frontend-component-inventory.cjs');

function inventoryDocument(content) {
  return {
    path: 'docs/architecture/components/web/frontend-component-inventory.md',
    content,
  };
}

function sampleInventory() {
  return [
    '## Frontend Components',
    '',
    '| Component ID | Component name | Component kind | Component status | Reuse decision | Frontend owner | Responsibility | Package | Route scope | Plugin scope | Capability gaps | Evidence |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    '| `web.component.shell.AppShellFrame` | AppShellFrame | shell-frame | current | reuse | Shell | Render shell frame. | `@dvt/web` | `/` | dbt; monitoring | console semantics | `AppShellFrame.test.tsx`; inventory docs |',
    '| `web.component.canvas.CanvasToolbar` | CanvasToolbar | route-toolbar | current | extract | Canvas | Render canvas commands. | `@dvt/web` | `/canvas` | dbt | readiness projection | `CanvasToolbar.test.tsx` |',
    '',
    '## Frontend Surface Component Links',
    '',
    '| Component ID | Surface ID | Route path | Placement kind | Placement order |',
    '| --- | --- | --- | --- | --- |',
    '| `web.component.shell.AppShellFrame` | `web.shell.root` | `/` | shell | 10 |',
    '| `web.component.canvas.CanvasToolbar` | `web.canvas.graph` | `/canvas` | route-toolbar | 20 |',
    '',
    '## Frontend Component Files',
    '',
    '| Component ID | File path | File role | Exported symbol |',
    '| --- | --- | --- | --- |',
    '| `web.component.shell.AppShellFrame` | `apps/web/src/app/components/shell/AppShellFrame.tsx` | component | AppShellFrame |',
    '| `web.component.canvas.CanvasToolbar` | `apps/web/src/app/views/canvas/CanvasToolbar.tsx` | component | CanvasToolbar |',
    '',
    '## Frontend Component Command Query Rails',
    '',
    '| Component ID | Rail name | Rail kind | Rail status |',
    '| --- | --- | --- | --- |',
    '| `web.component.shell.AppShellFrame` | `GetRuntimeSession` | query | implemented-api |',
    '| `web.component.canvas.CanvasToolbar` | `StartRun` | command | implemented-api |',
    '',
    '## Frontend Component Evidence',
    '',
    '| Evidence ID | Component ID | Evidence kind | Evidence ref | Evidence status |',
    '| --- | --- | --- | --- | --- |',
    '| `web.component.shell.AppShellFrame.unit` | `web.component.shell.AppShellFrame` | unit-test | `apps/web/src/app/components/shell/AppShellFrame.test.tsx` | accepted |',
    '| `web.component.canvas.CanvasToolbar.architecture` | `web.component.canvas.CanvasToolbar` | architecture-test | `apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx` | accepted |',
  ].join('\n');
}

test('frontend component reflection snapshot parses governed component, file, rail, and evidence rows', () => {
  const snapshot = buildFrontendComponentReflectionSnapshot({
    docs: [inventoryDocument(sampleInventory())],
  });

  assert.equal(snapshot.components.length, 2);
  assert.equal(snapshot.surfaceLinks.length, 2);
  assert.equal(snapshot.files.length, 2);
  assert.equal(snapshot.rails.length, 2);
  assert.equal(snapshot.evidence.length, 2);

  const canvasToolbar = snapshot.components.find(
    (component) => component.componentId === 'web.component.canvas.CanvasToolbar'
  );

  assert.equal(canvasToolbar.componentKind, 'route-toolbar');
  assert.equal(canvasToolbar.componentStatus, 'current');
  assert.equal(canvasToolbar.reuseDecision, 'extract');
  assert.deepEqual(canvasToolbar.pluginScope, 'dbt');
  assert.deepEqual(canvasToolbar.capabilityGaps, ['readiness projection']);
  assert.match(canvasToolbar.sourceContentSha256, /^[a-f0-9]{64}$/);
});

test('frontend component reflection list normalization treats none as empty', () => {
  assert.deepEqual(normalizeList('none'), []);
  assert.deepEqual(normalizeList('`dbt`; monitoring'), ['dbt', 'monitoring']);
});

test('frontend component reflection rejects unknown component vocabulary', () => {
  assert.throws(
    () =>
      buildFrontendComponentReflectionSnapshot({
        docs: [inventoryDocument(sampleInventory().replace('route-toolbar', 'floating-orb'))],
      }),
    /Unknown component kind "floating-orb"/
  );
});

test('frontend component reflection query rows expose component counts and source', () => {
  const snapshot = buildFrontendComponentReflectionSnapshot({
    docs: [inventoryDocument(sampleInventory())],
  });

  assert.deepEqual(buildFrontendComponentRows(snapshot.components.slice(0, 1)), [
    [
      'web.component.shell.AppShellFrame',
      'AppShellFrame',
      'shell-frame',
      'current',
      'reuse',
      0,
      0,
      0,
      0,
      'docs/architecture/components/web/frontend-component-inventory.md',
    ],
  ]);
});

test('frontend component reflection file and rail rows format focused DB query results', () => {
  assert.deepEqual(
    buildFrontendComponentFileRows([
      {
        component_id: 'web.component.canvas.CanvasToolbar',
        file_path: 'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
        file_role: 'component',
        exported_symbol: 'CanvasToolbar',
      },
    ]),
    [
      [
        'web.component.canvas.CanvasToolbar',
        'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
        'component',
        'CanvasToolbar',
      ],
    ]
  );

  assert.deepEqual(
    buildFrontendComponentRailRows([
      {
        component_id: 'web.component.canvas.CanvasToolbar',
        rail_name: 'StartRun',
        rail_kind: 'command',
        rail_status: 'implemented-api',
      },
    ]),
    [['web.component.canvas.CanvasToolbar', 'StartRun', 'command', 'implemented-api']]
  );
});

test('frontend component reflection query applies component, kind, state, owner, surface, and limit filters', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await readFrontendComponentRows(client, {
    component: 'web.component.canvas.CanvasToolbar',
    kind: 'route-toolbar',
    state: 'current',
    owner: 'Canvas',
    surface: 'web.canvas.graph',
    limit: 5,
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /from planning_query_store\.frontend_component_summary_query/);
  assert.match(calls[0].sql, /component_id = \$1/);
  assert.match(calls[0].sql, /component_kind = \$2/);
  assert.match(calls[0].sql, /component_status = \$3/);
  assert.match(calls[0].sql, /frontend_owner = \$4/);
  assert.match(calls[0].sql, /frontend_surface_component_links/);
  assert.deepEqual(calls[0].params, [
    'web.component.canvas.CanvasToolbar',
    'route-toolbar',
    'current',
    'Canvas',
    'web.canvas.graph',
    5,
  ]);
});

test('frontend component reflection file and rail queries apply focused filters', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await readFrontendComponentFileRows(client, {
    component: 'web.component.canvas.CanvasToolbar',
    role: 'component',
    path: 'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
    limit: 3,
  });
  await readFrontendComponentRailRows(client, {
    component: 'web.component.canvas.CanvasToolbar',
    rail: 'StartRun',
    kind: 'command',
    status: 'implemented-api',
    limit: 4,
  });

  assert.match(calls[0].sql, /from planning_query_store\.frontend_component_file_query/);
  assert.deepEqual(calls[0].params, [
    'web.component.canvas.CanvasToolbar',
    'component',
    'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
    3,
  ]);
  assert.match(calls[1].sql, /from planning_query_store\.frontend_component_rail_query/);
  assert.deepEqual(calls[1].params, [
    'web.component.canvas.CanvasToolbar',
    'StartRun',
    'command',
    'implemented-api',
    4,
  ]);
});

test('real frontend component inventory links current components to files, rails, and evidence', () => {
  const snapshot = buildFrontendComponentReflectionSnapshot();
  const componentIds = new Set(snapshot.components.map((component) => component.componentId));
  const fileComponentIds = new Set(snapshot.files.map((fileRef) => fileRef.componentId));
  const railComponentIds = new Set(snapshot.rails.map((rail) => rail.componentId));
  const evidenceComponentIds = new Set(snapshot.evidence.map((evidence) => evidence.componentId));

  assert.ok(componentIds.has('web.component.canvas.CanvasToolbar'));
  assert.ok(componentIds.has('web.component.workbench.RouteWorkbenchFrame'));
  for (const componentId of componentIds) {
    assert.ok(fileComponentIds.has(componentId), `${componentId} must have at least one file`);
    assert.ok(railComponentIds.has(componentId), `${componentId} must have at least one rail`);
    assert.ok(
      evidenceComponentIds.has(componentId),
      `${componentId} must have at least one evidence row`
    );
  }
});

test('real frontend component inventory maps Canvas contextual UX components and legacy tabs', () => {
  const snapshot = buildFrontendComponentReflectionSnapshot();
  const componentsById = new Map(
    snapshot.components.map((component) => [component.componentId, component])
  );
  const railsByComponent = new Map();

  for (const rail of snapshot.rails) {
    const componentRails = railsByComponent.get(rail.componentId) || new Set();
    componentRails.add(rail.railName);
    railsByComponent.set(rail.componentId, componentRails);
  }

  const expectedCanvasComponents = [
    'web.component.canvas.CanvasViewport',
    'web.component.canvas.CanvasContextMenu',
    'web.component.canvas.GraphNodeCardStrategy',
    'web.component.canvas.SourceImportDialog',
  ];

  for (const componentId of expectedCanvasComponents) {
    assert.ok(componentsById.has(componentId), `${componentId} must be mapped in Planning DB`);
    assert.equal(componentsById.get(componentId).componentStatus, 'current');
  }

  assert.equal(
    componentsById.get('web.component.canvas.NodeWorkbench')?.componentStatus,
    'partial'
  );
  assert.equal(
    componentsById.get('web.component.canvas.CanvasWorkbenchTabs')?.componentStatus,
    'retire'
  );
  assert.ok(
    railsByComponent.get('web.component.canvas.CanvasContextMenu')?.has('ResolveCanvasContextMenu')
  );
  assert.ok(
    railsByComponent
      .get('web.component.canvas.GraphNodeCardStrategy')
      ?.has('ProjectGraphNodeCardReadModel')
  );
  assert.ok(
    railsByComponent.get('web.component.canvas.SourceImportDialog')?.has('ListWarehouseConnections')
  );
  assert.ok(
    railsByComponent
      .get('web.component.canvas.SourceImportDialog')
      ?.has('ListWarehouseConnectionTables')
  );
  assert.ok(
    railsByComponent.get('web.component.canvas.NodeWorkbench')?.has('InspectCanvasNodeProperties')
  );
});

test('real frontend component inventory keeps execution preview out of fixed canvas toolbar', () => {
  const snapshot = buildFrontendComponentReflectionSnapshot();
  const toolbarRails = snapshot.rails
    .filter((rail) => rail.componentId === 'web.component.canvas.CanvasToolbar')
    .map((rail) => rail.railName);
  const contextMenuRails = snapshot.rails
    .filter((rail) => rail.componentId === 'web.component.canvas.CanvasContextMenu')
    .map((rail) => rail.railName);

  assert.ok(
    !toolbarRails.includes('PreviewExecutablePlan'),
    'CanvasToolbar must not own PreviewExecutablePlan after preview moved to the canvas context menu'
  );
  assert.ok(
    contextMenuRails.includes('PreviewExecutablePlan'),
    'CanvasContextMenu must own PreviewExecutablePlan as the spatial canvas action'
  );
});
