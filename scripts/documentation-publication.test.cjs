const assert = require('node:assert/strict');
const { sha256Hex } = require('@dvt/crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');

const {
  DocumentationPublicationAssembler,
  DocumentationPublicationPolicy,
} = require('./documentation-publication.cjs');

const temporaryRoots = [];
const implicitProjectionCommand =
  /pnpm docs:(?:sync:check|status:check|capability:check|governance:(?:document-unit-map|file-component-index|file-fingerprint-(?:baseline|impact)|coverage-report|remediation-queue):check)\b/u;

function assertPrWorkflowDoesNotPublishDocumentation(workflow) {
  assert.doesNotMatch(workflow, /Setup Python for DB-first documentation publication/u);
  assert.doesNotMatch(workflow, /Install Zensical for DB-first documentation publication/u);
  assert.doesNotMatch(workflow, /Validate DB-first documentation publication and links/u);
  assert.doesNotMatch(workflow, /pnpm docs:publish/u);
}

function assertOrdinaryWorkflowsDoNotPublishDocumentation() {
  const workflowRoot = path.join(path.resolve(__dirname, '..'), '.github', 'workflows');
  const ordinaryWorkflowPaths = fs
    .readdirSync(workflowRoot)
    .filter((fileName) => /\.ya?ml$/u.test(fileName) && fileName !== 'docs-deploy.yml')
    .map((fileName) => path.join(workflowRoot, fileName));

  for (const workflowPath of ordinaryWorkflowPaths) {
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    assert.doesNotMatch(workflow, /pnpm docs:(?:publish|build)\b/u, workflowPath);
    assert.doesNotMatch(workflow, implicitProjectionCommand, workflowPath);
    assert.doesNotMatch(workflow, /DVT_REPOSITORY_MAP_INTEGRATION=1/u, workflowPath);
    assert.doesNotMatch(workflow, /\.generated-docs(?:\/|\\)/u, workflowPath);
    assert.doesNotMatch(workflow, /zensical(?:\.lock|\s+(?:build|serve))?/iu, workflowPath);
  }
}

function lifecycleRow(root, documentPath, fields = {}) {
  return {
    document_path: documentPath,
    lifecycle_state: 'active',
    canonicality: 'canonical',
    subject_key: documentPath,
    lifecycle_gap_kind: 'none',
    duplicate_count: 0,
    is_duplicate: false,
    source_content_sha256: sha256Hex(fs.readFileSync(path.join(root, documentPath))),
    ...fields,
  };
}

function createMinimalFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-doc-publication-'));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'index.md'), '# Home\n', 'utf8');
  fs.writeFileSync(
    path.join(root, 'docs', 'generated-docs-policy.json'),
    JSON.stringify({ version: 1, artifactClasses: [] }),
    'utf8'
  );
  fs.writeFileSync(path.join(root, 'zensical.yml'), 'site_name: Test\ndocs_dir: docs\n', 'utf8');
  return root;
}

function fixtureAssemblerOptions(root, options = {}) {
  const trackedDocumentationPaths = DocumentationPublicationPolicy.walkFiles(
    path.join(root, 'docs')
  ).map((absolutePath) => path.relative(root, absolutePath).split(path.sep).join('/'));
  const gitBlobs = new Map(
    trackedDocumentationPaths.map((sourcePath) => [
      sourcePath,
      fs.readFileSync(path.join(root, sourcePath)),
    ])
  );
  return {
    repoRoot: root,
    trackedDocumentationPaths,
    readGitBlob: (sourcePath) => gitBlobs.get(sourcePath),
    ...options,
  };
}

