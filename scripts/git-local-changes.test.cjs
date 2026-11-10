/** Owned concern: prove the canonical local changed-file query rail. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createGitRepositoryEnvironment } = require('./lib/git-repository-environment.cjs');

const {
  listCommittedChangedFiles,
  listLocalChangedFiles,
  resolveIterationComparison,
} = require('./git-local-changes.cjs');

const baseSha = 'a'.repeat(40);
const headSha = 'b'.repeat(40);

test('strict iteration resolves only explicit commit refs and proves ancestry at the requested root', () => {
  const calls = [];
  const result = resolveIterationComparison({
    baseRef: 'HEAD~2',
    repoRootPath: '/actual/repository',
    runGitLines: (args, options) => {
      assert.equal(options.repoRootPath, '/actual/repository');
      calls.push(args);
      if (args[0] === 'merge-base') return [];
      return [args.at(-1) === 'HEAD^{commit}' ? headSha : baseSha];
    },
  });
  assert.deepEqual(result, { baseSha, headSha });
  assert.deepEqual(calls, [
    ['rev-parse', '--verify', '--end-of-options', 'HEAD~2^{commit}'],
    ['rev-parse', '--verify', '--end-of-options', 'HEAD^{commit}'],
    ['merge-base', '--is-ancestor', baseSha, headSha],
  ]);
});

test('strict iteration rejects missing refs, invalid commits and unknown or nonancestor comparisons', () => {
  for (const baseRef of [undefined, '', ' ', '--all', 'HEAD\nother']) {
    assert.throws(() => resolveIterationComparison({ baseRef }), /explicit.*commit ref/iu);
  }
  for (const failingCommand of ['base', 'head', 'ancestor', 'invalid-output']) {
    assert.throws(
      () =>
        resolveIterationComparison({
          baseRef: 'missing-or-shallow',
          runGitLines: (args) => {
            if (failingCommand === 'invalid-output') return ['not-a-commit'];
            if (
              (failingCommand === 'base' && args.at(-1) !== 'HEAD^{commit}') ||
              (failingCommand === 'head' && args.at(-1) === 'HEAD^{commit}') ||
              (failingCommand === 'ancestor' && args[0] === 'merge-base')
            ) {
              throw new Error('missing ref or unknown shallow ancestry');
            }
            return args[0] === 'merge-base'
              ? []
              : [args.at(-1) === 'HEAD^{commit}' ? headSha : baseSha];
          },
        }),
      /iteration comparison/iu,
      failingCommand
    );
  }
});

test('strict iteration never narrows its complete local frontier or swallows Git read failures', () => {
  for (const narrowed of [
    { includeUntracked: false },
    { pathspecs: ['apps/web/'] },
    { diffFilter: 'ACMR' },
    { baseRef: undefined },
    { headRef: undefined },
  ]) {
    assert.throws(
      () =>
        listLocalChangedFiles({ strict: true, baseRef: baseSha, headRef: headSha, ...narrowed }),
      /strict iteration/iu
    );
  }
  for (const failedRead of ['head', 'ancestor', 'branch', 'index', 'worktree', 'untracked']) {
    assert.throws(
      () =>
        listLocalChangedFiles({
          strict: true,
          baseRef: baseSha,
          headRef: headSha,
          runGitLines: (args) => {
            const phase =
              args[0] === 'rev-parse'
                ? 'head'
                : args[0] === 'merge-base'
                  ? 'ancestor'
                  : args[0] === 'ls-files'
                    ? 'untracked'
                    : args.includes('--cached')
                      ? 'index'
                      : args.includes(baseSha)
                        ? 'branch'
                        : 'worktree';
            if (phase === failedRead) throw new Error(`read failed: ${phase}`);
            return phase === 'head' ? [headSha] : [];
          },
        }),
      /strict iteration/iu,
      failedRead
    );
  }
  assert.throws(
    () =>
      listLocalChangedFiles({
        strict: true,
        baseRef: baseSha,
        headRef: headSha,
        runGitLines: () => ['c'.repeat(40)],
      }),
    /strict iteration.*HEAD/iu
  );
});

test('strict iteration unions branch, index, worktree, deleted and untracked paths once', () => {
  const calls = [];
  const changed = listLocalChangedFiles({
    strict: true,
    baseRef: baseSha,
    headRef: headSha,
    repoRootPath: '/actual/repository',
    runGitLines: (args, options) => {
      assert.equal(options.repoRootPath, '/actual/repository');
      calls.push(args);
      if (args[0] === 'rev-parse') return [headSha];
      if (args[0] === 'merge-base') return [];
      assert.ok(args.includes('-z'));
      if (args[0] === 'ls-files') return ['new.ts', 'duplicate.ts'];
      assert.ok(args.includes('--no-renames'));
      if (args.includes('--cached')) return ['staged.ts', 'duplicate.ts'];
      return args.includes(baseSha)
        ? ['committed.ts', 'deleted.ts']
        : ['unstaged.ts', 'duplicate.ts'];
    },
  });
  assert.deepEqual(changed, [
    'committed.ts',
    'deleted.ts',
    'duplicate.ts',
    'new.ts',
    'staged.ts',
    'unstaged.ts',
  ]);
  assert.equal(calls.length, 6);
  assert.ok(
    calls.every(
      (args) => !args.some((arg) => arg.includes('--diff-filter') || arg.includes('origin/main'))
    )
  );
});

test('strict iteration reads real repository paths and ignores foreign Git context and comparison env', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-iteration-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const env = createGitRepositoryEnvironment(process.env);
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  git('init');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'user.name', 'Fixture');
  fs.writeFileSync(path.join(root, 'deleted.ts'), 'initial');
  fs.writeFileSync(path.join(root, 'staged.ts'), 'initial');
  fs.writeFileSync(path.join(root, 'unstaged.ts'), 'initial');
  git('add', '.');
  git('commit', '-m', 'Fixture base');
  const base = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(root, 'committed.ts'), 'new');
  git('add', '.');
  git('commit', '-m', 'Fixture head');
  fs.unlinkSync(path.join(root, 'deleted.ts'));
  fs.writeFileSync(path.join(root, 'staged.ts'), 'staged');
  git('add', 'staged.ts');
  fs.writeFileSync(path.join(root, 'unstaged.ts'), 'unstaged');
  fs.writeFileSync(path.join(root, ' spaced 名.ts'), 'untracked');
  fs.writeFileSync(path.join(root, '.gitignore'), 'ignored.ts\n');
  fs.writeFileSync(path.join(root, 'ignored.ts'), 'ignored');
  t.mock.property(process, 'env', {
    ...process.env,
    GIT_BASE: 'missing-base',
    GIT_HEAD: 'missing-head',
    GIT_DIR: '/wrong/repository',
    GIT_INDEX_FILE: '/wrong/index',
  });
  const comparison = resolveIterationComparison({ baseRef: base, repoRootPath: root });
  assert.equal(comparison.headSha, git('rev-parse', 'HEAD'));
  assert.deepEqual(
    listLocalChangedFiles({
      strict: true,
      baseRef: comparison.baseSha,
      headRef: comparison.headSha,
      repoRootPath: root,
    }),
    [' spaced 名.ts', '.gitignore', 'committed.ts', 'deleted.ts', 'staged.ts', 'unstaged.ts']
  );
  assert.throws(
    () => resolveIterationComparison({ baseRef: 'HEAD:committed.ts', repoRootPath: root }),
    /iteration comparison/iu
  );
  assert.throws(
    () => resolveIterationComparison({ baseRef: 'missing-base', repoRootPath: root }),
    /iteration comparison/iu
  );
  const unrelated = git('commit-tree', git('rev-parse', 'HEAD^{tree}'), '-m', 'Unrelated fixture');
  assert.throws(
    () => resolveIterationComparison({ baseRef: unrelated, repoRootPath: root }),
    /iteration comparison/iu
  );
});

test('listCommittedChangedFiles uses the exact configured base and head refs', () => {
  const calls = [];
  const changedFiles = listCommittedChangedFiles({
    baseRef: 'base-sha',
    headRef: 'merge-sha',
    runGitLines: (args) => {
      calls.push(args.join(' '));
      return ['scripts/planning-db-query.cjs', 'docs/guides/testing-and-ci-capabilities.md'];
    },
  });

  assert.deepEqual(changedFiles, [
    'docs/guides/testing-and-ci-capabilities.md',
    'scripts/planning-db-query.cjs',
  ]);
  assert.deepEqual(calls, ['diff --name-only --diff-filter=ACMR base-sha...merge-sha']);
});

test('listCommittedChangedFiles fails closed when an exact diff cannot be read', () => {
  assert.throws(
    () =>
      listCommittedChangedFiles({
        baseRef: 'missing-base',
        headRef: 'merge-sha',
        runGitLines: () => {
          throw new Error('missing ref');
        },
      }),
    /Unable to read committed changed files between missing-base and merge-sha/
  );
});

test('listLocalChangedFiles excludes upstream-only base-vs-worktree changes', () => {
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
      return ['apps/api/src/upstream-only.ts'];
    }

    if (args.join(' ') === 'diff --cached --name-only --diff-filter=ACMR') {
      return ['apps/web/src/app/routes.ts'];
    }

    if (args.join(' ') === 'diff --name-only --diff-filter=ACMR') {
      return ['apps/web/src/app/views/Canvas.tsx'];
    }

    if (args.join(' ') === 'ls-files --others --exclude-standard') {
      return ['apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx'];
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
      'apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx',
    ]
  );
  assert.ok(calls.includes('ls-files --others --exclude-standard'));
  assert.equal(
    calls.includes('diff --name-only --diff-filter=ACMR origin/main'),
    false,
    'base-vs-worktree diff adds upstream-only files when the branch is behind'
  );
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

test('local changed-files gate implementation surfaces name their canonical rails', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const repoRoot = path.resolve(__dirname, '..');
  const railSources = [
    [
      ['Validate', 'Changed', 'Files'].join(''),
      ['scripts/check-changed.cjs', 'scripts/verify-changed.cjs'],
    ],
    [
      ['Select', 'Prepush', 'Typecheck', 'Scope'].join(''),
      ['scripts/type-check-prepush.cjs', 'tools/ci/prepush-typecheck-scope.mjs'],
    ],
    [['Run', 'Changed', 'Slice', 'Verification'].join(''), ['scripts/verify-changed.cjs']],
  ];

  const ownSource = fs.readFileSync(__filename, 'utf8');
  for (const [railName, sourcePaths] of railSources) {
    assert.doesNotMatch(
      ownSource,
      new RegExp(`\\b${railName}\\b`),
      'the guard test must not be indexed as a rail implementation surface'
    );

    for (const sourcePath of sourcePaths) {
      const source = fs.readFileSync(path.join(repoRoot, sourcePath), 'utf8');
      assert.match(
        source,
        new RegExp(`\\b${railName}\\b`),
        `${sourcePath} must expose the ${railName} rail for Planning DB indexing`
      );
    }
  }
});
