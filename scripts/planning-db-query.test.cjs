const test = require('node:test');
const assert = require('node:assert/strict');

const { buildSummaryRows, resolveQueryName } = require('./planning-db-query.cjs');

test('resolveQueryName defaults to summary and rejects unknown query names', () => {
  assert.equal(resolveQueryName(undefined), 'summary');
  assert.equal(resolveQueryName('summary'), 'summary');
  assert.throws(() => resolveQueryName('unknown'), /Unknown planning DB query "unknown"/);
});

test('buildSummaryRows exposes planning and governance content counts', () => {
  const rows = buildSummaryRows({
    lanes: 5,
    tasks: 250,
    reviewTasks: 9,
    governanceFiles: 4255,
    driftFiles: 41,
    legacyFiles: 0,
    governanceComponents: 32,
    governanceComponentFiles: 4255,
    governanceFingerprints: 4255,
    governanceCoverageRows: 128,
    governanceRemediationTasks: 43,
    governanceRemediationP0: 3,
  });

  assert.deepEqual(rows, [
    ['planning.lanes', 5],
    ['planning.tasks', 250],
    ['planning.tasks.review', 9],
    ['governance.files', 4255],
    ['governance.files.drift', 41],
    ['governance.files.legacy', 0],
    ['governance.components', 32],
    ['governance.component_files', 4255],
    ['governance.fingerprints', 4255],
    ['governance.coverage_rows', 128],
    ['governance.remediation_tasks', 43],
    ['governance.remediation_tasks.p0', 3],
  ]);
});
