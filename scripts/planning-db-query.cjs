const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { schemaName } = require('./planning-db-migrate.cjs');

const knownQueries = new Set(['summary', 'hash-drift', 'tasks', 'next']);

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function resolveQueryName(value) {
  const queryName = value || 'summary';
  if (!knownQueries.has(queryName)) {
    throw new Error(
      `Unknown planning DB query "${queryName}". Expected: ${[...knownQueries].sort().join(', ')}.`
    );
  }

  return queryName;
}

function parseLimit(value, defaultLimit) {
  if (value === undefined || value === null || value === '') {
    return defaultLimit;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --limit "${value}". Expected a positive integer.`);
  }

  return parsed;
}

function parseArgs(args = process.argv.slice(2)) {
  const [queryNameArg, ...rest] = args;
  const queryName = resolveQueryName(queryNameArg);
  const filters = {};

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument "${arg}". Expected --name value flags.`);
    }

    const value = rest[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}.`);
    }
    index += 1;

    if (arg === '--lane') {
      filters.laneId = value;
      continue;
    }
    if (arg === '--status') {
      filters.status = value;
      continue;
    }
    if (arg === '--claimed-by') {
      filters.claimedBy = value;
      continue;
    }
    if (arg === '--priority') {
      filters.priority = value;
      continue;
    }
    if (arg === '--limit') {
      filters.limit = parseLimit(value, 20);
      continue;
    }

    throw new Error(`Unknown planning DB query option "${arg}".`);
  }

  return { queryName, filters };
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
    ['planning.local_task_overlays', summary.planningLocalTaskOverlays],
    ['planning.local_operations', summary.planningLocalOperations],
  ];
}

function buildHashDriftRows(summary) {
  return [['governance.hash_drift', summary.governanceHashDrift]];
}

function normalizeProgress(value) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${Math.round(parsed)}%` : String(value);
}

function buildTaskRows(rows) {
  return rows.map((row) => [
    row.lane_id ?? row.laneId,
    row.task_id ?? row.taskId,
    row.priority ?? '-',
    row.status,
    normalizeProgress(row.progress_pct ?? row.progressPct),
    row.claimed_by ?? row.claimedBy ?? '-',
    String(row.objective ?? '')
      .replace(/\s+/g, ' ')
      .trim(),
  ]);
}

