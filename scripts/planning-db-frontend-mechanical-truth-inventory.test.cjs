const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildFrontendMechanicalTruthRows,
  buildFrontendMechanicalTruthSnapshot,
  normalizeFrontendMechanicalTruthList,
  readFrontendMechanicalTruthRows,
} = require('./planning-db/frontend-mechanical-truth-inventory.cjs');

function inventoryDocument(content) {
  return {
    path: 'docs/architecture/components/web/frontend-mechanical-truth-inventory.md',
    content,
  };
}

function sampleInventoryTable() {
  return [
    '| Surface ID | Surface kind | Route path | Screen state | Frontend owner | Registered plugins | Consumed endpoints | Zustand stores | TanStack queries | Visible no-backend affordances | Capability gaps | Evidence |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    '| `web.runs.list` | route | `/runs` | operational-product | Runs workbench | monitoring | `/runs` | `useExecutionStore`; `useUiLayoutStore` | `useScopedRunSummariesQuery` | dense run table; filters | cancel run; recover run | runs native smoke |',
    '| `web.admin` | route | `/admin` | disabled-unsupported | Admin shell | none | none | `useUiLayoutStore` | `useWorkspaceRolesQuery`; `useWorkspaceAuditQuery` | admin route exists but fails closed | `ListAdminRoles`; `ListAdminAuditLog` | frontend rail inventory |',
  ].join('\n');
}

test('frontend mechanical truth snapshot parses governed screen inventory rows', () => {
  const snapshot = buildFrontendMechanicalTruthSnapshot({
    docs: [inventoryDocument(sampleInventoryTable())],
  });

  assert.equal(snapshot.surfaces.length, 2);
  assert.deepEqual(
    snapshot.surfaces.map((surface) => surface.surfaceId),
    ['web.runs.list', 'web.admin']
  );

  const runs = snapshot.surfaces[0];
  assert.equal(runs.surfaceKind, 'route');
  assert.equal(runs.routePath, '/runs');
  assert.equal(runs.screenState, 'operational-product');
  assert.deepEqual(runs.registeredPlugins, ['monitoring']);
  assert.deepEqual(runs.consumedEndpoints, ['/runs']);
  assert.deepEqual(runs.zustandStores, ['useExecutionStore', 'useUiLayoutStore']);
  assert.deepEqual(runs.tanstackQueries, ['useScopedRunSummariesQuery']);
  assert.deepEqual(runs.visibleNoBackendAffordances, ['dense run table', 'filters']);
  assert.deepEqual(runs.capabilityGaps, ['cancel run', 'recover run']);
  assert.match(runs.sourceContentSha256, /^[a-f0-9]{64}$/);
});

test('frontend mechanical truth list normalization treats none as empty', () => {
  assert.deepEqual(normalizeFrontendMechanicalTruthList('none'), []);
  assert.deepEqual(normalizeFrontendMechanicalTruthList('`/runs`; `/runs/:runId/events`'), [
    '/runs',
    '/runs/:runId/events',
  ]);
});

test('frontend mechanical truth snapshot rejects unknown screen states', () => {
  assert.throws(
    () =>
      buildFrontendMechanicalTruthSnapshot({
        docs: [
          inventoryDocument(
            sampleInventoryTable().replace('operational-product', 'almost-operational')
          ),
        ],
      }),
    /Unknown frontend screen state "almost-operational"/
  );
});

test('frontend mechanical truth table rows expose screen state and counts', () => {
  const snapshot = buildFrontendMechanicalTruthSnapshot({
    docs: [inventoryDocument(sampleInventoryTable())],
  });

  assert.deepEqual(buildFrontendMechanicalTruthRows(snapshot.surfaces), [
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
    [
      'route',
      '/admin',
      'web.admin',
      'disabled-unsupported',
      'Admin shell',
      0,
      0,
      1,
      2,
      2,
      'docs/architecture/components/web/frontend-mechanical-truth-inventory.md',
    ],
  ]);
});

test('frontend mechanical truth query applies state, path, owner, kind, and limit filters', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await readFrontendMechanicalTruthRows(client, {
    kind: 'route',
    owner: 'Runs workbench',
    path: '/runs',
    state: 'operational-product',
    limit: 5,
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /from planning_query_store\.frontend_mechanical_truth_query/);
  assert.match(calls[0].sql, /surface_kind = \$1/);
  assert.match(calls[0].sql, /screen_state = \$2/);
  assert.match(calls[0].sql, /route_path = \$3/);
  assert.match(calls[0].sql, /frontend_owner = \$4/);
  assert.deepEqual(calls[0].params, ['route', 'operational-product', '/runs', 'Runs workbench', 5]);
});

test('frontend mechanical truth inventory exposes its canonical query rail', () => {
  const railName = ['List', 'Frontend', 'Mechanical', 'Truth', 'Surfaces'].join('');
  const source = fs.readFileSync(
    path.join(__dirname, 'planning-db/frontend-mechanical-truth-inventory.cjs'),
    'utf8'
  );
  const ownSource = fs.readFileSync(__filename, 'utf8');

  assert.doesNotMatch(
    ownSource,
    new RegExp(`\\b${railName}\\b`),
    'the inventory test must not be indexed as a rail implementation surface'
  );
  assert.match(source, new RegExp(`\\b${railName}\\b`));
});

test('real frontend mechanical truth inventory covers product, preview, and unsupported routes', () => {
  const snapshot = buildFrontendMechanicalTruthSnapshot();
  const states = new Set(snapshot.surfaces.map((surface) => surface.screenState));
  const routePaths = new Set(snapshot.surfaces.map((surface) => surface.routePath));

  assert.ok(states.has('operational-product'));
  assert.ok(states.has('preview'));
  assert.ok(states.has('disabled-unsupported'));
  assert.ok(routePaths.has('/runs'));
  assert.ok(routePaths.has('/canvas'));
  assert.ok(routePaths.has('/admin'));
  assert.equal(
    snapshot.surfaces.every((surface) =>
      surface.sourcePath.endsWith('frontend-mechanical-truth-inventory.md')
    ),
    true
  );
});
