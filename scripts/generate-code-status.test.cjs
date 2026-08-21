const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const yaml = require('js-yaml');
const { Client } = require('pg');

const { importContent } = require('./planning-db-import.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');

const repoRoot = path.resolve(__dirname, '..');
const generatorPath = path.join(repoRoot, 'scripts', 'generate-code-status.cjs');
const policyPath = path.join(repoRoot, 'docs', 'generated-docs-policy.json');
const prQualityWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'pr-quality-gate.yml');
const docsDeployWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'docs-deploy.yml');
const zensicalRequirementsPath = path.join(repoRoot, '.github', 'requirements', 'zensical.lock');
const zensicalRequirementsInputPath = path.join(repoRoot, '.github', 'requirements', 'zensical.in');
const workflowScopePath = path.join(repoRoot, 'tools', 'ci', 'policy', 'workflow-scope.json');
const packageJson = require('../package.json');

function assertPrWorkflowSkipsDocumentationPublicationToolchain(steps) {
  const stepNames = steps.map((step) => step.name);
  assert.equal(stepNames.includes('Setup Python for DB-first documentation publication'), false);
  assert.equal(
    stepNames.includes('Install Zensical for DB-first documentation publication'),
    false
  );
  assert.equal(stepNames.includes('Validate DB-first documentation publication and links'), false);
  assert.equal(
    steps.some((step) => typeof step.run === 'string' && step.run.includes('pnpm docs:publish')),
    false
  );
}

const {
  buildSystemDeliveryStatusProjection,
  buildComponentTopologyProjection,
  collectRepositoryWorkspaceStats,
  listPnpmWorkspaceDirs,
  main,
  markdownCell,
  parsePnpmWorkspaceRows,
  readEvaluatedRepositorySnapshot,
  readGitTreePaths,
  readComponentTopologyFacts,
  readRepositoryArchitectureFacts,
  readRepositoryReleaseFacts,
  renderComponentMap,
  renderRepositoryMap,
  renderSystemDeliveryStatus,
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

function architectureComponent(componentId, overrides = {}) {
  return {
    component_id: componentId,
    name: `Component ${componentId}`,
    kind: 'module',
    layer: 'application',
    owner: 'Architecture',
    repo_path: `apps/${componentId.toLowerCase()}`,
    public_contract: `${componentId} contract`,
    runtime: 'node',
    criticality: 'medium',
    status: 'implemented',
    ...overrides,
  };
}

function systemDeliveryFacts(overrides = {}) {
  return {
    components: [architectureComponent('A'), architectureComponent('B')],
    maturity: [
      { component_id: 'A', maturity_score: 90, missing_reasons: [] },
      { component_id: 'B', maturity_score: 60, missing_reasons: ['missing-test-evidence'] },
    ],
    rails: [
      {
        rail_id: 'rail-a',
        rail_name: 'ReadA',
        rail_type: 'query',
        rail_status: 'implemented',
        implementation_ref_count: 1,
        is_gap: false,
        is_duplicate: false,
      },
      {
        rail_id: 'rail-b',
        rail_name: 'WriteB',
        rail_type: 'command',
        rail_status: 'missing',
        implementation_ref_count: 0,
        is_gap: true,
        is_duplicate: false,
      },
    ],
    features: [
      { feature_id: 'FEATURE-A', mechanization_status: 'closed' },
      { feature_id: 'FEATURE-B', mechanization_status: 'implemented' },
      { feature_id: 'FEATURE-C', mechanization_status: 'mixed:closed,implemented' },
    ],
    ...overrides,
  };
}

test('repository release identity is exact and fails on contradictory sources', () => {
  const release = readRepositoryReleaseFacts({
    packageJson: { version: '1.2.3' },
    releaseManifest: { '.': '1.2.3' },
    changelog: '# Changelog\n\n## 1.2.3 (2026-08-10)\n',
  });
  assert.deepEqual(release, { version: '1.2.3' });

  assert.throws(
    () =>
      readRepositoryReleaseFacts({
        packageJson: { version: '1.2.3' },
        releaseManifest: { '.': '1.2.4' },
        changelog: '# Changelog\n\n## 1.2.3 (2026-08-10)\n',
      }),
    /Contradictory repository release identity.*1\.2\.3.*1\.2\.4/u
  );
  assert.throws(
    () =>
      readRepositoryReleaseFacts({
        packageJson: { version: '1.2.3' },
        releaseManifest: {},
        changelog: '# Changelog\n',
      }),
    /Required repository release fact/u
  );
});

test('System Delivery Status refuses worktree facts outside the evaluated Git commit', () => {
  const calls = [];
  assert.throws(
    () =>
      readEvaluatedRepositorySnapshot({
        release: { version: '1.2.3' },
        root: 'C:/fixture',
        gitTreePaths: new Map(),
        spawnSync: (command, args) => {
          calls.push({ command, args });
          if (args[0] === 'rev-parse') {
            return { status: 0, stdout: 'evaluated-sha\n', stderr: '' };
          }
          return {
            status: 0,
            stdout: ' M package.json\n?? packages/new/src/index.ts\n',
            stderr: '',
          };
        },
      }),
    /clean Git worktree.*package\.json.*packages\/new\/src\/index\.ts/su
  );
  assert.deepEqual(
    calls.map(({ args }) => args[0]),
    ['rev-parse', 'rev-parse', 'status']
  );
});

test('System Delivery Status projects exact Git, workspace, maturity, rail, and feature facts', () => {
  const projection = buildSystemDeliveryStatusProjection(
    [
      workspaceRow({ workspace: '@dvt/a', src: 3, tests: 2, hasBuild: 'yes', hasTest: 'yes' }),
      workspaceRow({ workspace: '@dvt/b', src: 4, tests: 1, hasBuild: 'no', hasTest: 'yes' }),
    ],
    systemDeliveryFacts(),
    { gitSha: 'evaluated-sha', release: { version: '1.2.3' } }
  );

  assert.deepEqual(projection.repository, {
    gitSha: 'evaluated-sha',
    version: '1.2.3',
    workspaceCount: 2,
    sourceFileCount: 7,
    testFileCount: 3,
    buildScriptCount: 1,
    testScriptCount: 2,
  });
  assert.deepEqual(projection.architecture, {
    componentCount: 2,
    maturityRegisteredCount: 2,
    componentsMissingMaturity: [],
    maturityScoreCounts: { 60: 1, 90: 1 },
  });
  assert.deepEqual(projection.delivery, {
    railCount: 2,
    railGapCount: 1,
    duplicateRailCount: 0,
    featureCount: 3,
    featureStatuses: { closed: 1, implemented: 1, 'mixed:closed,implemented': 1 },
    railStatuses: { implemented: 1, missing: 1 },
  });
  assert.deepEqual(projection.gaps, ['rail:command:WriteB:missing']);

  const first = renderSystemDeliveryStatus(projection, '2026-08-10');
  assert.equal(renderSystemDeliveryStatus(projection, '2026-08-10'), first);
  assert.match(first, /`evaluated-sha`/u);
  assert.match(first, /1\.2\.3/u);
  assert.match(first, /Exact Planning DB status only/u);
  assert.match(first, /Effective command\/query rail rows \| 2/u);
  assert.match(first, /rail:command:WriteB:missing/u);
  assert.doesNotMatch(first, /capability coverage.*truth/iu);
});

test('System Delivery Status fails closed for unavailable DB facts and duplicate rails', () => {
  assert.throws(
    () =>
      buildSystemDeliveryStatusProjection([], systemDeliveryFacts({ maturity: undefined }), {
        gitSha: 'evaluated-sha',
        release: { version: '1.2.3' },
      }),
    /Required Planning DB fact.*maturity/u
  );
  assert.throws(
    () =>
      buildSystemDeliveryStatusProjection(
        [],
        systemDeliveryFacts({
          rails: [
            {
              rail_id: 'duplicate',
              rail_name: 'ReadA',
              rail_type: 'query',
              rail_status: 'implemented',
              is_duplicate: true,
            },
          ],
        }),
        { gitSha: 'evaluated-sha', release: { version: '1.2.3' } }
      ),
    /Duplicate command\/query rail authority.*ReadA/u
  );
});

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
  assert.equal(
    workspaces.some((workspace) => workspace.workspace === '@fixture/ignored'),
    false
  );
  assert.ok(fs.existsSync(ignored.directory));
});