function parseDependencyTokens(dependency) {
  if (!dependency || dependency === 'none') {
    return [];
  }

  return String(dependency)
    .split(/,|\band\b/)
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function isTaskUnblocked(task, doneTaskIds) {
  const status = String(task.status || '').toLowerCase();
  if (status !== 'queued') {
    return false;
  }

  return parseDependencyTokens(task.dependency).every((taskId) => doneTaskIds.has(taskId));
}

function priorityRank(priority) {
  const parsed = Number.parseInt(String(priority || 'P9').replace(/^P/i, ''), 10);
  return Number.isFinite(parsed) ? parsed : 9;
}

function compareTasksForRoute(left, right) {
  const priorityComparison = priorityRank(left.priority) - priorityRank(right.priority);
  if (priorityComparison !== 0) {
    return priorityComparison;
  }

  const leftTaskId = String(left.task_id ?? left.taskId ?? '');
  const rightTaskId = String(right.task_id ?? right.taskId ?? '');
  return leftTaskId.localeCompare(rightTaskId);
}

function buildNextTaskRows(rows, limit = 20) {
  const doneTaskIds = new Set(
    rows
      .filter((row) => String(row.status || '').toLowerCase() === 'done')
      .map((row) => String(row.task_id ?? row.taskId))
  );

  return buildTaskRows(
    rows.filter((row) => isTaskUnblocked(row, doneTaskIds)).sort(compareTasksForRoute)
  ).slice(0, limit);
}

function appendFilter(predicates, params, column, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  params.push(value);
  predicates.push(`${column} = $${params.length}`);
}

function effectiveTaskSelect() {
  return `
    select
      lane_id,
      task_id,
      priority,
      status,
      progress_pct,
      claimed_by,
      dependency,
      objective,
      target
    from ${schemaName}.planning_effective_tasks`;
}

async function readSummary(client) {
  const result = await client.query(`
    select
      (select count(*)::int from ${schemaName}.planning_lanes) as lanes,
      (select count(*)::int from ${schemaName}.planning_tasks) as tasks,
      (select count(*)::int from ${schemaName}.planning_effective_tasks where status = 'review') as "reviewTasks",
      (select count(*)::int from ${schemaName}.governance_files) as "governanceFiles",
      (select count(*)::int from ${schemaName}.governance_files where is_drift = true) as "driftFiles",
      (select count(*)::int from ${schemaName}.governance_files where is_legacy = true) as "legacyFiles",
      (select count(*)::int from ${schemaName}.governance_components) as "governanceComponents",
      (select count(*)::int from ${schemaName}.governance_component_files) as "governanceComponentFiles",
      (select count(*)::int from ${schemaName}.governance_fingerprints) as "governanceFingerprints",
      (select count(*)::int from ${schemaName}.governance_coverage) as "governanceCoverageRows",
      (select count(*)::int from ${schemaName}.governance_remediation) as "governanceRemediationTasks",
      (select count(*)::int from ${schemaName}.governance_remediation where priority = 'P0') as "governanceRemediationP0",
      (select count(*)::int from ${schemaName}.planning_task_local_state) as "planningLocalTaskOverlays",
      (select count(*)::int from ${schemaName}.planning_local_operations) as "planningLocalOperations"
  `);

  return result.rows[0];
}

async function readTaskRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'lane_id', filters.laneId);
  appendFilter(predicates, params, 'status', filters.status);
  appendFilter(predicates, params, 'claimed_by', filters.claimedBy);
  appendFilter(predicates, params, 'priority', filters.priority);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${effectiveTaskSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by lane_id, status, priority, task_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readNextTaskRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'lane_id', filters.laneId);

  const result = await client.query(
    `${effectiveTaskSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by lane_id, priority, task_id`,
    params
  );

  return buildNextTaskRows(result.rows, parseLimit(filters.limit, 20));
}

async function readHashDriftSummary(client) {
  const result = await client.query(`
    select
      (select count(*)::int from ${schemaName}.governance_file_hash_drift) as "governanceHashDrift"
  `);

  return result.rows[0];
}

function printRows(rows) {
  for (const [label, value] of rows) {
    console.log(`${label}: ${value}`);
  }
}

function printSummary(summary) {
  printRows(buildSummaryRows(summary));
}

function printHashDriftSummary(summary) {
  printRows(buildHashDriftRows(summary));
}

function printTaskRows(rows) {
  for (const row of rows) {
    console.log(row.join('\t'));
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

    if (queryName === 'hash-drift') {
      const summary = await readHashDriftSummary(client);
      if (options.print !== false) {
        printHashDriftSummary(summary);
      }
      return summary;
    }

    if (queryName === 'tasks') {
      const rows = await readTaskRows(client, options.filters || {});
      const taskRows = buildTaskRows(rows);
      if (options.print !== false) {
        printTaskRows(taskRows);
      }
      return taskRows;
    }

    if (queryName === 'next') {
      const taskRows = await readNextTaskRows(client, options.filters || {});
      if (options.print !== false) {
        printTaskRows(taskRows);
      }
      return taskRows;
    }

    throw new Error(`Unhandled planning DB query "${queryName}".`);
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function main() {
  const command = parseArgs();
  await runQuery(command);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:query] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildNextTaskRows,
  buildHashDriftRows,
  buildSummaryRows,
  buildTaskRows,
  databaseUrl,
  parseArgs,
  printHashDriftSummary,
  printSummary,
  printTaskRows,
  readNextTaskRows,
  readHashDriftSummary,
  readSummary,
  readTaskRows,
  resolveQueryName,
  runQuery,
};
