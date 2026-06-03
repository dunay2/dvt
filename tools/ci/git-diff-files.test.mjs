import assert from 'node:assert/strict';
import test from 'node:test';

import { listChangedFilesBetween } from './git-diff-files.mjs';

function noMergeBaseError() {
  const error = new Error('Command failed: git diff --name-only origin/main...HEAD');
  error.stderr = Buffer.from('fatal: origin/main...HEAD: no merge base\n');
  return error;
}

test('changed-file diff prefers merge-base semantics when available', () => {
  const calls = [];
  const changedFiles = listChangedFilesBetween({
    baseRef: 'origin/release',
    headRef: 'HEAD',
    runGitDiff(args) {
      calls.push(args);
      return 'docs/a.md\npackages/@dvt/engine/src/index.ts\n';
    },
  });

  assert.deepEqual(calls, [['diff', '--name-only', '--diff-filter=ACMR', 'origin/release...HEAD']]);
  assert.deepEqual(changedFiles, ['docs/a.md', 'packages/@dvt/engine/src/index.ts']);
});

test('changed-file diff falls back to direct tree diff for shallow merge refs', () => {
  const calls = [];
  const changedFiles = listChangedFilesBetween({
    baseRef: 'origin/main',
    headRef: 'merge-sha',
    runGitDiff(args) {
      calls.push(args);
      if (calls.length === 1) {
        throw noMergeBaseError();
      }
      return '.github/workflows/pr-quality-gate.yml\r\ntools\\ci\\arc-check.mjs\r\n';
    },
  });

  assert.deepEqual(calls, [
    ['diff', '--name-only', '--diff-filter=ACMR', 'origin/main...merge-sha'],
    ['diff', '--name-only', '--diff-filter=ACMR', 'origin/main', 'merge-sha'],
  ]);
  assert.deepEqual(changedFiles, [
    '.github/workflows/pr-quality-gate.yml',
    'tools/ci/arc-check.mjs',
  ]);
});

test('changed-file diff propagates non-shallow git errors', () => {
  const expectedError = new Error('git is unavailable');

  assert.throws(
    () =>
      listChangedFilesBetween({
        baseRef: 'origin/main',
        headRef: 'HEAD',
        runGitDiff() {
          throw expectedError;
        },
      }),
    expectedError
  );
});
