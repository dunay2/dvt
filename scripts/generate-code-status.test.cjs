const { execFileSync } = require('node:child_process');
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
  collectRepositoryWorkspaceStats,
  collectWorkspaceDirs,
  expandDocumentBindingsToAncestors,
  main,
  markdownCell,
  readRepositoryArchitectureFacts,
  renderRepositoryMap,
  resolveGenerationMode,
  resolveWorkspaceArchitecture,
} = require('./generate-code-status.cjs');

function toPosix(value) {
  return value.replace(/\\/gu, '/');
}

function dbUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function repositoryMapFixture() {
  return {
    workspaces: [
      {
        workspace: '@dvt/example',
        path: 'packages/@dvt/example',
        kind: 'package',
        src: 2,
        tests: 1,
        hasBuild: 'yes',
        hasTest: 'yes',
        hasTypecheck: 'yes',
      },
    ],
    facts: {
      components: [
        {
          component_id: 'COMP-EXAMPLE',
          repo_path: 'packages/@dvt/example',
          status: 'implemented',
        },
      ],
      documents: [
        {
          component_id: 'COMP-EXAMPLE',
          document_path: 'docs/architecture/components/example/index.md',
          canonicality: 'canonical',
          lifecycle_state: 'active',
          status: 'Active',
        },
      ],
    },
  };
}

test('code status generator renders the generated inventory outside tracked docs', () => {
  const source = fs.readFileSync(generatorPath, 'utf8');

  assert.match(source, /'\.generated-docs'/u);
  assert.match(source, /'planning'[\s\S]*'status'[\s\S]*'generated-code-state\.md'/u);
  assert.doesNotMatch(
    source,
    /const outputPath = path\.join\(repoRoot, 'docs', 'planning', 'status', 'generated-code-state\.md'\)/u
  );
});

test('repository map policy declares the actual read models and minimal generator command', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const repositoryMapPolicy = policy.artifactClasses.find(
    (entry) => entry.id === 'tracked-docs-repository-map'
  );

  assert.ok(repositoryMapPolicy);
  assert.equal(
    repositoryMapPolicy.generatorCommand,
    'pnpm docs:status:generate -- --repository-map-only'
  );
  assert.deepEqual(repositoryMapPolicy.sourcePaths, [
    'scripts/generate-code-status.cjs',
    'pnpm-workspace.yaml',
    'tools/planning-db/migrations/043_db_first_architecture_authority_queries.sql',
    'tools/planning-db/migrations/065_documentation_lifecycle_query.sql',
    'tools/planning-db/migrations/070_documentation_panel_query.sql',
    'apps',
    'packages',
  ]);
  assert.equal(
    repositoryMapPolicy.sourcePaths.includes(
      'tools/planning-db/migrations/067_documentation_lifecycle_subject_key.sql'
    ),
    false
  );
  assert.equal(
    repositoryMapPolicy.sourcePaths.includes(
      'scripts/planning-db/queries/documentation-lifecycle-query.cjs'
    ),
    false
  );
});

test('generated docs policy treats generated code state as an untracked local artifact', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const codeStatePolicy = policy.artifactClasses.find(
    (entry) => entry.id === 'local-docs-status-code-state'
  );

  assert.ok(codeStatePolicy);
  assert.deepEqual(codeStatePolicy.artifacts, [
    '.generated-docs/planning/status/generated-code-state.md',
  ]);
  assert.equal(codeStatePolicy.tracking, 'untracked');
});