function runGit(root, args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('assembles a deterministic tree and keeps historical pages out of default navigation', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-doc-publication-'));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, 'docs', 'concepts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'archive'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'planning', 'proposals', 'superseded'), {
    recursive: true,
  });
  fs.mkdirSync(path.join(root, '.generated-docs', 'concepts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'index.md'), '# Home\n', 'utf8');
  fs.writeFileSync(path.join(root, 'docs', 'concepts', 'index.md'), '# Concepts\n', 'utf8');
  fs.writeFileSync(path.join(root, 'docs', 'concepts', 'detail.md'), '# Detail\n', 'utf8');
  fs.writeFileSync(path.join(root, 'docs', 'archive', 'old.md'), '# Old\n', 'utf8');
  fs.writeFileSync(
    path.join(root, 'docs', 'planning', 'proposals', 'superseded', 'old-plan.md'),
    '# Old plan\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '.generated-docs', 'concepts', 'repository-map.md'),
    '# Repository Map\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'docs', 'generated-docs-policy.json'),
    JSON.stringify({
      version: 1,
      artifactClasses: [
        {
          id: 'repository-map',
          artifacts: ['.generated-docs/concepts/repository-map.md'],
          generatorCommand: 'pnpm docs:status:generate --repository-map-only',
          tracking: 'untracked',
          manualEditPolicy: 'generator-owned',
          publication: { enabled: true },
        },
      ],
    }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'zensical.yml'),
    'site_name: Test\ndocs_dir: docs\nnav: []\n',
    'utf8'
  );

  const assembler = new DocumentationPublicationAssembler(
    fixtureAssemblerOptions(root, {
      lifecycleRows: [
        lifecycleRow(root, 'docs/index.md'),
        lifecycleRow(root, 'docs/concepts/index.md'),
        lifecycleRow(root, 'docs/concepts/detail.md'),
        lifecycleRow(root, 'docs/archive/old.md', {
          lifecycle_state: 'archived',
          canonicality: 'archive',
        }),
        lifecycleRow(root, 'docs/planning/proposals/superseded/old-plan.md', {
          lifecycle_state: 'superseded',
          canonicality: 'proposal',
        }),
      ],
      readGitSha: () => 'fixture-head',
    })
  );
  const first = await assembler.assemble({ runGenerators: false });
  const firstConfig = fs.readFileSync(path.join(root, '.generated-docs', 'zensical.yml'));
  const firstManifest = fs.readFileSync(
    path.join(root, '.generated-docs', 'documentation-publication-manifest.json')
  );
  fs.writeFileSync(path.join(root, '.generated-docs', 'publication', 'stale.md'), 'stale', 'utf8');
  const second = await assembler.assemble({ runGenerators: false });

  assert.equal(first.treeDigest, second.treeDigest);
  assert.equal(first.routeCount, 4);
  assert.equal(first.navigableRouteCount, 3);
  assert.deepEqual(
    fs.readFileSync(path.join(root, '.generated-docs', 'zensical.yml')),
    firstConfig
  );
  assert.deepEqual(
    fs.readFileSync(path.join(root, '.generated-docs', 'documentation-publication-manifest.json')),
    firstManifest
  );
  assert.equal(
    fs.readFileSync(
      path.join(root, '.generated-docs', 'publication', 'concepts', 'repository-map.md'),
      'utf8'
    ),
    '# Repository Map\n'
  );
  assert.equal(fs.existsSync(path.join(root, '.generated-docs', 'publication', 'stale.md')), false);
  assert.equal(
    fs.existsSync(path.join(root, '.generated-docs', 'publication', 'archive', 'old.md')),
    false
  );
  assert.equal(
    fs.existsSync(
      path.join(
        root,
        '.generated-docs',
        'publication',
        'planning',
        'proposals',
        'superseded',
        'old-plan.md'
      )
    ),
    false
  );
  const generatedConfig = fs.readFileSync(
    path.join(root, '.generated-docs', 'zensical.yml'),
    'utf8'
  );
  assert.match(generatedConfig, /docs_dir: publication/u);
  assert.match(generatedConfig, /concepts\/repository-map\.md/u);
  assert.doesNotMatch(generatedConfig, /concepts\/detail\.md/u);
  assert.doesNotMatch(generatedConfig, /archive\/old\.md/u);
  assert.equal(
    fs.existsSync(path.join(root, '.generated-docs', 'publication', 'concepts', 'detail.md')),
    true
  );
  await assembler.check();
});

