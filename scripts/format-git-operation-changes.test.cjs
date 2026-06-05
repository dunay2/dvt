/** Owned concern: prove post-Git Prettier automation stays scoped and safe. */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatGitOperationChanges,
  isPrettierCandidate,
  isSkippedByEnvironment,
  listGitOperationChangedFiles,
  parseArgs,
  runPrettierOnFiles,
  selectExistingPrettierFiles,
} = require('./format-git-operation-changes.cjs');

test('post-Git formatter CLI requires an explicit ref range', () => {
  assert.deepEqual(parseArgs(['--from', 'ORIG_HEAD', '--to', 'HEAD', '--label', 'post-merge']), {
    dryRun: false,
    fromRef: 'ORIG_HEAD',
    hook: false,
    label: 'post-merge',
    toRef: 'HEAD',
  });
  assert.deepEqual(parseArgs(['--from', 'a', '--to', 'b', '--hook', '--dry-run']).hook, true);
  assert.throws(() => parseArgs(['--from', 'a']), /Missing required --to <ref>/);
  assert.throws(() => parseArgs(['--to', 'b']), /Missing required --from <ref>/);
  assert.throws(() => parseArgs(['--from', 'a', '--to', 'b', '--unknown']), /Unknown argument/);
});

test('post-Git formatter only targets Prettier-managed file types', () => {
  assert.equal(isPrettierCandidate('apps/web/src/App.tsx'), true);
  assert.equal(isPrettierCandidate('docs/guides/testing.md'), true);
  assert.equal(isPrettierCandidate('apps/web/src/index.css'), true);
  assert.equal(isPrettierCandidate('pnpm-lock.yaml'), false);
  assert.equal(isPrettierCandidate('apps/web/src/logo.svg'), false);
  assert.equal(isPrettierCandidate('dist/output.js.map'), false);
});

test('post-Git formatter resolves changed files from the explicit Git range', () => {
  const calls = [];
  const files = listGitOperationChangedFiles({
    fromRef: 'before',
    repoRootPath: '/repo',
    runGitLines: (args, options) => {
      calls.push({ args, options });
      return ['b.ts', 'a.md'];
    },
    toRef: 'after',
  });

  assert.deepEqual(files, ['a.md', 'b.ts']);
  assert.deepEqual(calls, [
    {
      args: ['diff', '--name-only', '--diff-filter=ACMR', 'before', 'after'],
      options: { repoRootPath: '/repo' },
    },
  ]);
});

test('post-Git formatter filters deleted and unsupported files before running Prettier', () => {
  const selected = selectExistingPrettierFiles(
    ['apps/web/src/App.tsx', 'apps/web/src/App.tsx', 'docs/a.md', 'image.svg', 'deleted.ts'],
    {
      fileExists: (filePath) => filePath !== 'deleted.ts',
      repoRootPath: '/repo',
    }
  );

  assert.deepEqual(selected, ['apps/web/src/App.tsx', 'docs/a.md']);
});

test('post-Git formatter supports explicit environment opt-out', () => {
  assert.equal(isSkippedByEnvironment({ DVT_SKIP_POST_GIT_FORMAT: '1' }), true);
  assert.equal(isSkippedByEnvironment({ DVT_SKIP_POST_GIT_FORMAT: 'true' }), true);
  assert.equal(isSkippedByEnvironment({ DVT_SKIP_POST_GIT_FORMAT: '0' }), false);

  const result = formatGitOperationChanges({
    env: { DVT_SKIP_POST_GIT_FORMAT: '1' },
    fromRef: 'before',
    runGitLines: () => {
      throw new Error('should not read Git when skipped');
    },
    toRef: 'after',
  });

  assert.deepEqual(result, { files: [], status: 0 });
});

test('post-Git formatter executes Prettier on the scoped file set', () => {
  const calls = [];
  const result = runPrettierOnFiles(['a.ts', 'b.md'], {
    prettierCli: '/repo/node_modules/prettier/bin/prettier.cjs',
    repoRootPath: '/repo',
    spawn: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0 };
    },
  });

  assert.equal(result.status, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, process.execPath);
  assert.deepEqual(calls[0].args, [
    '/repo/node_modules/prettier/bin/prettier.cjs',
    '--write',
    '--end-of-line',
    'auto',
    '--ignore-unknown',
    'a.ts',
    'b.md',
  ]);
  assert.equal(calls[0].options.cwd, '/repo');
});

test('post-Git formatter can dry-run the files that would be formatted', () => {
  const result = formatGitOperationChanges({
    dryRun: true,
    fileExists: () => true,
    fromRef: 'before',
    runGitLines: () => ['z.svg', 'b.ts', 'a.md'],
    toRef: 'after',
  });

  assert.deepEqual(result, { files: ['a.md', 'b.ts'], status: 0 });
});