test('repository workspace inventory equals effective pnpm membership', () => {
  const output = execFileSync('pnpm', ['list', '-r', '--depth', '-1', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const rows = JSON.parse(output);
  const pnpmPaths = rows
    .map((row) => path.resolve(row.path))
    .filter((absolutePath) => absolutePath !== repoRoot)
    .map((absolutePath) => toPosix(path.relative(repoRoot, absolutePath)))
    .sort((left, right) => left.localeCompare(right, 'en'));
  const generatedPaths = collectRepositoryWorkspaceStats()
    .map((workspace) => workspace.path)
    .sort((left, right) => left.localeCompare(right, 'en'));

  assert.deepEqual(generatedPaths, pnpmPaths);
  assert.equal(new Set(generatedPaths).size, generatedPaths.length);
});

test('workspace discovery handles add, rename, and removal without a manual map row', (t) => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'repository-map-workspaces-'));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

  const writePackage = (relativePath, name) => {
    const directory = path.join(fixtureRoot, ...relativePath.split('/'));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, 'package.json'),
      `${JSON.stringify({ name, scripts: { test: 'node --test' } }, null, 2)}\n`,
      'utf8'
    );
  };
  const currentPaths = () =>
    collectWorkspaceDirs(fixtureRoot)
      .map((directory) => toPosix(path.relative(fixtureRoot, directory)))
      .sort((left, right) => left.localeCompare(right, 'en'));

  writePackage('alpha', '@fixture/alpha');
  writePackage('@fixture/beta', '@fixture/beta');
  assert.deepEqual(currentPaths(), ['@fixture/beta', 'alpha']);

  fs.renameSync(path.join(fixtureRoot, 'alpha'), path.join(fixtureRoot, 'gamma'));
  assert.deepEqual(currentPaths(), ['@fixture/beta', 'gamma']);

  fs.rmSync(path.join(fixtureRoot, '@fixture', 'beta'), { recursive: true, force: true });
  assert.deepEqual(currentPaths(), ['gamma']);
});

test('repository map resolves workspace and canonical document through explicit component identity', () => {
  const workspace = { path: 'apps/web' };
  const components = [
    {
      component_id: 'SYS-WEB-ROOT',
      repo_path: 'apps/web',
      status: 'implemented',
    },
    {
      component_id: 'SYS-WEB-NESTED',
      repo_path: 'apps/web/src/app',
      status: 'implemented',
    },
  ];
  const documents = [
    {
      component_id: 'SYS-WEB-ROOT',
      document_path: 'docs/architecture/components/web/index.md',
      canonicality: 'canonical',
      lifecycle_state: 'active',
      status: 'Active',
    },
  ];

  assert.deepEqual(resolveWorkspaceArchitecture(workspace, components, documents), {
    component: 'SYS-WEB-ROOT',
    componentStatus: 'implemented',
    canonicalDoc:
      '[docs/architecture/components/web/index.md](../architecture/components/web/index.md)',
    gaps: [],
  });
});

test('repository map propagates document identity only through explicit component parents', () => {
  const components = [
    {
      component_id: 'SYS-ROOT',
      repo_path: 'packages/@dvt/example',
      status: 'implemented',
      parent_component_id: null,
    },
    {
      component_id: 'SYS-LEAF',
      repo_path: 'packages/@dvt/example/src',
      status: 'implemented',
      parent_component_id: 'SYS-ROOT',
    },
  ];
  const documents = expandDocumentBindingsToAncestors(
    [
      {
        component_id: 'SYS-LEAF',
        document_path: 'docs/architecture/components/example/index.md',
        canonicality: 'canonical',
        lifecycle_state: 'active',
        status: 'Active',
      },
    ],
    components
  );

  assert.deepEqual(resolveWorkspaceArchitecture({ path: 'packages/@dvt/example' }, components, documents), {
    component: 'SYS-ROOT',
    componentStatus: 'implemented',
    canonicalDoc:
      '[docs/architecture/components/example/index.md](../architecture/components/example/index.md)',
    gaps: [],
  });
});