test('evaluated workspace facts exclude files absent from the Git tree', (t) => {
  const workspace = createWorkspaceFixture(t, 'apps/alpha', '@fixture/alpha');
  fs.mkdirSync(path.join(workspace.directory, 'src', 'tmp'), { recursive: true });
  fs.mkdirSync(path.join(workspace.directory, 'test', 'results'), { recursive: true });
  fs.writeFileSync(
    path.join(workspace.directory, 'src', 'tmp', 'ignored.ts'),
    'export const ignored = true;\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(workspace.directory, 'test', 'results', 'ignored.ts'),
    'export const ignoredTest = true;\n',
    'utf8'
  );

  const [facts] = collectRepositoryWorkspaceStats({
    root: workspace.root,
    workspaceDirs: [workspace.directory],
    gitTreePaths: new Map([
      ['apps/alpha', 'tree'],
      ['apps/alpha/package.json', 'blob'],
      ['apps/alpha/src', 'tree'],
      ['apps/alpha/src/index.ts', 'blob'],
    ]),
  });

  assert.equal(facts.src, 1);
  assert.equal(facts.tests, 0);
});

test('evaluated workspace membership rejects a package absent from the Git tree', (t) => {
  const workspace = createWorkspaceFixture(t, 'apps/tmp', '@fixture/ignored');

  assert.throws(
    () =>
      collectRepositoryWorkspaceStats({
        root: workspace.root,
        workspaceDirs: [workspace.directory],
        gitTreePaths: new Map(),
      }),
    /Workspace apps\/tmp is not part of the evaluated Git tree/u
  );
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

test('pnpm workspace rules drive real add, rename, exclusion, and removal fixtures', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repository-map-pnpm-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    `${JSON.stringify({ name: 'fixture-root', private: true }, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    "packages:\n  - 'apps/*'\n  - 'packages/*'\n  - '!packages/excluded'\n",
    'utf8'
  );
  const alpha = createWorkspaceFixture(t, 'apps/alpha', '@fixture/alpha', { root });
  const beta = createWorkspaceFixture(t, 'packages/beta', '@fixture/beta', { root });
  createWorkspaceFixture(t, 'packages/excluded', '@fixture/excluded', { root });

  const selectedPaths = () =>
    listPnpmWorkspaceDirs({ root }).map(
      (directory) => path.relative(root, directory).split(path.sep).join('/') || '.'
    );
  assert.deepEqual(selectedPaths(), ['.', 'apps/alpha', 'packages/beta']);

  const renamed = path.join(root, 'apps', 'renamed');
  fs.renameSync(alpha.directory, renamed);
  assert.deepEqual(selectedPaths(), ['.', 'apps/renamed', 'packages/beta']);

  fs.rmSync(beta.directory, { recursive: true, force: true });
  assert.deepEqual(selectedPaths(), ['.', 'apps/renamed']);
});

test('the effective pnpm root is rendered as an explicit repository workspace', () => {
  assert.deepEqual(
    collectRepositoryWorkspaceStats({ workspaceDirs: [repoRoot] }).map((workspace) => ({
      workspace: workspace.workspace,
      path: workspace.path,
      kind: workspace.kind,
      localReadmePath: workspace.localReadmePath,
    })),
    [{ workspace: 'dvt', path: '.', kind: 'root', localReadmePath: 'README.md' }]
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

test('architecture facts join exact governed documents by document path', async () => {
  const queries = [];
  const component = {
    component_id: 'SYS-CONTRACTS-ROOT',
    repo_path: 'packages/@dvt/contracts',
    status: 'review',
  };
  const document = {
    component_id: 'SYS-CONTRACTS-ROOT',
    document_path: 'docs/contracts/index.md',
    canonicality: 'canonical',
    lifecycle_state: 'active',
    status: 'Active',
  };
  const client = {
    async query(sql) {
      queries.push(sql);
      return { rows: queries.length === 1 ? [component] : [document] };
    },
  };

  assert.deepEqual(await readRepositoryArchitectureFacts(client), {
    components: [component],
    documents: [document],
  });
  assert.match(queries[0], /not in \('deprecated', 'drift'\)/u);
  assert.match(queries[1], /component_engineering_document_query/u);
  assert.match(queries[1], /documentation_lifecycle_query/u);
  assert.match(queries[1], /document_kind = 'governing'/u);
  assert.doesNotMatch(queries[1], /subject_key/u);
});

test('missing and ambiguous component/document identity stays fail-closed', () => {
  const workspace = workspaceRow();
  assert.deepEqual(resolveWorkspaceArchitecture(workspace, [], []).gaps, [
    'unregistered-component',
  ]);
  assert.deepEqual(
    resolveWorkspaceArchitecture(
      workspace,
      [{ component_id: 'A', repo_path: workspace.path, status: 'implemented' }],
      [
        {
          component_id: 'A',
          document_path: 'docs/undeclared-canonicality.md',
          lifecycle_state: 'active',
          status: 'Active',
        },
      ]
    ).gaps,
    ['missing-canonical-doc-binding']
  );
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
  assert.deepEqual(linked, {
    entry:
      '[packages/@dvt/example/README.md](https://github.com/dunay2/dvt/blob/main/packages/@dvt/example/README.md)',
    coverage: 'linked-local',
  });
  assert.deepEqual(resolveDocumentationProjection(workspaceRow(), { canonicalDoc: '-' }), {
    entry: '-',
    coverage: 'reference-only',
  });
});

test('Markdown cells are deterministic and safe', () => {
  assert.equal(markdownCell('docs\\component|line\nnext'), 'docs\\\\component\\|line<br>next');
});

test('component topology projection uses exact DB identities, registered edges, and explicit gaps', () => {
  const facts = {
    components: [
      architectureComponent('B', { repo_path: 'apps/missing' }),
      architectureComponent('A'),
    ],
    relations: [
      {
        relation_id: 'REL-B-A',
        source_component_id: 'B',
        target_component_id: 'A',
        relation_type: 'calls',
        direction: 'outbound',
        status: 'drift',
      },
    ],
    responsibilities: [
      {
        responsibility_id: 'RESP-A',
        component_id: 'A',
        responsibility: 'Own A behavior.',
        ddd_owner: 'A context',
        status: 'implemented',
      },
    ],
    observability: [
      {
        observability_id: 'OBS-A-TRACE',
        component_id: 'A',
        signal_name: 'A trace is exported.',
        signal_kind: 'trace',
        required: true,
        status: 'implemented',
      },
      {
        observability_id: 'OBS-A-METRIC',
        component_id: 'A',
        signal_name: 'A metric export is unavailable.',
        signal_kind: 'metric',
        required: true,
        status: 'missing',
      },
    ],
    maturity: [
      { component_id: 'B', maturity_score: '62', missing_reasons: [] },
      { component_id: 'A', maturity_score: '91', missing_reasons: [] },
    ],
    drift: [
      {
        subject_kind: 'component',
        subject_id: 'A',
        drift_code: 'missing-runtime-evidence',
        severity: 'warning',
      },
      {
        subject_kind: 'relation',
        subject_id: 'REL-B-A',
        drift_code: 'relation-status-drift',
        severity: 'error',
      },
    ],
    documents: [
      {
        component_id: 'A',
        document_path: 'docs/architecture/components/a/index.md',
        canonicality: 'canonical',
        lifecycle_state: 'active',
        status: 'Active',
      },
    ],
  };
  const projection = buildComponentTopologyProjection(facts, {
    gitSha: 'fixture-sha',
    gitTreePaths: new Map([
      ['apps/a', 'tree'],
      ['docs/architecture/components/a/index.md', 'blob'],
    ]),
    repositoryUrl: 'https://github.com/example/dvt',
  });

  assert.deepEqual(
    projection.components.map((component) => component.componentId),
    ['A', 'B']
  );
  assert.equal(
    projection.components[0].repositoryLink,
    'https://github.com/example/dvt/tree/fixture-sha/apps/a'
  );
  assert.deepEqual(projection.components[0].canonicalDocuments, [
    {
      documentPath: 'docs/architecture/components/a/index.md',
      link: 'components/a/index.md',
    },
  ]);
  assert.deepEqual(projection.components[0].gaps, []);
  assert.deepEqual(projection.components[0].drift, ['missing-runtime-evidence']);
  assert.deepEqual(
    projection.components[0].observability.map(({ observabilityId, status }) => ({
      observabilityId,
      status,
    })),
    [
      { observabilityId: 'OBS-A-METRIC', status: 'missing' },
      { observabilityId: 'OBS-A-TRACE', status: 'implemented' },
    ]
  );
  assert.deepEqual(projection.components[1].gaps, [
    'missing-repository-path',
    'missing-canonical-document',
    'missing-responsibility',
  ]);
  assert.deepEqual(projection.components[1].drift, ['relation-status-drift']);
  assert.deepEqual(projection.relations, [
    {
      direction: 'outbound',
      relationId: 'REL-B-A',
      relationType: 'calls',
      sourceComponentId: 'B',
      status: 'drift',
      targetComponentId: 'A',
    },
  ]);

  const first = renderComponentMap(projection, '2026-08-10');
  const second = renderComponentMap(projection, '2026-08-10');
  assert.equal(second, first);
  assert.match(first, /B → A/u);
  assert.match(first, /Own A behavior\./u);
  assert.match(first, /A metric export is unavailable\..*missing/su);
  assert.match(first, /Architecture and design consultation must use the Planning DB query rails/u);
  assert.match(first, /missing-repository-path/u);
  assert.match(first, /auto-generated by `pnpm docs:status:generate`/u);
});

test('component topology resolves repository paths from the evaluated Git tree', () => {
  const facts = {
    components: [
      architectureComponent('A'),
      architectureComponent('WORKTREE', { repo_path: 'apps/worktree-only' }),
    ],
    relations: [],
    responsibilities: [],
    maturity: [],
    drift: [],
    documents: [],
  };
  const projection = buildComponentTopologyProjection(facts, {
    gitSha: 'fixture-sha',
    gitTreePaths: new Map([
      ['apps/a', 'tree'],
      ['apps/a/index.ts', 'blob'],
    ]),
    pathExists: () => true,
    repositoryUrl: 'https://github.com/example/dvt',
  });

  assert.equal(
    projection.components[0].repositoryLink,
    'https://github.com/example/dvt/tree/fixture-sha/apps/a'
  );
  assert.equal(projection.components[1].repositoryLink, null);
  assert.ok(projection.components[1].gaps.includes('missing-repository-path'));
});

test('Git tree paths are read once from the evaluated commit and fail closed', () => {
  const calls = [];
  const paths = readGitTreePaths({
    gitSha: 'fixture-sha',
    root: 'C:/fixture',
    spawnSync: (command, args, options) => {
      calls.push({ command, args, options });
      return {
        status: 0,
        stdout:
          '040000 tree 1111111111111111111111111111111111111111\tapps/a\0' +
          '100644 blob 2222222222222222222222222222222222222222\tapps/a/index.ts\0',
        stderr: '',
      };
    },
  });

  assert.deepEqual(
    [...paths],
    [
      ['apps/a', 'tree'],
      ['apps/a/index.ts', 'blob'],
    ]
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ['ls-tree', '-rz', '-t', '--full-tree', 'fixture-sha']);
  assert.throws(
    () =>
      readGitTreePaths({
        gitSha: 'fixture-sha',
        spawnSync: () => ({ status: 128, stdout: '', stderr: 'unknown revision' }),
      }),
    /Cannot read Component Map Git tree.*unknown revision/u
  );
});

test('component topology fails closed on duplicate identities and unknown endpoints', () => {
  const options = {
    gitSha: 'fixture-sha',
    gitTreePaths: new Map([['apps/a', 'blob']]),
    repositoryUrl: 'https://github.com/example/dvt',
  };
  assert.throws(
    () =>
      buildComponentTopologyProjection(
        {
          components: [architectureComponent('A'), architectureComponent('A')],
          relations: [],
          responsibilities: [],
          maturity: [],
          drift: [],
          documents: [],
        },
        options
      ),
    /Duplicate Planning DB component identity A/u
  );
  assert.throws(
    () =>
      buildComponentTopologyProjection(
        {
          components: [architectureComponent('A')],
          relations: [
            {
              relation_id: 'REL-A-MISSING',
              source_component_id: 'A',
              target_component_id: 'MISSING',
              relation_type: 'calls',
            },
          ],
          responsibilities: [],
          maturity: [],
          drift: [],
          documents: [],
        },
        options
      ),
    /Unknown Planning DB relation endpoint MISSING.*REL-A-MISSING/u
  );
});

test('component topology rejects an invalid current canonical document binding', () => {
  assert.throws(
    () =>
      buildComponentTopologyProjection(
        {
          components: [architectureComponent('A')],
          relations: [],
          responsibilities: [],
          maturity: [],
          drift: [],
          documents: [
            {
              component_id: 'A',
              document_path: 'docs/architecture/components/a/missing.md',
              canonicality: 'canonical',
              lifecycle_state: 'active',
              status: 'Active',
            },
          ],
        },
        {
          gitSha: 'fixture-sha',
          gitTreePaths: new Map([['apps/a', 'tree']]),
          repositoryUrl: 'https://github.com/example/dvt',
        }
      ),
    /Invalid canonical component document.*A.*docs\/architecture\/components\/a\/missing\.md/u
  );
});

test('component topology reports a current document binding whose component is absent', () => {
  const projection = buildComponentTopologyProjection(
    {
      components: [architectureComponent('A')],
      relations: [],
      responsibilities: [],
      maturity: [],
      drift: [],
      documents: [
        {
          component_id: 'RETIRED',
          document_path: 'docs/architecture/components/retired.md',
          canonicality: 'canonical',
          lifecycle_state: 'active',
          status: 'Active',
        },
      ],
    },
    {
      gitSha: 'fixture-sha',
      gitTreePaths: new Map([
        ['apps/a', 'blob'],
        ['docs/architecture/components/retired.md', 'blob'],
      ]),
      repositoryUrl: 'https://github.com/example/dvt',
    }
  );

  assert.deepEqual(projection.globalGaps, [
    'orphan-canonical-document-binding:RETIRED:docs/architecture/components/retired.md',
  ]);
});

test('generation modes isolate each on-demand documentation projection', async () => {
  assert.equal(resolveGenerationMode([]), 'all');
  assert.equal(resolveGenerationMode(['--code-state-only']), 'code-state-only');
  assert.equal(resolveGenerationMode(['--repository-map-only']), 'repository-map-only');
  assert.equal(resolveGenerationMode(['--component-map-only']), 'component-map-only');
  assert.equal(
    resolveGenerationMode(['--system-delivery-status-only']),
    'system-delivery-status-only'
  );
  assert.equal(resolveGenerationMode(['--repository-map-only', '--check']), 'repository-map-only');
  assert.throws(
    () => resolveGenerationMode(['--code-state-only', '--repository-map-only']),
    /Choose either/u
  );

  const workspaces = [workspaceRow()];
  const calls = [];
  const evaluatedRepository = { gitSha: 'fixture-sha', release: { version: '1.2.3' } };
  const dependencies = {
    collectRepositoryWorkspaceStats: () => {
      calls.push('collect');
      return workspaces;
    },
    generateCodeState: async () => calls.push('code'),
    generateComponentMap: async () => calls.push('component-map'),
    generateRepositoryMap: async () => calls.push('map'),
    generateSystemDeliveryStatus: async (_workspaces, snapshot) => {
      assert.equal(snapshot, evaluatedRepository);
      calls.push('system-status');
    },
    readEvaluatedRepositorySnapshot: () => {
      calls.push('snapshot');
      return evaluatedRepository;
    },
  };
  await main(['--code-state-only'], dependencies);
  assert.deepEqual(calls, ['collect', 'code']);
  calls.length = 0;
  await main(['--repository-map-only'], dependencies);
  assert.deepEqual(calls, ['collect', 'map']);
  calls.length = 0;
  await main(['--component-map-only'], dependencies);
  assert.deepEqual(calls, ['component-map']);
  calls.length = 0;
  await main(['--system-delivery-status-only'], dependencies);
  assert.deepEqual(calls, ['snapshot', 'collect', 'system-status']);
});

test('routine docs status checks remain DB-free and do not publish documentation', () => {
  assert.equal(
    packageJson.scripts['docs:status:check'],
    'pnpm docs:status:generate --code-state-only --check'
  );
});

test('DB-free checks stay separate from mandatory DB-first consultation and publication', () => {
  assert.match(packageJson.scripts['docs:ci'], /docs:status:generate --code-state-only/u);

  const publicationGuidancePaths = [
    'AGENTS.md',
    'docs/DOCS_README.md',
    'docs/guides/documentation-maintenance-guide-20260407.md',
  ];
  for (const guidancePath of publicationGuidancePaths) {
    const content = fs.readFileSync(path.join(repoRoot, guidancePath), 'utf8');
    assert.match(content, /planning:db:query architecture-designs/u, guidancePath);
    assert.match(content, /pnpm docs:publish/u, guidancePath);
    assert.match(
      content,
      /docs:serve[\s\S]{0,160}(?:does not|do not) generate|(?:does not|do not) generate[\s\S]{0,160}docs:serve/iu,
      guidancePath
    );
    assert.doesNotMatch(content, /tracked Repository Map|commit the map/iu, guidancePath);
  }
});

test('code-state-only generation does not require a reachable Planning DB', () => {
  const result = spawnSync(process.execPath, [generatorPath, '--code-state-only'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:1/invalid',
      DVT_PLANNING_DB_URL: 'postgresql://invalid:invalid@127.0.0.1:1/invalid',
    },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('repository map output is byte-stable and preserves governed navigation', () => {
  const workspaces = [workspaceRow({ localReadmePath: 'packages/@dvt/example/README.md' })];
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
  assert.match(first, /Conventional src files/u);
  assert.match(first, /Root-level `scripts\/` and `tools\/` are outside these counts\./u);
  assert.doesNotMatch(first, /\| Responsibility \|/u);
});

test('policy names actual inputs and the minimal generator command', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const entry = policy.artifactClasses.find((item) => item.id === 'local-docs-repository-map');
  assert.ok(entry);
  assert.equal(entry.generatorCommand, 'pnpm docs:status:generate --repository-map-only');
  assert.deepEqual(entry.artifacts, ['.generated-docs/concepts/repository-map.md']);
  assert.equal(entry.tracking, 'untracked');
  assert.equal(entry.manualEditPolicy, 'generator-owned');
  assert.deepEqual(entry.publication, { enabled: true });
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'concepts', 'repository-map.md')), false);
  assert.ok(entry.sourcePaths.includes('package.json'));
  assert.ok(entry.sourcePaths.includes('pnpm-workspace.yaml'));
  assert.ok(entry.sourcePaths.includes('scripts/generated-doc-date.cjs'));
  assert.ok(entry.sourcePaths.includes('tools/planning-db/schema.sql'));
  assert.ok(!entry.sourcePaths.includes('tools/planning-db/state/canonical-state.json'));
  assert.ok(entry.sourcePaths.includes('scripts/planning-db-import.cjs'));
  assert.ok(
    entry.sourcePaths.includes('docs/planning/status/system-governance-unit-index.units.yaml')
  );
  assert.ok(entry.sourcePaths.includes('docs/*.md'));
  assert.ok(entry.sourcePaths.includes('docs/**/*.md'));
  assert.ok(entry.sourcePaths.includes('buzon/*.md'));
  for (const sourcePath of [
    '.',
    'README.md',
    '**/README.md',
    '**/package.json',
    '**/src/**',
    '**/test/**',
  ]) {
    assert.ok(entry.sourcePaths.includes(sourcePath), sourcePath);
  }
  assert.equal(
    entry.sourcePaths.some((value) => value.includes('subject_key')),
    false
  );
});

test('Component Map policy is DB-first, on-demand, and has no manual catalog', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const entry = policy.artifactClasses.find((item) => item.id === 'local-docs-component-map');
  assert.ok(entry);
  assert.equal(entry.generatorCommand, 'pnpm docs:status:generate --component-map-only');
  assert.deepEqual(entry.artifacts, ['.generated-docs/architecture/component-map.md']);
  assert.equal(entry.tracking, 'untracked');
  assert.equal(entry.manualEditPolicy, 'generator-owned');
  assert.deepEqual(entry.publication, { enabled: true });
  assert.ok(entry.sourcePaths.includes('scripts/planning-db-query.cjs'));
  assert.ok(entry.sourcePaths.includes('tools/planning-db/schema.sql'));
  assert.deepEqual(
    entry.dbBackedArtifacts.map((group) => group.queryView),
    [
      'architecture.component_query',
      'architecture.relation_query',
      'architecture.responsibility_query',
      'architecture.maturity_query',
      'architecture.drift_query',
      'planning_query_store.component_engineering_document_query',
    ]
  );
  for (const group of entry.dbBackedArtifacts) {
    assert.deepEqual(group.artifacts, ['.generated-docs/architecture/component-map.md']);
    assert.equal(group.importCommand, 'pnpm planning:db:import');
    assert.equal(group.checkCommand, 'pnpm docs:status:generate --component-map-only');
  }

  assert.equal(
    fs.existsSync(path.join(repoRoot, 'docs', 'architecture', 'component-map.md')),
    false
  );
  const componentIndex = fs.readFileSync(
    path.join(repoRoot, 'docs', 'architecture', 'components', 'index.md'),
    'utf8'
  );
  assert.doesNotMatch(componentIndex, /## Current Component Entry Points/u);
  assert.match(componentIndex, /DB-first Component Map/u);
});

test('System Delivery Status policy is DB-first, on-demand, and has no manual snapshot', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const entry = policy.artifactClasses.find(
    (item) => item.id === 'local-docs-system-delivery-status'
  );
  assert.ok(entry);
  assert.equal(entry.generatorCommand, 'pnpm docs:status:generate --system-delivery-status-only');
  assert.deepEqual(entry.artifacts, ['.generated-docs/architecture/system-delivery-status.md']);
  assert.equal(entry.tracking, 'untracked');
  assert.equal(entry.manualEditPolicy, 'generator-owned');
  assert.deepEqual(entry.publication, { enabled: true });
  assert.equal(
    fs.existsSync(path.join(repoRoot, 'docs', 'architecture', 'system-delivery-status.md')),
    false
  );
  assert.ok(entry.sourcePaths.includes('package.json'));
  assert.ok(entry.sourcePaths.includes('.release-please-manifest.json'));
  assert.ok(entry.sourcePaths.includes('CHANGELOG.md'));
  assert.ok(!entry.sourcePaths.includes('tools/planning-db/state/canonical-state.json'));
  assert.deepEqual(
    entry.dbBackedArtifacts.map((group) => group.queryView),
    [
      'architecture.component_query',
      'architecture.maturity_query',
      'planning_query_store.command_query_rail_query',
      'planning_query_store.command_query_rail_manifest_query',
    ]
  );
  for (const group of entry.dbBackedArtifacts) {
    assert.deepEqual(group.artifacts, ['.generated-docs/architecture/system-delivery-status.md']);
    assert.equal(group.importCommand, 'pnpm planning:db:import');
    assert.equal(group.checkCommand, 'pnpm docs:status:generate --system-delivery-status-only');
  }
});

test('generator no longer reads the empty documentation panel binding', () => {
  const source = fs.readFileSync(generatorPath, 'utf8');
  assert.doesNotMatch(source, /documentation_panel_query/u);
  assert.match(source, /not in \('deprecated', 'drift'\)/u);
  assert.match(source, /pnpmCommand\(\)/u);
  assert.doesNotMatch(source, /npm_lifecycle_event === 'docs:status:check'/u);
});

test('on-demand Planning DB publication provides explicit Git refs to the importer', () => {
  const workflow = yaml.load(fs.readFileSync(docsDeployWorkflowPath, 'utf8'));
  const workflowScope = JSON.parse(fs.readFileSync(workflowScopePath, 'utf8'));
  const publicationAuthorityStep = workflow.jobs['build-deploy'].steps.find(
    (step) => step.name === 'Prepare Planning DB publication authority'
  );

  assert.ok(publicationAuthorityStep, 'expected the on-demand Planning DB publication step');
  assert.equal(publicationAuthorityStep.env.GIT_BASE, '${{ github.sha }}');
  assert.equal(publicationAuthorityStep.env.GIT_HEAD, '${{ github.sha }}');
  assert.ok(workflowScope.generated_status_relevant.includes('scripts/generated-doc-date.cjs'));
  assert.ok(
    !workflowScope.generated_status_relevant.includes(
      'tools/planning-db/state/canonical-state.json'
    )
  );
  assert.ok(workflowScope.generated_status_relevant.includes('scripts/planning-db-import.cjs'));
  assert.ok(
    workflowScope.generated_status_relevant.includes(
      'docs/planning/status/system-governance-unit-index.units.yaml'
    )
  );
  assert.ok(workflowScope.generated_status_relevant.includes('docs/*.md'));
  assert.ok(workflowScope.generated_status_relevant.includes('docs/**/*.md'));
  assert.ok(workflowScope.generated_status_relevant.includes('buzon/*.md'));
  for (const sourcePath of [
    'README.md',
    'src/**',
    'test/**',
    '**/README.md',
    '**/package.json',
    '**/src/**',
    '**/test/**',
  ]) {
    assert.ok(workflowScope.generated_status_relevant.includes(sourcePath), sourcePath);
  }
});

test('ordinary PR checks skip publication while explicit docs deploy pins Zensical', () => {
  const workflow = yaml.load(fs.readFileSync(prQualityWorkflowPath, 'utf8'));
  const deployWorkflow = yaml.load(fs.readFileSync(docsDeployWorkflowPath, 'utf8'));
  const steps = workflow.jobs['pr-checks'].steps;
  const deploySteps = deployWorkflow.jobs['build-deploy'].steps;
  const canonicalSetup = deploySteps.find((step) => step.name === 'Setup Python');
  const canonicalInstall = deploySteps.find((step) => step.name === 'Install Zensical');

  assertPrWorkflowSkipsDocumentationPublicationToolchain(steps);
  assert.match(canonicalSetup.uses, /^actions\/setup-python@[0-9a-f]{40}$/u);
  assert.equal(canonicalSetup.with['python-version'], '3.12.10');
  assert.equal(canonicalSetup.with.cache, 'pip');
  assert.equal(canonicalSetup.with['cache-dependency-path'], '.github/requirements/zensical.lock');
  assert.equal(
    canonicalInstall.run.trim(),
    'python -m pip install --disable-pip-version-check --require-hashes -r .github/requirements/zensical.lock'
  );
  assert.doesNotMatch(canonicalInstall.run, /--upgrade/u);

  const lockedRequirements = fs.readFileSync(zensicalRequirementsPath, 'utf8');
  const directRequirements = fs
    .readFileSync(zensicalRequirementsInputPath, 'utf8')
    .replaceAll('\r\n', '\n');
  assert.equal(directRequirements, 'pip==26.0.1\nzensical==0.0.39\n');
  assert.match(lockedRequirements, /\.github\/requirements\/zensical\.in/u);
  assert.match(lockedRequirements, /^pip==26\.0\.1\s+\\$/mu);
  assert.match(lockedRequirements, /^zensical==0\.0\.39\s+\\$/mu);
  assert.match(lockedRequirements, /--hash=sha256:[0-9a-f]{64}/u);
});

test('Component Map scopes architecture drift reads to topology subject kinds', async () => {
  const driftFilters = [];
  const emptyReader = async () => [];
  const facts = await readComponentTopologyFacts(
    {},
    {
      readArchitectureComponentRows: emptyReader,
      readArchitectureRelationRows: emptyReader,
      readArchitectureResponsibilityRows: emptyReader,
      readArchitectureMaturityRows: emptyReader,
      readArchitectureObservabilityRows: emptyReader,
      readArchitectureComponentDocumentRows: emptyReader,
      readArchitectureDriftRows: async (_client, filters) => {
        driftFilters.push(filters);
        return [{ subject_kind: filters.subjectKind }];
      },
    }
  );

  assert.deepEqual(driftFilters, [
    { limit: 100000, subjectKind: 'component' },
    { limit: 100000, subjectKind: 'relation' },
  ]);
  assert.deepEqual(facts.drift, [{ subject_kind: 'component' }, { subject_kind: 'relation' }]);
});

test(
  'live Planning DB current-state import renders both DB-first maps deterministically',
  { skip: process.env.DVT_REPOSITORY_MAP_INTEGRATION !== '1' },
  async () => {
    await importContent({ databaseUrl: dbUrl(), silent: true });
    const client = new Client({ connectionString: dbUrl() });
    await client.connect();
    try {
      const facts = await readRepositoryArchitectureFacts(client);
      const topologyFacts = await readComponentTopologyFacts(client);
      const topology = buildComponentTopologyProjection(topologyFacts);
      const workspaces = collectRepositoryWorkspaceStats();
      const independentPnpmResult = spawnSync(
        process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
        ['list', '-r', '--depth', '-1', '--json'],
        { cwd: repoRoot, encoding: 'utf8', shell: process.platform === 'win32' }
      );
      assert.equal(
        independentPnpmResult.status,
        0,
        `${independentPnpmResult.stdout}\n${independentPnpmResult.stderr}`
      );
      const effectiveWorkspacePaths = parsePnpmWorkspaceRows(independentPnpmResult.stdout)
        .map((row) => path.resolve(row.path))
        .map((directory) => path.relative(repoRoot, directory).split(path.sep).join('/') || '.')
        .sort();
      const renderedWorkspacePaths = workspaces.map((workspace) => workspace.path).sort();
      const paths = new Set(workspaces.map((workspace) => workspace.path));
      const output = renderRepositoryMap(workspaces, facts, '2026-08-06');
      assert.deepEqual(renderedWorkspacePaths, effectiveWorkspacePaths);
      assert.equal(new Set(renderedWorkspacePaths).size, renderedWorkspacePaths.length);
      assert.ok(facts.components.length > 0);
      assert.ok(facts.documents.length > 0);
      assert.equal(paths.has('packages/@dvt/temporal-http-json-plugin'), true);
      assert.equal(paths.has('packages/@dvt/temporal-object-file-postgres-plugin'), true);
      assert.match(output, /docs\/contracts\/index\.md/u);
      assert.match(output, /ambiguous-canonical-doc-binding/u);
      assert.match(output, /missing-canonical-doc-binding/u);
      assert.doesNotMatch(output, /documentation_panel_query/u);
      assert.equal(
        new Set(topology.components.map((component) => component.componentId)).size,
        topology.components.length
      );
      assert.equal(topology.relationCount, topologyFacts.relations.length);
      assert.ok(topology.components.length > 0);
      assert.ok(topology.relationCount > 0);
      assert.ok(
        topology.globalGaps.every((gap) => gap.startsWith('orphan-canonical-document-binding:'))
      );

      const outputPath = path.join(repoRoot, '.generated-docs', 'concepts', 'repository-map.md');
      await main(['--repository-map-only']);
      const firstGeneration = fs.readFileSync(outputPath);
      const firstModifiedAt = fs.statSync(outputPath, { bigint: true }).mtimeNs;
      const messages = [];
      const originalLog = console.log;
      console.log = (...values) => messages.push(values.join(' '));
      try {
        await main(['--repository-map-only']);
      } finally {
        console.log = originalLog;
      }
      assert.deepEqual(fs.readFileSync(outputPath), firstGeneration);
      assert.equal(fs.statSync(outputPath, { bigint: true }).mtimeNs, firstModifiedAt);
      assert.ok(messages.some((message) => message.includes('already up to date')));

      const componentOutputPath = path.join(
        repoRoot,
        '.generated-docs',
        'architecture',
        'component-map.md'
      );
      await main(['--component-map-only']);
      const firstComponentGeneration = fs.readFileSync(componentOutputPath);
      const firstComponentModifiedAt = fs.statSync(componentOutputPath, { bigint: true }).mtimeNs;
      messages.length = 0;
      console.log = (...values) => messages.push(values.join(' '));
      try {
        await main(['--component-map-only']);
      } finally {
        console.log = originalLog;
      }
      assert.deepEqual(fs.readFileSync(componentOutputPath), firstComponentGeneration);
      assert.equal(
        fs.statSync(componentOutputPath, { bigint: true }).mtimeNs,
        firstComponentModifiedAt
      );
      assert.ok(messages.some((message) => message.includes('already up to date')));
    } finally {
      await client.end();
    }
  }
);