test('fails closed on missing or ambiguous DB lifecycle authority', async () => {
  const missingRoot = createMinimalFixture();
  await assert.rejects(
    new DocumentationPublicationAssembler(
      fixtureAssemblerOptions(missingRoot, {
        lifecycleRows: [],
        readGitSha: () => 'fixture-head',
      })
    ).assemble({ runGenerators: false }),
    /Missing Planning DB lifecycle authority for docs\/index\.md/u
  );

  const ambiguousRoot = createMinimalFixture();
  await assert.rejects(
    new DocumentationPublicationAssembler(
      fixtureAssemblerOptions(ambiguousRoot, {
        lifecycleRows: [
          lifecycleRow(ambiguousRoot, 'docs/index.md', {
            lifecycle_gap_kind: 'canonical_duplicate',
            duplicate_count: 1,
            is_duplicate: true,
            canonical_counterpart_count: 2,
          }),
        ],
        readGitSha: () => 'fixture-head',
      })
    ).assemble({ runGenerators: false }),
    /Ambiguous Planning DB lifecycle authority for docs\/index\.md.*canonical_duplicate/u
  );
});

test('reports every owner and source hash for a duplicate publishable canonical subject', async () => {
  const root = createMinimalFixture();
  fs.writeFileSync(path.join(root, 'docs', 'second.md'), '# Second\n', 'utf8');
  const firstPath = 'docs/index.md';
  const secondPath = 'docs/second.md';
  const firstHash = sha256Hex(fs.readFileSync(path.join(root, firstPath)));
  const secondHash = sha256Hex(fs.readFileSync(path.join(root, secondPath)));

  await assert.rejects(
    new DocumentationPublicationAssembler(
      fixtureAssemblerOptions(root, {
        lifecycleRows: [
          lifecycleRow(root, firstPath, {
            subject_key: 'shared-current-subject',
            duplicate_count: 1,
            is_duplicate: true,
            canonical_counterpart_count: 2,
          }),
          lifecycleRow(root, secondPath, {
            subject_key: 'shared-current-subject',
            duplicate_count: 1,
            is_duplicate: true,
            canonical_counterpart_count: 2,
          }),
        ],
        readGitSha: () => 'fixture-head',
      })
    ).assemble({ runGenerators: false }),
    (error) => {
      assert.match(
        error.message,
        /duplicate publishable canonical subject shared-current-subject/iu
      );
      assert.match(error.message, new RegExp(firstPath, 'u'));
      assert.match(error.message, new RegExp(secondPath, 'u'));
      assert.match(error.message, new RegExp(firstHash, 'u'));
      assert.match(error.message, new RegExp(secondHash, 'u'));
      return true;
    }
  );
});

test('accepts related proposal and supporting documents without treating them as canonical duplicates', async () => {
  const root = createMinimalFixture();
  fs.writeFileSync(path.join(root, 'docs', 'support.md'), '# Support\n', 'utf8');
  const assembler = new DocumentationPublicationAssembler(
    fixtureAssemblerOptions(root, {
      lifecycleRows: [
        lifecycleRow(root, 'docs/index.md', {
          canonicality: 'proposal',
          subject_key: 'shared-related-subject',
          duplicate_count: 1,
          is_duplicate: true,
          canonical_counterpart_count: 1,
        }),
        lifecycleRow(root, 'docs/support.md', {
          canonicality: 'supporting',
          subject_key: 'shared-related-subject',
          duplicate_count: 1,
          is_duplicate: true,
          canonical_counterpart_count: 1,
        }),
      ],
      readGitSha: () => 'fixture-head',
    })
  );

  const receipt = await assembler.assemble({ runGenerators: false });

  assert.equal(receipt.routeCount, 2);
});

test('excludes a DB-replaced canonical source without rewriting its tracked bytes', async () => {
  const root = createMinimalFixture();
  const sourcePath = 'docs/index.md';
  const originalBytes = fs.readFileSync(path.join(root, sourcePath));
  const assembler = new DocumentationPublicationAssembler(
    fixtureAssemblerOptions(root, {
      lifecycleRows: [
        lifecycleRow(root, sourcePath, {
          lifecycle_state: 'superseded',
          canonical_disposition: 'db_authority_historical',
        }),
      ],
      readGitSha: () => 'fixture-head',
    })
  );

  const receipt = await assembler.assemble({ runGenerators: false });

  assert.equal(receipt.routeCount, 0);
  assert.deepEqual(fs.readFileSync(path.join(root, sourcePath)), originalBytes);
});

