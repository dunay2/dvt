const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { Client } = require('pg');

const { runMigrations } = require('./planning-db-migrate.cjs');
const { importContent } = require('./planning-db-import.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');

const repoRoot = path.resolve(__dirname, '..');
const generatorPath = path.join(repoRoot, 'scripts', 'generate-code-status.cjs');
const policyPath = path.join(repoRoot, 'docs', 'generated-docs-policy.json');

const {
  assertTrackedRepositoryMapClean,
  collectRepositoryWorkspaceStats,
  listPnpmWorkspaceDirs,
  main,
  markdownCell,
  parsePnpmWorkspaceRows,
  readRepositoryArchitectureFacts,
  renderRepositoryMap,
  resolveDocumentationProjection,
  resolveGenerationMode,
  resolveWorkspaceArchitecture,
} = require('./generate-code-status.cjs');

function dbUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function createWorkspaceFixture(t, relativePath, packageName, options = {}) {
  const root = options.root || fs.mkdtempSync(path.join(os.tmpdir(), 'repository-map-'));
  if (!options.root) t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, ...relativePath.split('/'));
  fs.mkdirSync(path.join(directory, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(directory, 'package.json'),
    `${JSON.stringify({ name: packageName, scripts: { build: 'x', test: 'x', typecheck: 'x' } }, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(path.join(directory, 'src', 'index.ts'), 'export const value = 1;\n', 'utf8');
  if (options.readme) fs.writeFileSync(path.join(directory, 'README.md'), '# Local\n', 'utf8');
  return { root, directory };
}

function workspaceRow(overrides = {}) {
  return {
    workspace: '@dvt/example',
    path: 'packages/@dvt/example',
    kind: 'package',
    src: 2,
    tests: 1,
    hasBuild: 'yes',
    hasTest: 'yes',
    hasTypecheck: 'yes',
    localReadmePath: null,
    ...overrides,
  };
}

test('pnpm workspace JSON is the sole membership input', () => {
  assert.deepEqual(parsePnpmWorkspaceRows('[{"path":"/repo"}]'), [{ path: '/repo' }]);
  assert.throws(() => parsePnpmWorkspaceRows('{}'), /JSON array/u);
  assert.throws(() => parsePnpmWorkspaceRows('not-json'), /Unable to parse/u);

  const outside = path.resolve(repoRoot, '..', 'outside');
  assert.throws(
    () =>
      listPnpmWorkspaceDirs({
        spawnSync: () => ({ status: 0, stdout: JSON.stringify([{ path: outside }]) }),
      }),
    /outside the repository/u
  );
});

test('effective membership can include non-standard layouts and exclude existing directories', (t) => {
  const first = createWorkspaceFixture(t, 'custom/alpha', '@fixture/alpha');
  const second = createWorkspaceFixture(t, 'legacy/beta', '@fixture/beta', { root: first.root });
  const ignored = createWorkspaceFixture(t, 'packages/ignored', '@fixture/ignored', {
    root: first.root,
  });

  const workspaces = collectRepositoryWorkspaceStats({
    workspaceDirs: [second.directory, first.directory],
  });
  assert.deepEqual(
    workspaces.map((workspace) => workspace.workspace),
    ['@fixture/beta', '@fixture/alpha']
  );
  assert.equal(workspaces.some((workspace) => workspace.workspace === '@fixture/ignored'), false);
  assert.ok(fs.existsSync(ignored.directory));
});

test('workspace add, rename, and removal are expressed only by effective membership', (t) => {
  const first = createWorkspaceFixture(t, 'alpha', '@fixture/alpha');
  const second = createWorkspaceFixture(t, 'beta', '@fixture/beta', { root: first.root });

  assert.deepEqual(
    collectRepositoryWorkspaceStats({ workspaceDirs: [first.directory, second.directory] }).map(
      (workspace) => workspace.workspace
    ),
    ['@fixture/alpha', '@fixture/beta']
  );
  const renamed = path.join(first.root, 'gamma');
  fs.renameSync(first.directory, renamed);
  assert.deepEqual(
    collectRepositoryWorkspaceStats({ workspaceDirs: [renamed] }).map(
      (workspace) => workspace.workspace
    ),
    ['@fixture/alpha']
  );
  assert.equal(
    collectRepositoryWorkspaceStats({ workspaceDirs: [] }).some(
      (workspace) => workspace.workspace === '@fixture/beta'
    ),
    false
  );
});

test('repository map component matching is exact and excludes inference', () => {
  const workspace = workspaceRow({ path: 'apps/web' });
  const components = [
    { component_id: 'SYS-WEB-ROOT', repo_path: 'apps/web', status: 'implemented' },
    { component_id: 'SIMILAR', repo_path: 'apps/web/src', status: 'implemented' },
  ];
  const document = {
    component_id: 'SYS-WEB-ROOT',
    document_path: 'docs/architecture/components/web/index.md',
    canonicality: 'canonical',
    lifecycle_state: 'active',
    status: 'Active',
  };
  assert.deepEqual(resolveWorkspaceArchitecture(workspace, components, [document]), {
    component: 'SYS-WEB-ROOT',
    componentStatus: 'implemented',
    canonicalDoc:
      '[docs/architecture/components/web/index.md](../architecture/components/web/index.md)',
    gaps: [],
  });
  assert.deepEqual(
    resolveWorkspaceArchitecture(workspace, components, [
      { ...document, component_id: undefined, subject_key: 'SYS-WEB-ROOT' },
    ]).gaps,
    ['missing-canonical-doc-binding']
  );
});

test('missing and ambiguous component/document identity stays fail-closed', () => {
  const workspace = workspaceRow();
  assert.deepEqual(resolveWorkspaceArchitecture(workspace, [], []).gaps, [
    'unregistered-component',
  ]);
  assert.deepEqual(
    resolveWorkspaceArchitecture(
      workspace,
      [
        { component_id: 'A', repo_path: workspace.path, status: 'implemented' },
        { component_id: 'B', repo_path: workspace.path, status: 'implemented' },
      ],
      []
    ).gaps,
    ['ambiguous-component']
  );
  assert.deepEqual(
    resolveWorkspaceArchitecture(
      workspace,
      [{ component_id: 'A', repo_path: workspace.path, status: 'implemented' }],
      [
        {
          component_id: 'A',
          document_path: 'docs/a.md',
          canonicality: 'canonical',
          lifecycle_state: 'active',
        },
        {
          component_id: 'A',
          document_path: 'docs/b.md',
          canonicality: 'canonical',
          lifecycle_state: 'active',
        },
      ]
    ).gaps,
    ['ambiguous-canonical-doc-binding']
  );
});

test('governed coverage classes use exact canonical or local evidence', () => {
  assert.deepEqual(
    resolveDocumentationProjection(workspaceRow(), { canonicalDoc: '[doc](doc.md)' }),
    { entry: '[doc](doc.md)', coverage: 'canonical' }
  );
  const linked = resolveDocumentationProjection(
    workspaceRow({ localReadmePath: 'packages/@dvt/example/README.md' }),
    { canonicalDoc: '-' }
  );
  assert.equal(linked.coverage, 'linked-local');
  assert.match(linked.entry, /README\.md/u);
  assert.deepEqual(resolveDocumentationProjection(workspaceRow(), { canonicalDoc: '-' }), {
    entry: '-',
    coverage: 'reference-only',
  });
});

test('Markdown cells are deterministic and safe', () => {
  assert.equal(
    markdownCell('docs\\component|line\nnext'),
    'docs\\\\component\\|line<br>next'
  );
});

test('generation modes isolate code-state and repository-map work', async () => {
  assert.equal(resolveGenerationMode([]), 'all');
  assert.equal(resolveGenerationMode(['--code-state-only']), 'code-state-only');
  assert.equal(resolveGenerationMode(['--repository-map-only']), 'repository-map-only');
  assert.equal(
    resolveGenerationMode(['--repository-map-only', '--check']),
    'repository-map-only'
  );
  assert.throws(
    () => resolveGenerationMode(['--code-state-only', '--repository-map-only']),
    /Choose either/u
  );

  const workspaces = [workspaceRow()];
  const calls = [];
  const dependencies = {
    collectRepositoryWorkspaceStats: () => workspaces,
    generateCodeState: async () => calls.push('code'),
    generateRepositoryMap: async () => calls.push('map'),
  };
  await main(['--code-state-only'], dependencies);
  assert.deepEqual(calls, ['code']);
  calls.length = 0;
  await main(['--repository-map-only'], dependencies);
  assert.deepEqual(calls, ['map']);
});

test('local check mode rejects generated map drift while generate mode remains writable', () => {
  const previousCi = process.env.CI;
  delete process.env.CI;
  try {
    assert.doesNotThrow(() =>
      assertTrackedRepositoryMapClean({
        check: false,
        spawnSync: () => ({ status: 1, stdout: 'diff', stderr: '' }),
      })
    );
    assert.throws(
      () =>
        assertTrackedRepositoryMapClean({
          check: true,
          spawnSync: () => ({ status: 1, stdout: 'diff', stderr: '' }),
        }),
      /repository-map\.md is stale/u
    );
  } finally {
    if (previousCi === undefined) delete process.env.CI;
    else process.env.CI = previousCi;
  }
});

test('repository map output is byte-stable and preserves governed navigation', () => {
  const workspaces = [
    workspaceRow({ localReadmePath: 'packages/@dvt/example/README.md' }),
  ];
  const facts = {
    components: [
      { component_id: 'COMP-EXAMPLE', repo_path: workspaces[0].path, status: 'implemented' },
    ],
    documents: [],
  };
  const first = renderRepositoryMap(workspaces, facts, '2026-08-06');
  const second = renderRepositoryMap(workspaces, facts, '2026-08-06');
  assert.equal(second, first);
  assert.match(first, /linked-local/u);
  assert.match(first, /missing-canonical-doc-binding/u);
  assert.match(first, /\[Component Map\]/u);
  assert.match(first, /\[Canonical Doc Code Matrix\]/u);
  assert.match(first, /\[System Delivery Status\]/u);
  assert.match(first, /\[Glossary\]/u);
  assert.doesNotMatch(first, /\| Responsibility \|/u);
});

test('policy names actual inputs and the minimal generator command', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const entry = policy.artifactClasses.find((item) => item.id === 'tracked-docs-repository-map');
  assert.ok(entry);
  assert.equal(entry.generatorCommand, 'pnpm docs:status:generate -- --repository-map-only');
  assert.ok(entry.sourcePaths.includes('package.json'));
  assert.ok(entry.sourcePaths.includes('pnpm-workspace.yaml'));
  assert.ok(entry.sourcePaths.includes('tools/planning-db/migrations'));
  assert.equal(entry.sourcePaths.some((value) => value.includes('subject_key')), false);
});

test('generator no longer reads the empty documentation panel binding', () => {
  const source = fs.readFileSync(generatorPath, 'utf8');
  assert.doesNotMatch(source, /documentation_panel_query/u);
  assert.match(source, /not in \('deprecated', 'drift'\)/u);
  assert.match(source, /pnpmCommand\(\)/u);
  assert.match(source, /--check/u);
});

test(
  'live Planning DB migration/import renders current workspaces without false document bindings',
  { skip: process.env.DVT_REPOSITORY_MAP_INTEGRATION !== '1' },
  async () => {
    await runMigrations({ databaseUrl: dbUrl(), silent: true });
    await importContent({ databaseUrl: dbUrl(), silent: true });
    const client = new Client({ connectionString: dbUrl() });
    await client.connect();
    try {
      const facts = await readRepositoryArchitectureFacts(client);
      const workspaces = collectRepositoryWorkspaceStats();
      const paths = new Set(workspaces.map((workspace) => workspace.path));
      const output = renderRepositoryMap(workspaces, facts, '2026-08-06');
      assert.ok(facts.components.length > 0);
      assert.deepEqual(facts.documents, []);
      assert.equal(paths.has('packages/@dvt/temporal-http-json-plugin'), true);
      assert.equal(paths.has('packages/@dvt/temporal-object-file-postgres-plugin'), true);
      assert.match(output, /missing-canonical-doc-binding/u);
      assert.doesNotMatch(output, /documentation_panel_query/u);
    } finally {
      await client.end();
    }
  }
);
