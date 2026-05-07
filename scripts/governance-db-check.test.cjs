const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildGovernanceExpectedState,
  compareGovernanceDatabaseState,
  formatDriftReport,
} = require('./governance-db-check.cjs');

test('governance DB drift check detects stale governance source hashes', () => {
  const expected = buildGovernanceExpectedState({
    sources: [
      {
        sourcePath: '.generated-docs/planning/status/system-governance-file-index.files.yaml',
        sourceType: 'governance_file_index',
        contentSha256: 'd'.repeat(64),
        sourceBytes: 200,
      },
    ],
    files: [],
    components: [],
    componentFiles: [],
    fingerprints: [],
    coverageRows: [],
    remediationTasks: [],
  });
  const actual = {
    ...expected,
    sources: [
      {
        sourcePath: '.generated-docs/planning/status/system-governance-file-index.files.yaml',
        sourceType: 'governance_file_index',
        contentSha256: 'e'.repeat(64),
        sourceBytes: 200,
      },
    ],
  };

  const report = compareGovernanceDatabaseState(expected, actual);

  assert.equal(report.ok, false);
  assert.match(formatDriftReport('governance:db:check', report), /stale rows: 1/);
  assert.match(formatDriftReport('governance:db:check', report), /system-governance-file-index/);
});

test('governance DB drift check detects missing remediation tasks', () => {
  const expected = buildGovernanceExpectedState({
    sources: [],
    files: [],
    components: [],
    componentFiles: [],
    fingerprints: [],
    coverageRows: [],
    remediationTasks: [
      {
        taskId: 'GRQ-DRIFT_REMOVAL-SYS-PLANSTORE-API-COMPOSITION',
        priority: 'P0',
        fileCount: 20,
        documentCount: 0,
        sourcePath:
          '.generated-docs/planning/status/system-governance-remediation-queue.queue.yaml',
        sourceContentSha256: 'f'.repeat(64),
      },
    ],
  });
  const actual = { ...expected, remediationTasks: [] };

  const report = compareGovernanceDatabaseState(expected, actual);

  assert.equal(report.ok, false);
  assert.deepEqual(report.sections.remediationTasks.missing, [
    'GRQ-DRIFT_REMOVAL-SYS-PLANSTORE-API-COMPOSITION',
  ]);
});
