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

test('governance snapshot preserves component, fingerprint, coverage, and remediation content', () => {
  const snapshot = buildGovernanceFileSnapshot();

  assert.equal(snapshot.components.length, snapshot.componentIndex.componentCount);
  assert.equal(snapshot.componentFileShards.length, snapshot.componentFileMap.componentCount);
  assert.equal(snapshot.componentFiles.length, snapshot.componentFileMap.fileCount);
  assert.equal(snapshot.fingerprints.length, snapshot.fingerprintBaseline.fileCount);
  assert.equal(snapshot.coverageRows.length > 0, true);
  assert.equal(snapshot.remediationTasks.length, snapshot.remediationQueue.totals.tasks);

  const planstoreDrift = snapshot.remediationTasks.find(
    (task) => task.taskId === 'GRQ-DRIFT_REMOVAL-SYS-PLANSTORE-API-COMPOSITION'
  );
  assert.ok(planstoreDrift);
  assert.equal(planstoreDrift.priority, 'P0');
  assert.equal(planstoreDrift.fileCount, 20);
  assert.equal(planstoreDrift.files.length, 20);
});

test('normalizeText keeps structured lane fields queryable without dropping content', () => {
  assert.equal(normalizeText(undefined), '');
  assert.equal(normalizeText(['one', 'two']), 'one\ntwo');
  assert.equal(normalizeText({ a: 1 }), '{"a":1}');
});