test('rewrites active links to DB-retired documents as commit-pinned Git evidence', async () => {
  const root = createMinimalFixture();
  const activePath = 'docs/current.md';
  const retiredPath = 'docs/retired.md';
  const activeContent = '# Current\n\n[Historical decision](./retired.md#decision)\n';
  fs.writeFileSync(path.join(root, activePath), activeContent, 'utf8');
  fs.writeFileSync(path.join(root, retiredPath), '# Retired\n\n## Decision\n', 'utf8');
  const assembler = new DocumentationPublicationAssembler(
    fixtureAssemblerOptions(root, {
      lifecycleRows: [
        lifecycleRow(root, 'docs/index.md'),
        lifecycleRow(root, activePath),
        lifecycleRow(root, retiredPath, {
          lifecycle_state: 'superseded',
          canonical_disposition: 'db_authority_historical',
        }),
      ],
      readGitSha: () => 'a'.repeat(40),
      repositoryWebUrl: 'https://github.com/dunay2/dvt',
    })
  );

  await assembler.assemble({ runGenerators: false });

  assert.equal(fs.readFileSync(path.join(root, activePath), 'utf8'), activeContent);
  assert.equal(
    fs.readFileSync(path.join(root, '.generated-docs', 'publication', 'current.md'), 'utf8'),
    `# Current\n\n[Historical decision](https://github.com/dunay2/dvt/blob/${'a'.repeat(40)}/docs/retired.md#decision)\n`
  );
});

test('ignores untracked Markdown instead of treating filesystem placement as authority', async () => {
  const root = createMinimalFixture();
  fs.writeFileSync(path.join(root, 'docs', 'ignored-index.md'), '# Ignored\n', 'utf8');
  const fixtureOptions = fixtureAssemblerOptions(root);
  const trackedDocumentationPaths = fixtureOptions.trackedDocumentationPaths.filter(
    (sourcePath) => sourcePath !== 'docs/ignored-index.md'
  );
  const assembler = new DocumentationPublicationAssembler({
    ...fixtureOptions,
    trackedDocumentationPaths,
    lifecycleRows: [lifecycleRow(root, 'docs/index.md')],
    readGitSha: () => 'fixture-head',
  });

  const receipt = await assembler.assemble({ runGenerators: false });

  assert.equal(receipt.routeCount, 1);
  assert.equal(
    fs.existsSync(path.join(root, '.generated-docs', 'publication', 'ignored-index.md')),
    false
  );
});

test('fails closed when a Git-owned Markdown source is missing from the worktree', async () => {
  const root = createMinimalFixture();
  const missingPath = 'docs/missing.md';
  fs.writeFileSync(path.join(root, missingPath), '# Missing\n', 'utf8');
  const rows = [lifecycleRow(root, 'docs/index.md'), lifecycleRow(root, missingPath)];
  const trackedDocumentationPaths = fixtureAssemblerOptions(root).trackedDocumentationPaths;
  const gitBlobs = new Map(
    trackedDocumentationPaths.map((sourcePath) => [
      sourcePath,
      fs.readFileSync(path.join(root, sourcePath)),
    ])
  );
  fs.rmSync(path.join(root, missingPath));

  await assert.rejects(
    new DocumentationPublicationAssembler({
      repoRoot: root,
      trackedDocumentationPaths,
      lifecycleRows: rows,
      readGitBlob: (sourcePath) => gitBlobs.get(sourcePath),
      readGitSha: () => 'fixture-head',
    }).assemble({ runGenerators: false }),
    /Missing Git-owned documentation source docs\/missing\.md/u
  );
});

test('fails closed when a Git-owned supporting source is missing from the worktree', async () => {
  const root = createMinimalFixture();
  const missingPath = 'docs/assets/missing.svg';
  fs.mkdirSync(path.dirname(path.join(root, missingPath)), { recursive: true });
  fs.writeFileSync(path.join(root, missingPath), '<svg/>\n', 'utf8');
  const trackedDocumentationPaths = fixtureAssemblerOptions(root).trackedDocumentationPaths;
  fs.rmSync(path.join(root, missingPath));

  await assert.rejects(
    new DocumentationPublicationAssembler({
      repoRoot: root,
      trackedDocumentationPaths,
      lifecycleRows: [lifecycleRow(root, 'docs/index.md')],
      readGitSha: () => 'fixture-head',
    }).assemble({ runGenerators: false }),
    /Missing Git-owned documentation source docs\/assets\/missing\.svg/u
  );
});

