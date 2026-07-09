/** Owned concern: prove changed Markdown linting respects generated-file ignores. */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isIgnoredByPattern,
  listChangedMarkdownFiles,
  parseIgnorePatterns,
} = require('./lint-markdown-changed.cjs');

test('parseIgnorePatterns ignores comments and blank lines', () => {
  assert.deepEqual(parseIgnorePatterns(['# generated', '', 'CHANGELOG.md', 'dist/**'].join('\n')), [
    'CHANGELOG.md',
    'dist/**',
  ]);
});

test('isIgnoredByPattern supports repository ignore patterns used by markdownlint', () => {
  assert.equal(isIgnoredByPattern('CHANGELOG.md', 'CHANGELOG.md'), true);
  assert.equal(isIgnoredByPattern('dist/output.md', 'dist/**'), true);
  assert.equal(
    isIgnoredByPattern('apps/web/node_modules/pkg/README.md', '**/node_modules/**'),
    true
  );
  assert.equal(isIgnoredByPattern('docs/guides/index.md', 'dist/**'), false);
});

test('listChangedMarkdownFiles excludes generated changelog before invoking markdownlint', () => {
  assert.deepEqual(
    listChangedMarkdownFiles({
      changedFiles: ['CHANGELOG.md', 'README.md', 'docs/guides/testing-and-ci-capabilities.md'],
      ignorePatterns: ['CHANGELOG.md'],
    }),
    ['README.md', 'docs/guides/testing-and-ci-capabilities.md']
  );
});
