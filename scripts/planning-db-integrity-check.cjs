#!/usr/bin/env node
/**
 * @file scripts/planning-db-integrity-check.cjs
 * @ownedConcern Check Planning DB component and rail integrity from DB read models.
 */
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const {
  readComponentIntegrityRows,
} = require('./planning-db/queries/component-integrity-query.cjs');
const { readRailVocabularyRows } = require('./planning-db/queries/rail-vocabulary-query.cjs');
const { readSourceDriftRows } = require('./planning-db/queries/code-symbol-query.cjs');

const databaseUrl = process.env.PLANNING_DATABASE_URL || process.env.DATABASE_URL || defaultPgUrl;
const severityOrder = Object.freeze(['blocker', 'error', 'warning', 'info']);
const integrityScopes = Object.freeze(['operational', 'bootstrap']);
const bootstrapAuthorityDependentFindings = Object.freeze({
  componentIntegrity: new Set([
    'component_evidence_gap',
    'component_missing_architecture_authority',
  ]),
  railVocabulary: new Set(['gap_rail']),
});
const progressiveBaseline = Object.freeze({
  componentIntegrity: Object.freeze({
    architecture_drift: Object.freeze({ total: 0 }),
    component_evidence_gap: Object.freeze({ total: 53 }),
    component_missing_architecture_authority: Object.freeze({ total: 54 }),
    component_path_without_files: Object.freeze({ total: 0 }),
    duplicate_repo_path: Object.freeze({ total: 0 }),
    filesystem_coverage: Object.freeze({ total: 0 }),
    fitness_gap: Object.freeze({ total: 0 }),
    missing_maturity_evidence: Object.freeze({ total: 0 }),
  }),
  railVocabulary: Object.freeze({
    exact_duplicate: Object.freeze({ total: 0 }),
    gap_rail: Object.freeze({ warning: 0, total: 0 }),
    missing_ddd_owner: Object.freeze({ total: 0 }),
    semantic_duplicate: Object.freeze({ total: 0 }),
    surface_named_rail: Object.freeze({ warning: 0, total: 0 }),
  }),
  sourceDrift: Object.freeze({
    missing_source_file: Object.freeze({ total: 0 }),
  }),
});

function parseArgs(args = process.argv.slice(2), env = process.env) {
  const configuredScope = env.PLANNING_DB_INTEGRITY_SCOPE || 'operational';
  if (!integrityScopes.includes(configuredScope)) {
    throw new Error(
      `Invalid PLANNING_DB_INTEGRITY_SCOPE "${configuredScope}". Expected operational or bootstrap.`
    );
  }
  const options = {
    strict: false,
    limit: 5000,
    scope: configuredScope,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg === '--report') {
      options.strict = false;
      continue;
    }
    if (arg === '--bootstrap') {
      options.scope = 'bootstrap';
      continue;
    }
    if (arg === '--operational') {
      options.scope = 'operational';
      continue;
    }
    if (arg === '--limit') {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error('Missing value for --limit.');
      }
      index += 1;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid --limit "${value}". Expected a positive integer.`);
      }
      options.limit = parsed;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown planning DB integrity check option "${arg}".`);
  }

  return options;
}

function helpText() {
  return [
    'Planning DB integrity check',
    '',
    'Usage:',
    '  node scripts/planning-db-integrity-check.cjs [--report|--strict] [--bootstrap|--operational] [--limit <n>]',
    '',
    'Report mode exits 0 while historical debt is being retired.',
    'Report mode still exits 1 when progressive regression budgets are exceeded.',
    'Strict mode exits 1 on blocker or error findings, or on progressive regressions.',
    'Bootstrap scope excludes authority-only gaps that an empty CI database cannot assess.',
  ].join('\n');
}

function blankSeverityCounts() {
  return {
    total: 0,
    blocker: 0,
    error: 0,
    warning: 0,
    info: 0,
  };
}

function countRowsBySeverity(rows) {
  const counts = blankSeverityCounts();
  for (const row of rows) {
    counts.total += 1;
    const severity = severityOrder.includes(row.severity) ? row.severity : 'info';
    counts[severity] += 1;
  }

  return counts;
}

function countRowsByKindAndSeverity(rows) {
  const counts = {};
  for (const row of rows) {
    const kind = row.finding_kind || 'unknown';
    const severity = severityOrder.includes(row.severity) ? row.severity : 'info';
    if (!counts[kind]) {
      counts[kind] = blankSeverityCounts();
    }
    counts[kind].total += 1;
    counts[kind][severity] += 1;
  }

  return counts;
}

function hasBlockingFinding(counts) {
  return counts.blocker > 0 || counts.error > 0;
}

function baselineBudgetFor({ baseline = {}, kind, metric }) {
  const kindBudget = baseline[kind] || {};
  if (Object.prototype.hasOwnProperty.call(kindBudget, metric)) {
    return kindBudget[metric];
  }

  if (metric === 'blocker' || metric === 'error') {
    return 0;
  }

  return null;
}

function buildProgressiveBaselineViolations(kindCounts = {}, baseline = {}) {
  const kinds = new Set([...Object.keys(kindCounts), ...Object.keys(baseline)]);
  const violations = [];
  for (const kind of [...kinds].sort()) {
    const counts = kindCounts[kind] || blankSeverityCounts();
    for (const metric of ['total', ...severityOrder]) {
      const allowed = baselineBudgetFor({ baseline, kind, metric });
      if (allowed === null) {
        continue;
      }
      const actual = counts[metric] || 0;
      if (actual > allowed) {
        violations.push({
          kind,
          metric,
          actual,
          allowed,
        });
      }
    }
  }

  return violations;
}

