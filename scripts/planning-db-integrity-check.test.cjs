const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildIntegrityCheckResult,
  formatIntegrityCheckSummary,
  shouldFailIntegrityCheck,
} = require('./planning-db-integrity-check.cjs');

test('Planning DB integrity check reports historical debt without failing report mode', () => {
  const result = buildIntegrityCheckResult({
    componentRows: [
      {
        finding_kind: 'missing_maturity_evidence',
        severity: 'error',
        component_id: 'SYS-WEB-ROOT',
      },
      {
        finding_kind: 'missing_maturity_evidence',
        severity: 'warning',
        component_id: 'SYS-WEB-ROOT',
      },
    ],
    railRows: [
      {
        finding_kind: 'gap_rail',
        severity: 'warning',
        rail_name: 'ProposedWidgetQuery',
      },
    ],
    strict: false,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(shouldFailIntegrityCheck(result), false);
  assert.deepEqual(result.counts, {
    componentIntegrity: {
      total: 2,
      blocker: 0,
      error: 1,
      warning: 1,
      info: 0,
    },
    railVocabulary: {
      total: 1,
      blocker: 0,
      error: 0,
      warning: 1,
      info: 0,
    },
  });
});

test('Planning DB integrity check fails report mode on progressive regressions', () => {
  const result = buildIntegrityCheckResult({
    componentRows: [],
    railRows: [
      {
        finding_kind: 'semantic_duplicate',
        severity: 'error',
        rail_name: 'ApiListWidgetsQuery',
      },
    ],
    strict: false,
  });

  assert.equal(result.exitCode, 1);
  assert.equal(shouldFailIntegrityCheck(result), true);
  assert.deepEqual(result.baselineViolations, [
    {
      surface: 'rail_vocabulary',
      kind: 'semantic_duplicate',
      metric: 'total',
      actual: 1,
      allowed: 0,
    },
    {
      surface: 'rail_vocabulary',
      kind: 'semantic_duplicate',
      metric: 'error',
      actual: 1,
      allowed: 0,
    },
  ]);
  assert.match(formatIntegrityCheckSummary(result), /progressive_baseline fail/);
});

test('Planning DB integrity check fails strict mode on blocker or error findings', () => {
  const result = buildIntegrityCheckResult({
    componentRows: [
      {
        finding_kind: 'component_without_owner',
        severity: 'blocker',
        component_id: 'SYS-UNKNOWN',
      },
    ],
    railRows: [],
    strict: true,
  });

  assert.equal(result.exitCode, 1);
  assert.equal(shouldFailIntegrityCheck(result), true);
  assert.match(formatIntegrityCheckSummary(result), /mode=strict/);
  assert.match(formatIntegrityCheckSummary(result), /component_integrity total=1 blocker=1/);
});
