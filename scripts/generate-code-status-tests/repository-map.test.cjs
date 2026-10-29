const { workspaceRow } = require('./helpers.cjs');
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  markdownCell,
  readRepositoryArchitectureFacts,
  renderRepositoryMap,
  resolveDocumentationProjection,
  resolveWorkspaceArchitecture,
} = require('../generate-code-status.cjs');

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