test('document ancestor expansion is deterministic, de-duplicated, and cycle-safe', () => {
  const components = [
    { component_id: 'COMP-A', parent_component_id: 'COMP-B' },
    { component_id: 'COMP-B', parent_component_id: 'COMP-A' },
  ];
  const document = {
    component_id: 'COMP-A',
    document_path: 'docs/example.md',
    canonicality: 'canonical',
    lifecycle_state: 'active',
  };

  assert.deepEqual(expandDocumentBindingsToAncestors([document, document], components), [
    { ...document, component_id: 'COMP-A' },
    { ...document, component_id: 'COMP-B' },
  ]);
});

test('repository map never treats a title-derived subject key as component identity', () => {
  const workspace = { path: 'packages/@dvt/planner' };
  const components = [
    {
      component_id: 'SYS-PLANNER-ROOT',
      repo_path: workspace.path,
      status: 'implemented',
    },
  ];
  const documents = [
    {
      subject_key: 'SYS-PLANNER-ROOT',
      document_path: 'docs/architecture/components/planner/index.md',
      canonicality: 'canonical',
      lifecycle_state: 'active',
      status: 'Active',
    },
  ];

  assert.deepEqual(resolveWorkspaceArchitecture(workspace, components, documents), {
    component: 'SYS-PLANNER-ROOT',
    componentStatus: 'implemented',
    canonicalDoc: '-',
    gaps: ['missing-doc-entry'],
  });
});

test('repository map exposes missing and ambiguous Planning DB identity instead of guessing', () => {
  const workspace = { path: 'packages/@dvt/example' };

  assert.deepEqual(resolveWorkspaceArchitecture(workspace, [], []), {
    component: '-',
    componentStatus: '-',
    canonicalDoc: '-',
    gaps: ['unregistered-component'],
  });

  const ambiguous = resolveWorkspaceArchitecture(
    workspace,
    [
      { component_id: 'COMP-A', repo_path: workspace.path, status: 'implemented' },
      { component_id: 'COMP-B', repo_path: workspace.path, status: 'implemented' },
    ],
    []
  );
  assert.deepEqual(ambiguous, {
    component: 'COMP-A, COMP-B',
    componentStatus: '-',
    canonicalDoc: '-',
    gaps: ['ambiguous-component'],
  });
});

test('repository map reports multiple explicit canonical documents as ambiguous', () => {
  const workspace = { path: 'packages/@dvt/example' };
  const components = [
    { component_id: 'COMP-EXAMPLE', repo_path: workspace.path, status: 'implemented' },
  ];
  const documents = [
    {
      component_id: 'COMP-EXAMPLE',
      document_path: 'docs/architecture/components/example/index.md',
      canonicality: 'canonical',
      lifecycle_state: 'active',
      status: 'Active',
    },
    {
      component_id: 'COMP-EXAMPLE',
      document_path: 'docs/contracts/example.md',
      canonicality: 'canonical',
      lifecycle_state: 'active',
      status: 'Active',
    },
  ];

  const result = resolveWorkspaceArchitecture(workspace, components, documents);
  assert.deepEqual(result.gaps, ['ambiguous-doc-entry']);
  assert.match(result.canonicalDoc, /docs\/architecture\/components\/example\/index\.md/u);
  assert.match(result.canonicalDoc, /docs\/contracts\/example\.md/u);
});

test('Markdown table cells escape backslashes, pipes, and line breaks deterministically', () => {
  assert.equal(
    markdownCell('docs\\component|line\nnext'),
    'docs\\\\component\\|line<br>next'
  );
});

