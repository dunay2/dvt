const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildIntegrityCheckResult,
  formatIntegrityCheckSummary,
  shouldFailIntegrityCheck,
} = require('./planning-db-integrity-check.cjs');

test('Planning DB integrity check reports historical debt without failing report mode', () => {
  const result = buildIntegrityCheckResult({
    componentRows: [],
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
      total: 0,
      blocker: 0,
      error: 0,
      warning: 0,
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

test('Planning DB integrity check fails report mode on any new surface-named rail', () => {
  const baselineResult = buildIntegrityCheckResult({
    componentRows: [],
    railRows: [],
    strict: false,
  });

  assert.equal(baselineResult.exitCode, 0);
  assert.equal(shouldFailIntegrityCheck(baselineResult), false);

  const regressionResult = buildIntegrityCheckResult({
    componentRows: [],
    railRows: [
      {
        finding_kind: 'surface_named_rail',
        severity: 'warning',
        rail_name: 'ApiNewSurfaceNamedRail',
      },
    ],
    strict: false,
  });

  assert.equal(regressionResult.exitCode, 1);
  assert.deepEqual(regressionResult.baselineViolations, [
    {
      surface: 'rail_vocabulary',
      kind: 'surface_named_rail',
      metric: 'total',
      actual: 1,
      allowed: 0,
    },
    {
      surface: 'rail_vocabulary',
      kind: 'surface_named_rail',
      metric: 'warning',
      actual: 1,
      allowed: 0,
    },
  ]);
});

test('Planning DB integrity check tightens gap rail baseline after surface rails split out', () => {
  const baselineGapRails = Array.from({ length: 98 }, (_, index) => ({
    finding_kind: 'gap_rail',
    severity: 'warning',
    rail_name: `HistoricalGapRail${index}`,
  }));

  const baselineResult = buildIntegrityCheckResult({
    componentRows: [],
    railRows: baselineGapRails,
    strict: false,
  });

  assert.equal(baselineResult.exitCode, 0);
  assert.equal(shouldFailIntegrityCheck(baselineResult), false);

  const regressionResult = buildIntegrityCheckResult({
    componentRows: [],
    railRows: [
      ...baselineGapRails,
      {
        finding_kind: 'gap_rail',
        severity: 'warning',
        rail_name: 'NewGapRail',
      },
    ],
    strict: false,
  });

  assert.equal(regressionResult.exitCode, 1);
  assert.deepEqual(regressionResult.baselineViolations, [
    {
      surface: 'rail_vocabulary',
      kind: 'gap_rail',
      metric: 'total',
      actual: 99,
      allowed: 98,
    },
    {
      surface: 'rail_vocabulary',
      kind: 'gap_rail',
      metric: 'warning',
      actual: 99,
      allowed: 98,
    },
  ]);
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
