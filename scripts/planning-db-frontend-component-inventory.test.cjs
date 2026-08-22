const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
const {
  countField,
  headerIndexes,
  isSeparatorRow,
  markdownCells,
  normalizeCell,
  rawRow,
  rowValue,
} = require('./planning-db/frontend-inventory-table.cjs');

function inventoryDocument(content) {
  return {
    path: 'docs/architecture/components/web/frontend-component-inventory.md',
    content,
  };
}

test('frontend inventory table helpers live in one canonical helper', () => {
  const cells = markdownCells('| `Component ID` | Count |');
  const indexes = headerIndexes(cells, ['Component ID', 'Count']);

  assert.deepEqual(cells, ['`Component ID`', 'Count']);
  assert.deepEqual(indexes, { 'Component ID': 0, Count: 1 });
  assert.equal(rowValue(cells, indexes, 'Component ID'), 'Component ID');
  assert.deepEqual(rawRow(cells, indexes, ['Component ID', 'Count']), {
    'Component ID': 'Component ID',
    Count: 'Count',
  });
  assert.equal(isSeparatorRow(markdownCells('| --- | :---: |')), true);
  assert.equal(normalizeCell(' `Canvas`   shell '), 'Canvas shell');
  assert.equal(countField({ surface_count: '4' }, 'surface_count', 'surfaceIds'), 4);
  assert.equal(countField({ surfaceIds: ['a', 'b'] }, 'surface_count', 'surfaceIds'), 2);

  const duplicatedLocalHelpers =
    /function (markdownCells|headerIndexes|countField|normalizeCell|isSeparatorRow|rowValue)\b/;
  for (const relativePath of [
    'planning-db/frontend-component-inventory.cjs',
    'planning-db/frontend-mechanical-truth-inventory.cjs',
  ]) {
    const source = fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
    assert.doesNotMatch(source, duplicatedLocalHelpers, `${relativePath} must import the helper`);
  }
});

function sampleInventory() {
  return [
    '## Frontend Components',
    '',
    '| Component ID | Component name | Component kind | Component status | Reuse decision | Frontend owner | Responsibility | Package | Route scope | Plugin scope | Capability gaps | Evidence |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    '| `web.component.shell.AppShellFrame` | AppShellFrame | shell-frame | current | reuse | Shell | Render shell frame. | `@dvt/web` | `/` | dbt; monitoring | console semantics | `AppShellFrame.test.tsx`; inventory docs |',
    '| `web.component.canvas.CanvasShellChrome` | CanvasShellChrome | route-toolbar | current | harden | Canvas | Compose canvas shell chrome. | `@dvt/web` | `/canvas` | dbt | readiness projection | `CanvasShell.architecture.test.tsx` |',
    '',
    '## Frontend Surface Component Links',
    '',
    '| Component ID | Surface ID | Route path | Placement kind | Placement order |',
    '| --- | --- | --- | --- | --- |',
    '| `web.component.shell.AppShellFrame` | `web.shell.root` | `/` | shell | 10 |',
    '| `web.component.canvas.CanvasShellChrome` | `web.canvas.graph` | `/canvas` | route-toolbar | 20 |',
    '',
    '## Frontend Component Files',
    '',
    '| Component ID | File path | File role | Exported symbol |',
    '| --- | --- | --- | --- |',
    '| `web.component.shell.AppShellFrame` | `apps/web/src/app/components/shell/AppShellFrame.tsx` | component | AppShellFrame |',
    '| `web.component.canvas.CanvasShellChrome` | `apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx` | component | CanvasShellMainPanel |',
    '',
    '## Frontend Component Command Query Rails',
    '',
    '| Component ID | Rail name | Rail kind | Rail status |',
    '| --- | --- | --- | --- |',
    '| `web.component.shell.AppShellFrame` | `GetRuntimeSession` | query | implemented-api |',
    '| `web.component.canvas.CanvasShellChrome` | `StartRun` | command | implemented-api |',
    '',
    '## Frontend Component Evidence',
    '',
    '| Evidence ID | Component ID | Evidence kind | Evidence ref | Evidence status |',
    '| --- | --- | --- | --- | --- |',
    '| `web.component.shell.AppShellFrame.unit` | `web.component.shell.AppShellFrame` | unit-test | `apps/web/src/app/components/shell/AppShellFrame.test.tsx` | accepted |',
    '| `web.component.canvas.CanvasShellChrome.architecture` | `web.component.canvas.CanvasShellChrome` | architecture-test | `apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx` | accepted |',
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

  const canvasShellChrome = snapshot.components.find(
    (component) => component.componentId === 'web.component.canvas.CanvasShellChrome'
  );

  assert.equal(canvasShellChrome.componentKind, 'route-toolbar');
  assert.equal(canvasShellChrome.componentStatus, 'current');
  assert.equal(canvasShellChrome.reuseDecision, 'harden');
  assert.deepEqual(canvasShellChrome.pluginScope, 'dbt');
  assert.deepEqual(canvasShellChrome.capabilityGaps, ['readiness projection']);
  assert.match(canvasShellChrome.sourceContentSha256, /^[a-f0-9]{64}$/);
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

test('frontend component reflection accepts bottom operational drawer vocabulary', () => {
  const snapshot = buildFrontendComponentReflectionSnapshot({
    docs: [inventoryDocument(sampleInventory().replace('shell-frame', 'operational-drawer'))],
  });

  const shellComponent = snapshot.components.find(
    (component) => component.componentId === 'web.component.shell.AppShellFrame'
  );
  assert.equal(shellComponent.componentKind, 'operational-drawer');
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
        component_id: 'web.component.canvas.CanvasShellChrome',
        file_path: 'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx',
        file_role: 'component',
        exported_symbol: 'CanvasShellMainPanel',
      },
    ]),
    [
      [
        'web.component.canvas.CanvasShellChrome',
        'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx',
        'component',
        'CanvasShellMainPanel',
      ],
    ]
  );

  assert.deepEqual(
    buildFrontendComponentRailRows([
      {
        component_id: 'web.component.canvas.CanvasShellChrome',
        rail_name: 'StartRun',
        rail_kind: 'command',
        rail_status: 'implemented-api',
      },
    ]),
    [['web.component.canvas.CanvasShellChrome', 'StartRun', 'command', 'implemented-api']]
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
    component: 'web.component.canvas.CanvasShellChrome',
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
  assert.match(calls[0].sql, /frontend_component_surface_link_query/);
  assert.doesNotMatch(calls[0].sql, /frontend_surface_component_links/);
  assert.deepEqual(calls[0].params, [
    'web.component.canvas.CanvasShellChrome',
    'route-toolbar',
    'current',
    'Canvas',
    'web.canvas.graph',
    5,
  ]);
});