test('rejects a Git-owned supporting source whose worktree content differs from HEAD', async () => {
  const root = createMinimalFixture();
  const supportPath = 'docs/assets/logo.svg';
  fs.mkdirSync(path.dirname(path.join(root, supportPath)), { recursive: true });
  fs.writeFileSync(path.join(root, supportPath), '<svg>HEAD</svg>\n', 'utf8');
  const trackedDocumentationPaths = fixtureAssemblerOptions(root).trackedDocumentationPaths;
  const gitBlobs = new Map(
    trackedDocumentationPaths.map((sourcePath) => [
      sourcePath,
      fs.readFileSync(path.join(root, sourcePath)),
    ])
  );
  fs.writeFileSync(path.join(root, supportPath), '<svg>dirty</svg>\n', 'utf8');

  await assert.rejects(
    new DocumentationPublicationAssembler({
      repoRoot: root,
      trackedDocumentationPaths,
      lifecycleRows: [lifecycleRow(root, 'docs/index.md')],
      readGitBlob: (sourcePath) => gitBlobs.get(sourcePath),
      readGitSha: () => 'fixture-head',
    }).assemble({ runGenerators: false }),
    /Git-owned documentation source docs\/assets\/logo\.svg differs from HEAD/u
  );
});

test('accepts CRLF worktree content when Git normalizes it to the LF blob in HEAD', async () => {
  const root = createMinimalFixture();
  fs.writeFileSync(path.join(root, '.gitattributes'), '*.md text eol=crlf\n', 'utf8');
  runGit(root, ['init']);
  runGit(root, ['config', 'core.autocrlf', 'true']);
  runGit(root, ['add', '.gitattributes', 'docs', 'zensical.yml']);
  runGit(root, [
    '-c',
    'user.name=DVT Test',
    '-c',
    'user.email=dvt-test@example.invalid',
    'commit',
    '-m',
    'fixture',
  ]);
  fs.writeFileSync(path.join(root, 'docs', 'index.md'), '# Home\r\n', 'utf8');
  runGit(root, ['diff', '--quiet', 'HEAD', '--', 'docs/index.md']);

  const receipt = await new DocumentationPublicationAssembler({
    repoRoot: root,
    lifecycleRows: [lifecycleRow(root, 'docs/index.md')],
  }).assemble({ runGenerators: false });

  assert.equal(receipt.routeCount, 1);
});

test('fails closed when a Git-owned source is deleted from the index', async () => {
  const root = createMinimalFixture();
  const deletedPath = 'docs/deleted.md';
  fs.writeFileSync(path.join(root, deletedPath), '# Deleted\n', 'utf8');
  runGit(root, ['init']);
  runGit(root, ['add', 'docs', 'zensical.yml']);
  runGit(root, [
    '-c',
    'user.name=DVT Test',
    '-c',
    'user.email=dvt-test@example.invalid',
    'commit',
    '-m',
    'fixture',
  ]);
  runGit(root, ['rm', deletedPath]);

  await assert.rejects(
    new DocumentationPublicationAssembler({
      repoRoot: root,
      lifecycleRows: [lifecycleRow(root, 'docs/index.md')],
    }).assemble({ runGenerators: false }),
    /Missing Git-owned documentation source docs\/deleted\.md/u
  );
});

test('fails closed when a documentation source is staged but absent from HEAD', async () => {
  const root = createMinimalFixture();
  const addedPath = 'docs/added.md';
  runGit(root, ['init']);
  runGit(root, ['add', 'docs', 'zensical.yml']);
  runGit(root, [
    '-c',
    'user.name=DVT Test',
    '-c',
    'user.email=dvt-test@example.invalid',
    'commit',
    '-m',
    'fixture',
  ]);
  fs.writeFileSync(path.join(root, addedPath), '# Added\n', 'utf8');
  runGit(root, ['add', addedPath]);

  await assert.rejects(
    new DocumentationPublicationAssembler({
      repoRoot: root,
      lifecycleRows: [lifecycleRow(root, 'docs/index.md')],
    }).assemble({ runGenerators: false }),
    /Git-owned documentation source docs\/added\.md differs from HEAD/u
  );
});

