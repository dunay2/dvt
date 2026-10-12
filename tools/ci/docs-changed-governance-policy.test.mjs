/** Owned concern: prove changed-doc CLI selection and filename policy on real files. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import verifyChanged from '../../scripts/verify-changed.cjs';
import verifyPrepush from '../../scripts/verify-prepush.cjs';
import { createDocsRepository } from './test/docsCliFixture.mjs';

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const filenameCommand = 'tools/docs/check-filenames.ts';
const filenameArgs = ['--changed-only', '--strict'];

test('changed-doc governance commands remain wired into docs and pre-push gates', () => {
  assert.equal(
    rootPackage.scripts['docs:gov:filenames:changed'],
    'tsx tools/docs/check-filenames.ts --changed-only --strict'
  );
  assert.equal(
    rootPackage.scripts['docs:gov:frontmatter:changed'],
    'tsx tools/docs/check-frontmatter.ts --changed-only'
  );
  assert.match(rootPackage.scripts['docs:gov'], /\bpnpm docs:gov:filenames:changed\b/);
  assert.match(rootPackage.scripts['docs:gov'], /\bpnpm docs:gov:frontmatter:changed\b/);
  assert.equal(rootPackage.scripts['verify:prepush'], 'node scripts/verify-prepush.cjs');
  const files = ['docs/guides/testing-and-ci-capabilities.md'];
  assert.deepEqual(
    verifyPrepush.buildPrepushPlan(files).map((step) => step.id),
    ['verify-changed']
  );
  const steps = verifyChanged.buildVerifyChangedPlan(files).map((step) => step.id);
  assert.ok(steps.includes('docs-gov-filenames-changed'));
  assert.ok(steps.includes('docs-gov-frontmatter-changed'));
});

for (const [name, status, message] of [
  ['docs/planning/reviews/Bad_File.md', 1, /Filename should be kebab-case/],
  ['docs/planning/reviews/bad name.md', 1, /Filename contains spaces/],
  ['docs/planning/reviews/valid-name.md', 0, /0 error\(s\)/],
  ['docs/evidence/ED-20991231-valid-evidence.md', 0, /0 error\(s\)/],
  ['docs/adr/ADR-9999-valid-decision.md', 0, /0 error\(s\)/],
  ['docs/adr/ADR-9999.md', 1, /ADR filename does not match/],
]) {
  test('filename policy validates the existing file ' + name, (t) => {
    const repo = createDocsRepository(t);
    repo.write(name, '# Fixture\n');
    const result = repo.run(filenameCommand, filenameArgs, [name]);
    assert.equal(result.status, status, result.output);
    assert.match(result.output, message);
    assert.doesNotMatch(result.output, /No changed docs markdown files/);
    assert.equal(repo.read(name), '# Fixture\n', 'Validation must not mutate the input');
  });
}

test('deleted non-canonical docs are ignored without hiding an existing invalid doc', (t) => {
  const repo = createDocsRepository(t);
  const deleted = 'docs/planning/reviews/Deleted_File.md';
  const invalid = 'docs/planning/reviews/Bad_File.md';
  const empty = repo.run(filenameCommand, filenameArgs, [deleted]);
  assert.equal(empty.status, 0, empty.output);
  assert.match(empty.output, /No changed docs markdown files/);
  repo.write(invalid, '# Invalid\n');
  const result = repo.run(filenameCommand, filenameArgs, [deleted, invalid]);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Filename should be kebab-case/);
});

test('independent test repositories cannot overwrite each other', (t) => {
  const first = createDocsRepository(t);
  const second = createDocsRepository(t);
  const name = 'docs/planning/reviews/same-name.md';
  assert.notEqual(first.root, second.root);
  first.write(name, '# First\n');
  second.write(name, '# Second\n');
  for (const repo of [first, second]) {
    const result = repo.run(filenameCommand, filenameArgs, [name]);
    assert.equal(result.status, 0, result.output);
  }
  assert.equal(first.read(name), '# First\n');
  assert.equal(second.read(name), '# Second\n');
});

test('the real location CLI reports canonical placement remediation', (t) => {
  const repo = createDocsRepository(t);
  const result = repo.run(
    'scripts/check-markdown-locations.cjs',
    ['--changed-only'],
    ['apps/web/src/bad-doc.md']
  );
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /apps\/web\/src\/bad-doc\.md/);
  assert.match(result.output, /Move governed documentation into docs\//);
});