test('frontend component reflection query applies broad search for DB-first component discovery', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await readFrontendComponentRows(client, {
    search: 'SourceImport',
    limit: 5,
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /from planning_query_store\.frontend_component_summary_query/);
  assert.match(calls[0].sql, /lower\(component_id\) like lower\(\$1\)/);
  assert.match(calls[0].sql, /lower\(component_name\) like lower\(\$1\)/);
  assert.match(calls[0].sql, /lower\(responsibility\) like lower\(\$1\)/);
  assert.match(calls[0].sql, /lower\(frontend_owner\) like lower\(\$1\)/);
  assert.match(calls[0].sql, /lower\(source_path\) like lower\(\$1\)/);
  assert.match(calls[0].sql, /limit \$2/);
  assert.deepEqual(calls[0].params, ['%SourceImport%', 5]);
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
    component: 'web.component.canvas.CanvasShellChrome',
    role: 'component',
    path: 'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx',
    limit: 3,
  });
  await readFrontendComponentRailRows(client, {
    component: 'web.component.canvas.CanvasShellChrome',
    rail: 'StartRun',
    kind: 'command',
    status: 'implemented-api',
    limit: 4,
  });

  assert.match(calls[0].sql, /from planning_query_store\.frontend_component_file_query/);
  assert.deepEqual(calls[0].params, [
    'web.component.canvas.CanvasShellChrome',
    'component',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx',
    3,
  ]);
  assert.match(calls[1].sql, /from planning_query_store\.frontend_component_rail_query/);
  assert.deepEqual(calls[1].params, [
    'web.component.canvas.CanvasShellChrome',
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

  assert.ok(componentIds.has('web.component.canvas.CanvasShellChrome'));
  assert.ok(!componentIds.has('web.component.canvas.CanvasToolbar'));
  assert.ok(componentIds.has('web.component.templates.TemplatesWorkbench'));
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

test('real frontend component inventory maps Canvas contextual UX components without legacy tabs', () => {
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
    'current'
  );
  assert.equal(componentsById.has('web.component.canvas.CanvasWorkbenchTabs'), false);
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
      ?.has('ListWarehouseConnectionSourceObjects')
  );
  assert.ok(
    railsByComponent.get('web.component.canvas.NodeWorkbench')?.has('InspectCanvasNodeProperties')
  );
});

