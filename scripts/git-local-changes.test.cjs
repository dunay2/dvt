/** Owned concern: prove the canonical local changed-file query rail. */
const test = require('node:test');
const assert = require('node:assert/strict');

const { listLocalChangedFiles } = require('./git-local-changes.cjs');

test('listLocalChangedFiles includes unstaged and untracked files when branch diff is empty', () => {
  const calls = [];
  const runGitLines = (args) => {
    calls.push(args.join(' '));

    if (args[0] === 'rev-parse' && args.includes('@{u}')) {
      throw new Error('no upstream');
    }

    if (args[0] === 'rev-parse' && args.includes('origin/main')) {
      return ['origin/main'];
    }

    if (args.join(' ') === 'diff --name-only --diff-filter=ACMR origin/main...HEAD') {
      return [];
    }

    if (args.join(' ') === 'diff --name-only --diff-filter=ACMR origin/main') {
      return ['apps/web/src/app/views/Canvas.tsx'];
    }

    if (args.join(' ') === 'diff --cached --name-only --diff-filter=ACMR') {
      return ['apps/web/src/app/routes.ts'];
    }

    if (args.join(' ') === 'diff --name-only --diff-filter=ACMR') {
      return ['apps/web/src/app/views/Canvas.tsx'];
    }

    if (args.join(' ') === 'ls-files --others --exclude-standard') {
      return ['apps/web/src/app/views/canvas/canvasWorkbenchTabs.ts'];
    }

    return [];
  };

  assert.deepEqual(
    listLocalChangedFiles({
      baseRef: 'origin/main',
      runGitLines,
    }),
    [
      'apps/web/src/app/routes.ts',
      'apps/web/src/app/views/Canvas.tsx',
      'apps/web/src/app/views/canvas/canvasWorkbenchTabs.ts',
    ]
  );
  assert.ok(calls.includes('ls-files --others --exclude-standard'));
  assert.equal(
    calls.some((call) => call.includes('HEAD~1')),
    false
  );
});

test('listLocalChangedFiles respects pathspecs for local and untracked changes', () => {
  const runGitLines = (args) => {
    const command = args.join(' ');
    if (args[0] === 'rev-parse' && args.includes('origin/main')) {
      return ['origin/main'];
    }
    if (command.endsWith('-- docs/**/*.md')) {
      return ['docs/guides/testing-and-ci-capabilities.md'];
    }
    return [];
  };

  assert.deepEqual(
    listLocalChangedFiles({
      baseRef: 'origin/main',
      pathspecs: ['docs/**/*.md'],
      runGitLines,
    }),
    ['docs/guides/testing-and-ci-capabilities.md']
  );
});

test('local changed-files gate has semantic component docs and shared rail consumers', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const repoRoot = path.resolve(__dirname, '..');
  const componentGuidePath = path.join(
    repoRoot,
    'docs/architecture/components/ci-governance/local-changed-files-gate-component.md'
  );

  assert.ok(fs.existsSync(componentGuidePath), `${componentGuidePath} must exist`);

  const componentGuide = fs.readFileSync(componentGuidePath, 'utf8');
  for (const requiredSection of [
    '## Public API',
    '## Command And Query Rails',
    '## Invariants',
    '## Transitions',
    '## Consumers',
    '## User Stories',
    '```mermaid',
    'ListLocalChangedFiles',
    'LocalChangedFileSet',
    'ChangedFileValidationGate',
    'PrepushTypecheckScope',
  ]) {
    assert.match(
      componentGuide,
      new RegExp(requiredSection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );
  }

  const plan = fs.readFileSync(
    path.join(
      repoRoot,
      'docs/planning/proposals/mandatory/governance-and-docs/local-changed-files-gate-hardening-plan-20260503.md'
    ),
    'utf8'
  );
  assert.match(
    plan,
    /docs\/architecture\/components\/ci-governance\/local-changed-files-gate-component\.md/
  );

  const helperSource = fs.readFileSync(
    path.join(repoRoot, 'scripts/git-local-changes.cjs'),
    'utf8'
  );
  assert.match(helperSource, /^\/\*\* Owned concern: /);

  for (const consumerPath of [
    'scripts/check-changed.cjs',
    'scripts/type-check-prepush.cjs',
    'scripts/lint-markdown-changed.cjs',
    'scripts/format-markdown-changed.cjs',
    'scripts/docs-workboard-check-changed.cjs',
    'scripts/fix-changed.cjs',
    'scripts/qa-artifact-check.cjs',
    'scripts/validate-arc-evidence-frontmatter.cjs',
    'scripts/check-markdown-locations.cjs',
    'tools/docs/check-filenames.ts',
    'tools/docs/check-frontmatter.ts',
  ]) {
    const source = fs.readFileSync(path.join(repoRoot, consumerPath), 'utf8');
    assert.match(
      source,
      /listLocalChangedFiles/,
      `${consumerPath} must consume the shared ListLocalChangedFiles query rail`
    );
  }
});
