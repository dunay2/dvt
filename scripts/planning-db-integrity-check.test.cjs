const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildIntegrityCheckResult,
  formatIntegrityCheckSummary,
  parseArgs,
  runIntegrityCheck,
  shouldFailIntegrityCheck,
} = require('./planning-db-integrity-check.cjs');

test('Planning DB integrity check parses an explicit empty-bootstrap scope', () => {
  assert.deepEqual(parseArgs(['--bootstrap'], {}), {
    strict: false,
    limit: 5000,
    scope: 'bootstrap',
  });
  assert.deepEqual(parseArgs([], { PLANNING_DB_INTEGRITY_SCOPE: 'bootstrap' }), {
    strict: false,
    limit: 5000,
    scope: 'bootstrap',
  });
});

test('Planning DB bootstrap integrity excludes authority-only gaps without hiding derived regressions', () => {
  const result = buildIntegrityCheckResult({
    componentRows: [
      { finding_kind: 'component_evidence_gap', severity: 'warning' },
      { finding_kind: 'component_missing_architecture_authority', severity: 'warning' },
    ],
    railRows: [
      { finding_kind: 'gap_rail', severity: 'warning' },
      { finding_kind: 'surface_named_rail', severity: 'warning' },
    ],
    sourceDriftRows: [],
    scope: 'bootstrap',
  });

  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.skippedAuthorityFindings, {
    componentIntegrity: 2,
    railVocabulary: 1,
  });
  assert.deepEqual(result.baselineViolations, [
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
  assert.match(formatIntegrityCheckSummary(result), /scope=bootstrap/u);
  assert.match(
    formatIntegrityCheckSummary(result),
    /authority_dependent_skipped component_integrity=2 rail_vocabulary=1/u
  );
});

test('Planning DB integrity check reports historical component debt without failing report mode', () => {
  const result = buildIntegrityCheckResult({
    componentRows: [
      {
        finding_kind: 'component_evidence_gap',
        severity: 'warning',
        component_id: 'SYS-HISTORICAL-EVIDENCE',
      },
    ],
    sourceDriftRows: [],
    railRows: [],
    strict: false,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(shouldFailIntegrityCheck(result), false);
  assert.deepEqual(result.counts, {
    componentIntegrity: {
      total: 1,
      blocker: 0,
      error: 0,
      warning: 1,
      info: 0,
    },
    railVocabulary: {
      total: 0,
      blocker: 0,
      error: 0,
      warning: 0,
      info: 0,
    },
    sourceDrift: {
      total: 0,
      blocker: 0,
      error: 0,
      warning: 0,
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

test('Planning DB integrity check budgets historical component warnings only', () => {
  const historicalComponentWarnings = [
    ...Array.from({ length: 53 }, (_, index) => ({
      finding_kind: 'component_evidence_gap',
      severity: 'warning',
      component_id: `SYS-HISTORICAL-EVIDENCE-${index}`,
    })),
    ...Array.from({ length: 54 }, (_, index) => ({
      finding_kind: 'component_missing_architecture_authority',
      severity: 'warning',
      component_id: `SYS-HISTORICAL-AUTHORITY-${index}`,
    })),
  ];

  const baselineResult = buildIntegrityCheckResult({
    componentRows: historicalComponentWarnings,
    railRows: [],
    sourceDriftRows: [],
    strict: false,
  });

  assert.equal(baselineResult.exitCode, 0);

  const regressionResult = buildIntegrityCheckResult({
    componentRows: [
      ...historicalComponentWarnings,
      {
        finding_kind: 'component_evidence_gap',
        severity: 'warning',
        component_id: 'SYS-NEW-EVIDENCE-GAP',
      },
    ],
    railRows: [],
    sourceDriftRows: [],
    strict: false,
  });

  assert.equal(regressionResult.exitCode, 1);
  assert.deepEqual(regressionResult.baselineViolations, [
    {
      surface: 'component_integrity',
      kind: 'component_evidence_gap',
      metric: 'total',
      actual: 54,
      allowed: 53,
    },
  ]);
});

test('Planning DB integrity check fails report mode on governed source drift', () => {
  const result = buildIntegrityCheckResult({
    componentRows: [],
    railRows: [],
    sourceDriftRows: [
      {
        finding_kind: 'missing_source_file',
        severity: 'error',
        source_path: 'buzon/TAREA.TXT',
      },
    ],
    strict: false,
  });

  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.baselineViolations, [
    {
      surface: 'source_drift',
      kind: 'missing_source_file',
      metric: 'total',
      actual: 1,
      allowed: 0,
    },
    {
      surface: 'source_drift',
      kind: 'missing_source_file',
      metric: 'error',
      actual: 1,
      allowed: 0,
    },
  ]);
  assert.match(formatIntegrityCheckSummary(result), /source_drift total=1 blocker=0 error=1/);
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

test('Planning DB integrity check fails report mode on any new gap rail after cleanup', () => {
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
      actual: 1,
      allowed: 0,
    },
    {
      surface: 'rail_vocabulary',
      kind: 'gap_rail',
      metric: 'warning',
      actual: 1,
      allowed: 0,
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

test('Planning DB integrity check disables statement timeout before reading heavy views', async () => {
  const queries = [];
  const fakeClient = {
    async query(sql) {
      queries.push(sql);
      return { rows: [] };
    },
  };

  const result = await runIntegrityCheck({ client: fakeClient, limit: 10 });

  assert.equal(queries[0], 'set statement_timeout = 0');
  assert.equal(result.exitCode, 0);
});
