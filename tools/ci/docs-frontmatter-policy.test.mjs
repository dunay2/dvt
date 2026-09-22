/** Owned concern: prove frontmatter behavior independently of historical repository documents. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createDocsRepository, validEvidence } from './test/docsCliFixture.mjs';

const command = 'tools/docs/check-frontmatter.ts';
const name = 'docs/evidence/ED-20991231-frontmatter.md';

for (const prefix of ['', '\uFEFF']) {
  for (const [label, content, status, message] of [
    ['valid', validEvidence, 0, /0 error\(s\)/],
    ['missing frontmatter', '# No frontmatter\n', 1, /missing YAML frontmatter/],
    [
      'missing owners',
      validEvidence.replace('owners: [docs]\n', ''),
      1,
      /missing required frontmatter field: owners/,
    ],
    ['invalid status', validEvidence.replace('Accepted', 'invented'), 1, /not a standard value/],
  ]) {
    test('changed evidence ' + (prefix ? 'with BOM' : 'without BOM') + ': ' + label, (t) => {
      const repo = createDocsRepository(t);
      repo.write(name, prefix + content);
      const result = repo.run(command, ['--changed-only'], [name]);
      assert.equal(result.status, status, result.output);
      assert.match(result.output, message);
      assert.doesNotMatch(result.output, /No changed ADR or evidence/);
    });
  }
}

test('changed-only excludes unchanged invalid evidence; the same CLI full scan finds it', (t) => {
  const repo = createDocsRepository(t);
  const invalid = 'docs/evidence/ED-20991231-unchanged-invalid.md';
  repo.write(name, validEvidence);
  repo.write(invalid, '# Missing frontmatter\n');
  const selected = repo.run(command, ['--changed-only'], [name]);
  assert.equal(selected.status, 0, selected.output);
  const full = repo.run(command, [], [name]);
  assert.equal(full.status, 1, full.output);
  assert.match(full.output, /unchanged-invalid.md/);
  assert.match(full.output, /missing YAML frontmatter/);
});