test('publication receipt rejects stale source, DB, config, policy, and Git inputs', async () => {
  const root = createMinimalFixture();
  const rows = [lifecycleRow(root, 'docs/index.md')];
  let gitSha = 'fixture-head-a';
  const createAssembler = () =>
    new DocumentationPublicationAssembler(
      fixtureAssemblerOptions(root, {
        lifecycleRows: rows,
        readGitSha: () => gitSha,
      })
    );

  await createAssembler().assemble({ runGenerators: false });
  fs.writeFileSync(path.join(root, 'docs', 'index.md'), '# Changed\n', 'utf8');
  await assert.rejects(createAssembler().check(), /source input.*pnpm docs:publish/iu);

  fs.writeFileSync(path.join(root, 'docs', 'index.md'), '# Home\n', 'utf8');
  await createAssembler().assemble({ runGenerators: false });
  rows[0].lifecycle_state = 'superseded';
  await assert.rejects(createAssembler().check(), /lifecycle input.*pnpm docs:publish/iu);

  rows[0].lifecycle_state = 'active';
  await createAssembler().assemble({ runGenerators: false });
  fs.appendFileSync(path.join(root, 'zensical.yml'), 'theme: material\n', 'utf8');
  await assert.rejects(createAssembler().check(), /configuration input.*pnpm docs:publish/iu);

  fs.writeFileSync(path.join(root, 'zensical.yml'), 'site_name: Test\ndocs_dir: docs\n', 'utf8');
  await createAssembler().assemble({ runGenerators: false });
  fs.writeFileSync(
    path.join(root, 'docs', 'generated-docs-policy.json'),
    JSON.stringify({ version: 2, artifactClasses: [] }),
    'utf8'
  );
  await assert.rejects(createAssembler().check(), /policy input.*pnpm docs:publish/iu);

  fs.writeFileSync(
    path.join(root, 'docs', 'generated-docs-policy.json'),
    JSON.stringify({ version: 1, artifactClasses: [] }),
    'utf8'
  );
  await createAssembler().assemble({ runGenerators: false });
  gitSha = 'fixture-head-b';
  await assert.rejects(createAssembler().check(), /Git input.*pnpm docs:publish/iu);
});

test('rejects duplicate source and generated routes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-doc-publication-'));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, 'docs', 'concepts'), { recursive: true });
  fs.mkdirSync(path.join(root, '.generated-docs', 'concepts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'index.md'), '# Home\n', 'utf8');
  fs.writeFileSync(path.join(root, 'docs', 'concepts', 'repository-map.md'), '# Manual\n', 'utf8');
  fs.writeFileSync(
    path.join(root, '.generated-docs', 'concepts', 'repository-map.md'),
    '# Generated\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'docs', 'generated-docs-policy.json'),
    JSON.stringify({
      version: 1,
      artifactClasses: [
        {
          id: 'repository-map',
          artifacts: ['.generated-docs/concepts/repository-map.md'],
          generatorCommand: 'generate',
          tracking: 'untracked',
          manualEditPolicy: 'generator-owned',
          publication: { enabled: true },
        },
      ],
    }),
    'utf8'
  );
  fs.writeFileSync(path.join(root, 'zensical.yml'), 'site_name: Test\ndocs_dir: docs\n', 'utf8');

  const manualHash = sha256Hex(
    fs.readFileSync(path.join(root, 'docs', 'concepts', 'repository-map.md'))
  );
  const generatedHash = sha256Hex(
    fs.readFileSync(path.join(root, '.generated-docs', 'concepts', 'repository-map.md'))
  );

  await assert.rejects(
    new DocumentationPublicationAssembler(
      fixtureAssemblerOptions(root, {
        lifecycleRows: [
          lifecycleRow(root, 'docs/index.md'),
          lifecycleRow(root, 'docs/concepts/repository-map.md', {
            subject_key: 'repository-map',
          }),
        ],
        readGitSha: () => 'fixture-head',
      })
    ).assemble({ runGenerators: false }),
    (error) => {
      assert.match(error.message, /Duplicate publication route concepts\/repository-map\.md/u);
      assert.match(error.message, /docs\/concepts\/repository-map\.md/u);
      assert.match(error.message, /\.generated-docs\/concepts\/repository-map\.md/u);
      assert.match(error.message, /artifactClass=repository-map/u);
      assert.match(error.message, /subject=repository-map/u);
      assert.match(error.message, new RegExp(manualHash, 'u'));
      assert.match(error.message, new RegExp(generatedHash, 'u'));
      return true;
    }
  );
});

