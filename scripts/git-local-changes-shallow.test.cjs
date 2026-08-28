/** Regression coverage for shallow committed-diff fallback. */
const test = require('node:test');
const assert = require('node:assert/strict');

const { listCommittedChangedFiles } = require('./git-local-changes.cjs');

test('listCommittedChangedFiles falls back to direct tree diff when merge-base diff is unavailable', () => {
  const calls = [];
  const changedFiles = listCommittedChangedFiles({
    baseRef: 'base-sha',
    headRef: 'merge-sha',
    diffFilter: 'AR',
    runGitLines(args) {
      calls.push(args.join(' '));
      if (calls.length === 1) {
        throw new Error('no merge base in shallow checkout');
      }
      return ['buzon/new.md', 'docs/changed.md'];
    },
  });

  assert.deepEqual(calls, [
    'diff --name-only --diff-filter=AR base-sha...merge-sha',
    'diff --name-only --diff-filter=AR base-sha merge-sha',
  ]);
  assert.deepEqual(changedFiles, ['buzon/new.md', 'docs/changed.md']);
});

test('listCommittedChangedFiles still fails closed when both diff strategies fail', () => {
  assert.throws(
    () =>
      listCommittedChangedFiles({
        baseRef: 'missing-base',
        headRef: 'merge-sha',
        runGitLines() {
          throw new Error('missing ref');
        },
      }),
    /Unable to read committed changed files between missing-base and merge-sha/
  );
});