function buildIntegrityCheckResult({
  componentRows = [],
  railRows = [],
  sourceDriftRows = [],
  strict = false,
  scope = 'operational',
} = {}) {
  if (!integrityScopes.includes(scope)) {
    throw new Error(`Unknown Planning DB integrity scope "${scope}".`);
  }
  const effectiveComponentRows =
    scope === 'bootstrap'
      ? componentRows.filter(
          (row) => !bootstrapAuthorityDependentFindings.componentIntegrity.has(row.finding_kind)
        )
      : componentRows;
  const effectiveRailRows =
    scope === 'bootstrap'
      ? railRows.filter(
          (row) => !bootstrapAuthorityDependentFindings.railVocabulary.has(row.finding_kind)
        )
      : railRows;
  const skippedAuthorityFindings = {
    componentIntegrity: componentRows.length - effectiveComponentRows.length,
    railVocabulary: railRows.length - effectiveRailRows.length,
  };
  const kindCounts = {
    componentIntegrity: countRowsByKindAndSeverity(effectiveComponentRows),
    railVocabulary: countRowsByKindAndSeverity(effectiveRailRows),
    sourceDrift: countRowsByKindAndSeverity(sourceDriftRows),
  };
  const baselineViolations = [
    ...buildProgressiveBaselineViolations(
      kindCounts.componentIntegrity,
      progressiveBaseline.componentIntegrity
    ).map((violation) => ({ ...violation, surface: 'component_integrity' })),
    ...buildProgressiveBaselineViolations(
      kindCounts.railVocabulary,
      progressiveBaseline.railVocabulary
    ).map((violation) => ({ ...violation, surface: 'rail_vocabulary' })),
    ...buildProgressiveBaselineViolations(
      kindCounts.sourceDrift,
      progressiveBaseline.sourceDrift
    ).map((violation) => ({ ...violation, surface: 'source_drift' })),
  ];
  const counts = {
    componentIntegrity: countRowsBySeverity(effectiveComponentRows),
    railVocabulary: countRowsBySeverity(effectiveRailRows),
    sourceDrift: countRowsBySeverity(sourceDriftRows),
  };
  const blocking =
    hasBlockingFinding(counts.componentIntegrity) ||
    hasBlockingFinding(counts.railVocabulary) ||
    hasBlockingFinding(counts.sourceDrift);

  return {
    mode: strict ? 'strict' : 'report',
    scope,
    strict,
    counts,
    kindCounts,
    skippedAuthorityFindings,
    baselineViolations,
    exitCode: (strict && blocking) || baselineViolations.length > 0 ? 1 : 0,
  };
}

function shouldFailIntegrityCheck(result) {
  return result.exitCode !== 0;
}

function formatCountLine(label, counts) {
  return `${label} total=${counts.total} blocker=${counts.blocker} error=${counts.error} warning=${counts.warning} info=${counts.info}`;
}

function formatIntegrityCheckSummary(result) {
  const lines = [
    `[planning:db:integrity] mode=${result.mode} scope=${result.scope} exit=${result.exitCode}`,
    formatCountLine('component_integrity', result.counts.componentIntegrity),
    formatCountLine('rail_vocabulary', result.counts.railVocabulary),
    formatCountLine('source_drift', result.counts.sourceDrift),
    `authority_dependent_skipped component_integrity=${result.skippedAuthorityFindings.componentIntegrity} rail_vocabulary=${result.skippedAuthorityFindings.railVocabulary}`,
    `progressive_baseline ${result.baselineViolations.length === 0 ? 'pass' : `fail violations=${result.baselineViolations.length}`}`,
  ];
  for (const violation of result.baselineViolations) {
    lines.push(
      `baseline_violation ${violation.surface}.${violation.kind}.${violation.metric} actual=${violation.actual} allowed=${violation.allowed}`
    );
  }

  return lines.join('\n');
}

async function runIntegrityCheck(options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl });
  const ownsClient = !options.client;
  try {
    if (ownsClient) {
      await client.connect();
    }
    await client.query('set statement_timeout = 0');
    const limit = options.limit || 5000;
    const [componentRows, railRows, sourceDriftRows] = await Promise.all([
      readComponentIntegrityRows(client, { limit }),
      readRailVocabularyRows(client, { limit }),
      readSourceDriftRows(client, { limit }),
    ]);

    return buildIntegrityCheckResult({
      componentRows,
      railRows,
      sourceDriftRows,
      strict: options.strict === true,
      scope: options.scope || 'operational',
    });
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(helpText());
    return;
  }

  const result = await runIntegrityCheck(options);
  console.log(formatIntegrityCheckSummary(result));
  process.exitCode = result.exitCode;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:integrity] ${error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  buildIntegrityCheckResult,
  countRowsBySeverity,
  countRowsByKindAndSeverity,
  formatIntegrityCheckSummary,
  buildProgressiveBaselineViolations,
  parseArgs,
  progressiveBaseline,
  runIntegrityCheck,
  shouldFailIntegrityCheck,
};