test('publishes the three DB-first status projections without tracked pointer classes', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const policy = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'docs', 'generated-docs-policy.json'), 'utf8')
  );
  const classes = new Map(
    policy.artifactClasses.map((artifactClass) => [artifactClass.id, artifactClass])
  );

  for (const retiredId of [
    'tracked-docs-status-code-state',
    'tracked-docs-status-knowledge-intake-literature',
    'tracked-docs-status-db-surface-inventory',
  ]) {
    assert.equal(classes.has(retiredId), false, retiredId);
  }

  const expectedArtifacts = new Map([
    ['local-docs-status-code-state', '.generated-docs/planning/status/generated-code-state.md'],
    [
      'local-docs-status-knowledge-intake-literature',
      '.generated-docs/planning/status/generated-knowledge-intake-literature.md',
    ],
    [
      'local-docs-status-db-surface-inventory',
      '.generated-docs/planning/status/db-surface-inventory.md',
    ],
  ]);

  for (const [classId, artifactPath] of expectedArtifacts) {
    const artifactClass = classes.get(classId);
    assert.equal(artifactClass.publication?.enabled, true, classId);
    assert.deepEqual(artifactClass.artifacts, [artifactPath], classId);
  }

  for (const pointerPath of [
    'docs/planning/status/generated-code-state.md',
    'docs/planning/status/generated-knowledge-intake-literature.md',
    'docs/planning/status/db-surface-inventory.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, pointerPath)), false, pointerPath);
  }
});

test('rejects missing generated sources and paths outside the generated root', async () => {
  assert.throws(
    () =>
      new DocumentationPublicationPolicy({
        repoRoot: 'C:/repo',
        policy: {
          version: 1,
          artifactClasses: [
            {
              id: 'escape',
              artifacts: ['.generated-docs/../outside.md'],
              tracking: 'untracked',
              manualEditPolicy: 'generator-owned',
              publication: { enabled: true },
            },
          ],
        },
      }).generatedSources(),
    /escapes .*\.generated-docs/u
  );

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-doc-publication-'));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'index.md'), '# Home\n', 'utf8');
  fs.writeFileSync(
    path.join(root, 'docs', 'generated-docs-policy.json'),
    JSON.stringify({
      version: 1,
      artifactClasses: [
        {
          id: 'missing',
          artifacts: ['.generated-docs/missing.md'],
          tracking: 'untracked',
          manualEditPolicy: 'generator-owned',
          publication: { enabled: true },
        },
      ],
    }),
    'utf8'
  );
  fs.writeFileSync(path.join(root, 'zensical.yml'), 'site_name: Test\ndocs_dir: docs\n', 'utf8');

  await assert.rejects(
    new DocumentationPublicationAssembler(
      fixtureAssemblerOptions(root, {
        lifecycleRows: [lifecycleRow(root, 'docs/index.md')],
        readGitSha: () => 'fixture-head',
      })
    ).assemble({ runGenerators: false }),
    /Missing generated publication source.*\.generated-docs\/missing\.md/u
  );
});

