const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const generatorPath = path.join(repoRoot, 'scripts', 'generate-code-status.cjs');
const policyPath = path.join(repoRoot, 'docs', 'generated-docs-policy.json');

const {
  main,
  markdownCell,
  renderRepositoryMap,
  resolveGenerationMode,
  resolveWorkspaceArchitecture,
} = require('./generate-code-status.cjs');

test('code status generator renders the generated inventory outside tracked docs', () => {
  const source = fs.readFileSync(generatorPath, 'utf8');

  assert.match(source, /'\.generated-docs'/u);
  assert.match(source, /'planning'[\s\S]*'status'[\s\S]*'generated-code-state\.md'/u);
  assert.doesNotMatch(
    source,
    /const outputPath = path\.join\(repoRoot, 'docs', 'planning', 'status', 'generated-code-state\.md'\)/u
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

test('generation modes keep code-state-only execution independent from Planning DB', async () => {
  assert.equal(resolveGenerationMode([]), 'all');
  assert.equal(resolveGenerationMode(['--code-state-only']), 'code-state-only');
  assert.equal(resolveGenerationMode(['--repository-map-only']), 'repository-map-only');
  assert.throws(
    () => resolveGenerationMode(['--code-state-only', '--repository-map-only']),
    /Choose either/u
  );
  assert.throws(() => resolveGenerationMode(['--unknown']), /Unknown generate-code-status option/u);

  let clientConstructed = false;
  class UnexpectedClient {
    constructor() {
      clientConstructed = true;
      throw new Error('Planning DB must not be constructed in code-state-only mode');
    }
  }

  await main(['--code-state-only'], { ClientCtor: UnexpectedClient });
  assert.equal(clientConstructed, false);
});

test('repository map output replaces manual responsibility and coverage inventories', () => {
  const output = renderRepositoryMap(
    [
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
    {
      components: [
        {
          component_id: 'COMP-EXAMPLE',
          repo_path: 'packages/@dvt/example',
          status: 'implemented',
        },
      ],
      documents: [],
    },
    '2026-08-06'
  );

  assert.match(output, /architecture\.component_query/u);
  assert.match(output, /documentation_panel_query/u);
  assert.match(output, /missing-doc-entry/u);
  assert.match(
    output,
    /This page is auto-generated by `pnpm docs:status:generate`\. Do not edit manually\./u
  );
  assert.doesNotMatch(output, /## Coverage Classes/u);
  assert.doesNotMatch(output, /\| Responsibility \|/u);
});