test('real frontend component inventory uses canonical execution preview rail vocabulary', () => {
  const snapshot = buildFrontendComponentReflectionSnapshot();
  const chromeRails = snapshot.rails
    .filter((rail) => rail.componentId === 'web.component.canvas.CanvasShellChrome')
    .map((rail) => rail.railName);
  const contextMenuRails = snapshot.rails
    .filter((rail) => rail.componentId === 'web.component.canvas.CanvasContextMenu')
    .map((rail) => rail.railName);

  assert.ok(
    !chromeRails.includes('PreviewExecutablePlan'),
    'CanvasShellChrome must not own the legacy PreviewExecutablePlan alias'
  );
  assert.ok(chromeRails.includes('ObservePlanRunReadiness'));
  assert.ok(
    !contextMenuRails.includes('PreviewExecutablePlan'),
    'CanvasContextMenu must not expose the legacy PreviewExecutablePlan alias'
  );
  assert.ok(
    contextMenuRails.includes('PreviewExecutionPlan'),
    'CanvasContextMenu must own PreviewExecutionPlan as the spatial canvas action'
  );
});

test('real frontend component inventory maps Templates workbench files, rails, and evidence', () => {
  const snapshot = buildFrontendComponentReflectionSnapshot();
  const templatesComponentId = 'web.component.templates.TemplatesWorkbench';
  const templatesFiles = snapshot.files
    .filter((file) => file.componentId === templatesComponentId)
    .map((file) => file.filePath);
  const templatesRails = snapshot.rails
    .filter((rail) => rail.componentId === templatesComponentId)
    .map((rail) => [rail.railName, rail.railKind, rail.railStatus]);
  const templatesEvidence = snapshot.evidence
    .filter((evidence) => evidence.componentId === templatesComponentId)
    .map((evidence) => evidence.evidenceRef);

  assert.ok(templatesFiles.includes('apps/web/src/app/views/TemplatesView.tsx'));
  assert.ok(templatesFiles.includes('apps/web/src/app/views/templates/templatesViewModel.ts'));
  assert.deepEqual(templatesRails, [
    ['ListExecutionTemplateProfiles', 'query', 'implemented-local'],
    ['GenerateExecutionTemplatePreview', 'query', 'implemented-local'],
    ['SelectExecutionTemplateProfile', 'command', 'implemented-local'],
    ['UpdateExecutionTemplateParameterValue', 'command', 'implemented-local'],
  ]);
  assert.ok(
    templatesEvidence.includes(
      'apps/web/src/app/views/templates/templatesWorkbench.architecture.test.ts'
    )
  );
});

test('real frontend component inventory maps Artifacts workbench files, rails, and evidence', () => {
  const snapshot = buildFrontendComponentReflectionSnapshot();
  const artifactsComponentId = 'web.component.artifacts.ArtifactsWorkbench';
  const artifactsComponent = snapshot.components.find(
    (component) => component.componentId === artifactsComponentId
  );
  const artifactsSurfaceLink = snapshot.surfaceLinks.find(
    (link) => link.componentId === artifactsComponentId
  );
  const artifactsFiles = snapshot.files
    .filter((file) => file.componentId === artifactsComponentId)
    .map((file) => file.filePath);
  const artifactsRails = snapshot.rails
    .filter((rail) => rail.componentId === artifactsComponentId)
    .map((rail) => [rail.railName, rail.railKind, rail.railStatus]);
  const artifactsEvidence = snapshot.evidence
    .filter((evidence) => evidence.componentId === artifactsComponentId)
    .map((evidence) => evidence.evidenceRef);

  assert.equal(artifactsComponent?.componentKind, 'route-workbench');
  assert.equal(artifactsComponent?.componentStatus, 'current');
  assert.equal(artifactsSurfaceLink?.surfaceId, 'web.canvas.tabs');
  assert.equal(artifactsSurfaceLink?.placementKind, 'workbench-tab');
  assert.ok(artifactsFiles.includes('apps/web/src/app/views/ArtifactsView.tsx'));
  assert.ok(artifactsFiles.includes('apps/web/src/app/views/artifacts/useArtifactsViewModel.ts'));
  assert.ok(
    artifactsFiles.includes('apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx')
  );
  assert.ok(
    artifactsFiles.includes(
      'apps/web/src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts'
    )
  );
  assert.deepEqual(artifactsRails, [
    ['ListWorkspaceArtifacts', 'query', 'implemented-projection'],
    ['ListWorkspaceFiles', 'query', 'implemented-api'],
    ['GetWorkspaceFileContent', 'query', 'implemented-api'],
  ]);
  assert.ok(
    artifactsEvidence.includes('apps/web/src/app/views/artifacts/useArtifactsViewModel.test.tsx')
  );
  assert.ok(
    artifactsEvidence.includes(
      'apps/web/src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts'
    )
  );
});