test('package and manual deploy expose one explicit publication command', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const workflow = fs.readFileSync(
    path.join(repoRoot, '.github', 'workflows', 'docs-deploy.yml'),
    'utf8'
  );
  const prWorkflow = fs.readFileSync(
    path.join(repoRoot, '.github', 'workflows', 'pr-quality-gate.yml'),
    'utf8'
  );
  const closeoutSource = fs.readFileSync(path.join(repoRoot, 'scripts', 'pr-closeout.cjs'), 'utf8');
  const workflowScope = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'tools', 'ci', 'policy', 'workflow-scope.json'), 'utf8')
  );

  assert.match(pkg.scripts['docs:publish'], /documentation-publication\.cjs --assemble/u);
  assert.match(pkg.scripts['docs:serve'], /documentation-publication\.cjs --check/u);
  assert.match(pkg.scripts['docs:build'], /documentation-publication\.cjs --check/u);
  assert.doesNotMatch(pkg.scripts['docs:serve'], /docs:sync|docs:publish/u);
  assert.doesNotMatch(pkg.scripts['docs:build'], /docs:sync|docs:publish/u);
  assert.doesNotMatch(pkg.scripts['ci:docs'], implicitProjectionCommand);
  assert.match(workflow, /run: pnpm docs:publish[\s\S]*run: pnpm docs:build/u);
  assert.match(
    workflow,
    /uses: \.\/\.github\/actions\/prepare-planning-db[\s\S]*run: pnpm docs:publish/u
  );
  assert.doesNotMatch(closeoutSource, /docs:status:generate.*--repository-map-only/u);
  assert.ok(workflowScope.docs_changed.includes('scripts/documentation-*.cjs'));
  assert.ok(workflowScope.generated_status_relevant.includes('scripts/documentation-*.cjs'));
  assertPrWorkflowDoesNotPublishDocumentation(prWorkflow);
  assertOrdinaryWorkflowsDoNotPublishDocumentation();
  assert.match(
    prWorkflow,
    /- name: Enforce changed docs links[\s\S]*?run: pnpm docs:gov:links:changed/u
  );
});

test('published docs expose keyboard table regions and a focus-correct skip link', () => {
  const repositoryRoot = path.resolve(__dirname, '..');
  const config = fs.readFileSync(path.join(repositoryRoot, 'zensical.yml'), 'utf8');
  const scriptPath = path.join(repositoryRoot, 'docs', 'javascripts', 'docs-accessibility.js');
  const stylePath = path.join(repositoryRoot, 'docs', 'stylesheets', 'docs-accessibility.css');
  assert.match(config, /javascripts\/docs-accessibility\.js/u);
  assert.match(config, /stylesheets\/docs-accessibility\.css/u);

  const script = fs.readFileSync(scriptPath, 'utf8');
  assert.match(script, /\.md-typeset__scrollwrap/u);
  assert.match(script, /setAttribute\('role', 'region'\)/u);
  assert.match(script, /setAttribute\('aria-label'/u);
  assert.match(script, /tabIndex = 0/u);
  assert.match(script, /ResizeObserver/u);
  assert.match(script, /\.md-skip\[href\^=['"]#['"]\]/u);
  assert.match(script, /target\.tabIndex = -1/u);
  assert.match(script, /target\.focus\(\{ preventScroll: true \}\)/u);

  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(style, /\.md-typeset__scrollwrap:focus-visible/u);
  assert.match(style, /outline/u);
  assert.match(style, /\.md-nav__link--active[\s\S]*?color:\s*#3f51b5/u);
});

test('active documentation links reject historical targets excluded from publication', () => {
  const repositoryRoot = path.resolve(__dirname, '..');
  const checkerPath = path.join(repositoryRoot, 'tools', 'docs', 'check-links.ts');
  const evalSource = [
    `import { isNonPublishedDocumentationTarget } from ${JSON.stringify(checkerPath)};`,
    `const root = ${JSON.stringify(repositoryRoot)};`,
    'console.log(JSON.stringify([',
    "  isNonPublishedDocumentationTarget(root + '/docs/archive/old.md'),",
    "  isNonPublishedDocumentationTarget(root + '/docs/planning/proposals/superseded/old.md'),",
    "  isNonPublishedDocumentationTarget(root + '/docs/planning/status/current.md'),",
    ']));',
  ].join('\n');
  const result = spawnSync(process.execPath, [require.resolve('tsx/cli'), '--eval', evalSource], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(result.stdout.trim(), '[true,true,false]');

  const checker = fs.readFileSync(checkerPath, 'utf8');
  assert.match(checker, /Non-published historical target/u);
  assert.match(checker, /DocumentationPublicationPolicy\.isHistoricalPath/u);
});

test('docs quality accepts canonical routes declared by publication policy', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'docs-quality-check.cjs')], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.doesNotMatch(result.stderr, /repository-map\.md.*required canonical surface is missing/su);
});
