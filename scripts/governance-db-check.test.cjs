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

test('governance DB expected fingerprints are derived from imported file rows', () => {
  const expected = buildGovernanceExpectedState({
    sources: [],
    files: [
      {
        path: 'docs/example.md',
        fileId: 'F-FILE',
        contentHash: 'a'.repeat(64),
        governanceHash: 'b'.repeat(64),
        stateFingerprint: 'c'.repeat(64),
        owningUnit: 'SYS-DOCS-GOVERNANCE',
        sourcePath:
          '.generated-docs/planning/status/governance-files/SYS-DOCS-GOVERNANCE.files.yaml',
        sourceContentSha256: 'd'.repeat(64),
      },
    ],
    components: [],
    componentFiles: [],
    fingerprints: [
      {
        path: 'docs/example.md',
        fileId: 'F-BASELINE',
        contentHash: 'e'.repeat(64),
        governanceHash: 'f'.repeat(64),
        stateFingerprint: '1'.repeat(64),
        owningUnit: 'SYS-BASELINE',
        sourcePath:
          '.generated-docs/planning/status/system-governance-file-fingerprint-baseline.yaml',
        sourceContentSha256: '2'.repeat(64),
      },
    ],
    coverageRows: [],
    remediationTasks: [],
  });

  assert.deepEqual(expected.fingerprints, [
    {
      path: 'docs/example.md',
      fileId: 'F-FILE',
      contentHash: 'a'.repeat(64),
      governanceHash: 'b'.repeat(64),
      stateFingerprint: 'c'.repeat(64),
      owningUnit: 'SYS-DOCS-GOVERNANCE',
      sourcePath: '.generated-docs/planning/status/governance-files/SYS-DOCS-GOVERNANCE.files.yaml',
      sourceContentSha256: 'd'.repeat(64),
    },
  ]);
});
