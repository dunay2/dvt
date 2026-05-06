const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildGovernanceFileSnapshot,
  buildPlanningContentSnapshot,
  normalizeText,
} = require('./planning-db-import.cjs');

test('planning content snapshot preserves real lane task content and hashes', () => {
  const snapshot = buildPlanningContentSnapshot();

  assert.equal(snapshot.lanes.length, 5);
  assert.ok(snapshot.tasks.length > 100);
  assert.match(snapshot.sources[0].contentSha256, /^[a-f0-9]{64}$/);

  const mvpA1 = snapshot.tasks.find((task) => task.laneId === 'A' && task.taskId === 'MVP-A1');
  assert.ok(mvpA1);
  assert.equal(mvpA1.status, 'done');
  assert.equal(mvpA1.priority, 'P0');
  assert.match(mvpA1.objective, /inventory the current backend MVP contractual surface/);
  assert.ok(
    mvpA1.evidenceRefs.includes(
      'docs/evidence/critical/ED-20260331-mvp-a1-backend-contractual-inventory.md'
    )
  );
});

test('governance file snapshot preserves every file entry declared by the index', () => {
  const snapshot = buildGovernanceFileSnapshot();

  assert.equal(snapshot.files.length, snapshot.index.fileCount);
  assert.ok(snapshot.fileShards.length > 0);

  const packageJson = snapshot.files.find((file) => file.path === 'package.json');
  assert.ok(packageJson);
  assert.match(packageJson.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(typeof packageJson.isDrift, 'boolean');
});

test('normalizeText keeps structured lane fields queryable without dropping content', () => {
  assert.equal(normalizeText(undefined), '');
  assert.equal(normalizeText(['one', 'two']), 'one\ntwo');
  assert.equal(normalizeText({ a: 1 }), '{"a":1}');
});
