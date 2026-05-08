const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { schemaName } = require('./planning-db-migrate.cjs');

const knownQueries = new Set(['summary']);

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function resolveQueryName(value) {
  const queryName = value || 'summary';
  if (!knownQueries.has(queryName)) {
    throw new Error(`Unknown planning DB query "${queryName}". Expected: summary.`);
  }

  return queryName;
}

function buildSummaryRows(summary) {
  return [
    ['planning.lanes', summary.lanes],
    ['planning.tasks', summary.tasks],
    ['planning.tasks.review', summary.reviewTasks],
    ['governance.files', summary.governanceFiles],
    ['governance.files.drift', summary.driftFiles],
    ['governance.files.legacy', summary.legacyFiles],
    ['governance.components', summary.governanceComponents],
    ['governance.component_files', summary.governanceComponentFiles],
    ['governance.fingerprints', summary.governanceFingerprints],
    ['governance.coverage_rows', summary.governanceCoverageRows],
    ['governance.remediation_tasks', summary.governanceRemediationTasks],
    ['governance.remediation_tasks.p0', summary.governanceRemediationP0],
    ['governance.hash_drift', summary.governanceHashDrift],
    ['planning.local_task_overlays', summary.planningLocalTaskOverlays],
    ['planning.local_operations', summary.planningLocalOperations],
  ];
}

async function readSummary(client) {
  const result = await client.query(`
    select
      (select count(*)::int from ${schemaName}.planning_lanes) as lanes,
      (select count(*)::int from ${schemaName}.planning_tasks) as tasks,
      (select count(*)::int from ${schemaName}.planning_tasks where status = 'review') as "reviewTasks",
      (select count(*)::int from ${schemaName}.governance_files) as "governanceFiles",
      (select count(*)::int from ${schemaName}.governance_files where is_drift = true) as "driftFiles",
      (select count(*)::int from ${schemaName}.governance_files where is_legacy = true) as "legacyFiles",
      (select count(*)::int from ${schemaName}.governance_components) as "governanceComponents",
      (select count(*)::int from ${schemaName}.governance_component_files) as "governanceComponentFiles",
      (select count(*)::int from ${schemaName}.governance_fingerprints) as "governanceFingerprints",
      (select count(*)::int from ${schemaName}.governance_coverage) as "governanceCoverageRows",
      (select count(*)::int from ${schemaName}.governance_remediation) as "governanceRemediationTasks",
      (select count(*)::int from ${schemaName}.governance_remediation where priority = 'P0') as "governanceRemediationP0",
      (select count(*)::int from ${schemaName}.governance_file_hash_drift) as "governanceHashDrift",
      (select count(*)::int from ${schemaName}.planning_task_local_state) as "planningLocalTaskOverlays",
      (select count(*)::int from ${schemaName}.planning_local_operations) as "planningLocalOperations"
  `);

  return result.rows[0];
}

function printSummary(summary) {
  for (const [label, value] of buildSummaryRows(summary)) {
    console.log(`${label}: ${value}`);
  }
}

async function runQuery(options = {}) {
  const queryName = resolveQueryName(options.queryName);
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    if (queryName === 'summary') {
      const summary = await readSummary(client);
      if (options.print !== false) {
        printSummary(summary);
      }
      return summary;
    }

    throw new Error(`Unhandled planning DB query "${queryName}".`);
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function main() {
  const [queryName] = process.argv.slice(2);
  await runQuery({ queryName });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:query] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildSummaryRows,
  databaseUrl,
  printSummary,
  readSummary,
  resolveQueryName,
  runQuery,
};
