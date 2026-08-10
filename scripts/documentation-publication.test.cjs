const assert = require('node:assert/strict');
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
  fs.mkdirSync(path.join(root, '.generated-docs', 'concepts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'index.md'), '# Home\n', 'utf8');
  fs.writeFileSync(path.join(root, 'docs', 'concepts', 'index.md'), '# Concepts\n', 'utf8');
  fs.writeFileSync(path.join(root, 'docs', 'concepts', 'detail.md'), '# Detail\n', 'utf8');
  fs.writeFileSync(path.join(root, 'docs', 'archive', 'old.md'), '# Old\n', 'utf8');
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

  const assembler = new DocumentationPublicationAssembler({
    repoRoot: root,
    lifecycleRows: [
      { document_path: 'docs/index.md', lifecycle_state: 'active' },
      { document_path: 'docs/concepts/index.md', lifecycle_state: 'active' },
      { document_path: 'docs/archive/old.md', lifecycle_state: 'archived' },
    ],
  });
  const first = await assembler.assemble({ runGenerators: false });
  fs.writeFileSync(path.join(root, '.generated-docs', 'publication', 'stale.md'), 'stale', 'utf8');
  const second = await assembler.assemble({ runGenerators: false });

  assert.equal(first.treeDigest, second.treeDigest);
  assert.equal(first.routeCount, 5);
  assert.equal(first.navigableRouteCount, 3);
  assert.equal(
    fs.readFileSync(
      path.join(root, '.generated-docs', 'publication', 'concepts', 'repository-map.md'),
      'utf8'
    ),
    '# Repository Map\n'
  );
  assert.equal(fs.existsSync(path.join(root, '.generated-docs', 'publication', 'stale.md')), false);
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
    new DocumentationPublicationAssembler({ repoRoot: root }).assemble({ runGenerators: false }),
    /Duplicate publication route concepts\/repository-map\.md.*docs\/concepts\/repository-map\.md.*\.generated-docs\/concepts\/repository-map\.md/su
  );
});

test('rejects missing generated sources and paths outside the generated root', () => {
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

  assert.rejects(
    new DocumentationPublicationAssembler({ repoRoot: root }).assemble({ runGenerators: false }),
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

  assert.match(pkg.scripts['docs:publish'], /documentation-publication\.cjs --assemble/u);
  assert.match(pkg.scripts['docs:serve'], /documentation-publication\.cjs --check/u);
  assert.match(pkg.scripts['docs:build'], /documentation-publication\.cjs --check/u);
  assert.doesNotMatch(pkg.scripts['docs:serve'], /docs:sync|docs:publish/u);
  assert.doesNotMatch(pkg.scripts['docs:build'], /docs:sync|docs:publish/u);
  assert.match(workflow, /run: pnpm docs:publish[\s\S]*run: pnpm docs:build/u);
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
