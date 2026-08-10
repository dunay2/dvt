const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
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

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function lifecycleRow(root, documentPath, fields = {}) {
  return {
    document_path: documentPath,
    lifecycle_state: 'active',
    canonicality: 'canonical',
    lifecycle_gap_kind: 'none',
    duplicate_count: 0,
    is_duplicate: false,
    source_content_sha256: sha256(fs.readFileSync(path.join(root, documentPath))),
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

  await assert.rejects(
    new DocumentationPublicationAssembler(
      fixtureAssemblerOptions(root, {
        lifecycleRows: [
          lifecycleRow(root, 'docs/index.md'),
          lifecycleRow(root, 'docs/concepts/repository-map.md'),
        ],
        readGitSha: () => 'fixture-head',
      })
    ).assemble({ runGenerators: false }),
    /Duplicate publication route concepts\/repository-map\.md.*docs\/concepts\/repository-map\.md.*\.generated-docs\/concepts\/repository-map\.md/su
  );
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
  assert.match(workflow, /run: pnpm docs:publish[\s\S]*run: pnpm docs:build/u);
  assert.match(
    workflow,
    /uses: \.\/\.github\/actions\/prepare-planning-db[\s\S]*run: pnpm docs:publish/u
  );
  assert.doesNotMatch(closeoutSource, /docs:status:generate.*--repository-map-only/u);
  assert.ok(workflowScope.docs_changed.includes('scripts/documentation-*.cjs'));
  assert.ok(workflowScope.generated_status_relevant.includes('scripts/documentation-*.cjs'));
  assert.match(
    prWorkflow,
    /- name: Validate DB-first documentation publication and links[\s\S]*?run: pnpm docs:publish && pnpm docs:build && pnpm docs:gov:links\n\s+env:\n\s+GIT_BASE: \$\{\{ github\.event\.pull_request\.base\.sha \}\}\n\s+GIT_HEAD: \$\{\{ github\.sha \}\}/u
  );
});

test('published wide tables expose a labelled keyboard-scroll region', () => {
  const repositoryRoot = path.resolve(__dirname, '..');
  const config = fs.readFileSync(path.join(repositoryRoot, 'zensical.yml'), 'utf8');
  const scriptPath = path.join(
    repositoryRoot,
    'docs',
    'javascripts',
    'table-scroll-accessibility.js'
  );
  const stylePath = path.join(repositoryRoot, 'docs', 'stylesheets', 'docs-accessibility.css');
  assert.match(config, /javascripts\/table-scroll-accessibility\.js/u);
  assert.match(config, /stylesheets\/docs-accessibility\.css/u);

  const script = fs.readFileSync(scriptPath, 'utf8');
  assert.match(script, /\.md-typeset__scrollwrap/u);
  assert.match(script, /setAttribute\('role', 'region'\)/u);
  assert.match(script, /setAttribute\('aria-label'/u);
  assert.match(script, /tabIndex = 0/u);
  assert.match(script, /ResizeObserver/u);

  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(style, /\.md-typeset__scrollwrap:focus-visible/u);
  assert.match(style, /outline/u);
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