test('generation modes isolate code-state and repository-map work', async () => {
  assert.equal(resolveGenerationMode([]), 'all');
  assert.equal(resolveGenerationMode(['--code-state-only']), 'code-state-only');
  assert.equal(resolveGenerationMode(['--repository-map-only']), 'repository-map-only');
  assert.throws(
    () => resolveGenerationMode(['--code-state-only', '--repository-map-only']),
    /Choose either/u
  );
  assert.throws(() => resolveGenerationMode(['--unknown']), /Unknown generate-code-status option/u);

  const workspaces = [{ workspace: '@fixture/example', path: 'packages/@fixture/example' }];
  const calls = [];
  const dependencies = {
    collectRepositoryWorkspaceStats: () => workspaces,
    generateCodeState: async (received) => calls.push(['code-state', received]),
    generateRepositoryMap: async (received) => calls.push(['repository-map', received]),
  };

  await main(['--code-state-only'], dependencies);
  assert.deepEqual(calls, [['code-state', workspaces]]);

  calls.length = 0;
  await main(['--repository-map-only'], dependencies);
  assert.deepEqual(calls, [['repository-map', workspaces]]);

  calls.length = 0;
  await main([], dependencies);
  assert.deepEqual(calls, [
    ['code-state', workspaces],
    ['repository-map', workspaces],
  ]);
});

test('repository map rendering is byte-stable for identical Git and DB facts', () => {
  const fixture = repositoryMapFixture();
  const first = renderRepositoryMap(fixture.workspaces, fixture.facts, '2026-08-06');
  const second = renderRepositoryMap(fixture.workspaces, fixture.facts, '2026-08-06');

  assert.equal(second, first);
});

test('repository map output replaces manual responsibility and coverage inventories', () => {
  const fixture = repositoryMapFixture();
  const output = renderRepositoryMap(fixture.workspaces, fixture.facts, '2026-08-06');

  assert.match(output, /architecture\.component_query/u);
  assert.match(output, /documentation_panel_query/u);
  assert.match(
    output,
    /\[docs\/architecture\/components\/example\/index\.md\]\(\.\.\/architecture\/components\/example\/index\.md\)/u
  );
  assert.match(output, /\[Component Map\]\(\.\.\/architecture\/component-map\.md\)/u);
  assert.match(
    output,
    /\[Canonical Doc Code Matrix\]\(\.\.\/planning\/status\/canonical-doc-code-matrix\.md\)/u
  );
  assert.match(
    output,
    /\[System Delivery Status\]\(\.\.\/architecture\/system-delivery-status\.md\)/u
  );
  assert.match(output, /\[Glossary\]\(\.\/glossary\.md\)/u);
  assert.match(output, /\[Domain Language\]\(\.\/domain-language\.md\)/u);
  assert.match(
    output,
    /This page is auto-generated by `pnpm docs:status:generate`\. Do not edit manually\./u
  );
  assert.doesNotMatch(output, /## Coverage Classes/u);
  assert.doesNotMatch(output, /\| Responsibility \|/u);
});

test(
  'live Planning DB migration/import renders current HET workspaces through explicit identities',
  { skip: process.env.DVT_REPOSITORY_MAP_INTEGRATION !== '1' },
  async () => {
    await runMigrations({ databaseUrl: dbUrl(), silent: true });
    await importContent({ databaseUrl: dbUrl(), silent: true });

    const client = new Client({ connectionString: dbUrl() });
    await client.connect();
    try {
      const facts = await readRepositoryArchitectureFacts(client);
      const workspaces = collectRepositoryWorkspaceStats();
      const workspacePaths = new Set(workspaces.map((workspace) => workspace.path));
      const output = renderRepositoryMap(workspaces, facts, '2026-08-06');

      assert.ok(facts.components.length > 0);
      assert.equal(
        facts.documents.every(
          (document) => Boolean(document.component_id) && Boolean(document.document_path)
        ),
        true
      );
      assert.equal(
        workspacePaths.has('packages/@dvt/temporal-object-file-postgres-plugin'),
        true
      );
      assert.equal(workspacePaths.has('packages/@dvt/temporal-http-json-plugin'), true);
      assert.match(output, /packages\/@dvt\/temporal-object-file-postgres-plugin/u);
      assert.match(output, /packages\/@dvt\/temporal-http-json-plugin/u);
      assert.match(output, /planning_query_store\.documentation_panel_query/u);
    } finally {
      await client.end();
    }
  }
);
