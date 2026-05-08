const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { schemaName } = require('./planning-db-migrate.cjs');

const knownQueries = new Set([
  'summary',
  'hash-drift',
  'tasks',
  'open',
  'next',
  'files',
  'components',
  'coverage',
  'remediation',
  'drift',
]);

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
    if (arg === '--component') {
      filters.component = value;
      continue;
    }
    if (arg === '--root') {
      filters.rootUnit = value;
      continue;
    }
    if (arg === '--domain') {
      filters.domainUnit = value;
      continue;
    }
    if (arg === '--path') {
      filters.path = value;
      continue;
    }
    if (arg === '--state') {
      filters.governanceState = value;
      continue;
    }
    if (arg === '--kind') {
      filters.kind = value;
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

function compactText(value) {
  return String(value ?? '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function flagLabel(value, label) {
  return value ? label : '-';
}

function buildGovernanceFileRows(rows) {
  return rows.map((row) => [
    row.path,
    row.component_unit ?? row.componentUnit,
    row.owning_unit ?? row.owningUnit,
    row.governance_state ?? row.governanceState,
    flagLabel(row.is_drift ?? row.isDrift, 'drift'),
    flagLabel(row.is_legacy ?? row.isLegacy, 'legacy'),
  ]);
}

function buildGovernanceComponentRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    row.file_count ?? row.fileCount,
    row.governance_state ?? row.governanceState,
    flagLabel(row.is_drift ?? row.isDrift, 'drift'),
    flagLabel(row.is_legacy ?? row.isLegacy, 'legacy'),
    row.ddd_owner ?? row.dddOwner ?? '-',
  ]);
}

function buildGovernanceCoverageRows(rows) {
  return rows.map((row) => [
    row.coverage_kind ?? row.coverageKind,
    row.name,
    row.count_value ?? row.countValue ?? '-',
    row.file_count ?? row.fileCount ?? '-',
    row.component_id ?? row.componentId ?? '-',
  ]);
}

function buildGovernanceRemediationRows(rows) {
  return rows.map((row) => [
    row.priority,
    row.task_id ?? row.taskId,
    row.component_unit ?? row.componentUnit,
    row.file_count ?? row.fileCount,
    compactText(row.reason),
  ]);
}

function buildGovernanceDriftRows(rows) {
  return rows.map((row) => [
    row.path,
    row.component_unit ?? row.componentUnit,
    row.owning_unit ?? row.owningUnit,
    (row.drift_fields ?? row.driftFields ?? []).join(','),
  ]);
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

function openTaskSelect() {
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
    from ${schemaName}.planning_open_tasks`;
}

function nextTaskSelect() {
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
    from ${schemaName}.planning_next_tasks`;
}

function governanceFileSelect() {
  return `
    select
      path,
      component_unit,
      owning_unit,
      root_unit,
      domain_unit,
      governance_state,
      is_drift,
      is_legacy,
      ddd_owner,
      cq_rails
    from ${schemaName}.governance_file_query`;
}

function governanceComponentSelect() {
  return `
    select
      component_id,
      name,
      level,
      root_unit,
      domain_unit,
      status,
      governance_state,
      is_drift,
      is_legacy,
      children_required,
      file_count,
      ddd_owner,
      cq_rails
    from ${schemaName}.governance_component_query`;
}

function governanceCoverageSelect() {
  return `
    select
      coverage_id,
      coverage_kind,
      name,
      count_value,
      file_count,
      component_id
    from ${schemaName}.governance_coverage_query`;
}

function governanceRemediationSelect() {
  return `
    select
      task_id,
      task_type,
      priority,
      component_unit,
      root_unit,
      domain_unit,
      ddd_owner,
      cq_rails,
      blocking,
      reason,
      file_count,
      document_count
    from ${schemaName}.governance_remediation_query`;
}

function governanceDriftSelect() {
  return `
    select
      path,
      component_unit,
      owning_unit,
      root_unit,
      domain_unit,
      drift_fields
    from ${schemaName}.governance_drift_query`;
}

function nextTaskOrderBy() {
  return `
     order by
      case
        when priority ~* '^P?[0-9]+$' then regexp_replace(priority, '^P', '', 'i')::int
        else 9
      end,
      task_id`;
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

async function readOpenTaskRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'lane_id', filters.laneId);
  appendFilter(predicates, params, 'status', filters.status);
  appendFilter(predicates, params, 'claimed_by', filters.claimedBy);
  appendFilter(predicates, params, 'priority', filters.priority);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${openTaskSelect()}
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
  appendFilter(predicates, params, 'status', filters.status);
  appendFilter(predicates, params, 'claimed_by', filters.claimedBy);
  appendFilter(predicates, params, 'priority', filters.priority);

  const limit = parseLimit(filters.limit, 20);
  params.push(limit);

  const result = await client.query(
    `${nextTaskSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     ${nextTaskOrderBy()}
     limit $${params.length}`,
    params
  );

  return buildTaskRows(result.rows);
}

function appendGovernanceFileFilters(predicates, params, filters = {}) {
  appendFilter(predicates, params, 'component_unit', filters.component);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);
  appendFilter(predicates, params, 'governance_state', filters.governanceState);
  appendFilter(predicates, params, 'path', filters.path);
}

function appendGovernanceComponentFilters(predicates, params, filters = {}) {
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);
  appendFilter(predicates, params, 'governance_state', filters.governanceState);
}

async function readGovernanceFileRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendGovernanceFileFilters(predicates, params, filters);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceFileSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by is_drift desc, component_unit, path
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readGovernanceComponentRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendGovernanceComponentFilters(predicates, params, filters);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceComponentSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by file_count desc, component_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readGovernanceCoverageRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'coverage_kind', filters.kind);
  appendFilter(predicates, params, 'component_id', filters.component);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceCoverageSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by coverage_kind, name
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readGovernanceRemediationRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'priority', filters.priority);
  appendFilter(predicates, params, 'component_unit', filters.component);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);
  appendFilter(predicates, params, 'task_type', filters.kind);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceRemediationSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
      case
        when priority ~* '^P?[0-9]+$' then regexp_replace(priority, '^P', '', 'i')::int
        else 9
      end,
      task_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readGovernanceDriftRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendGovernanceFileFilters(predicates, params, filters);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceDriftSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_unit, path
     limit $${params.length}`,
    params
  );

  return result.rows;
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

    if (queryName === 'open') {
      const rows = await readOpenTaskRows(client, options.filters || {});
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

    if (queryName === 'files') {
      const rows = await readGovernanceFileRows(client, options.filters || {});
      const fileRows = buildGovernanceFileRows(rows);
      if (options.print !== false) {
        printTaskRows(fileRows);
      }
      return fileRows;
    }

    if (queryName === 'components') {
      const rows = await readGovernanceComponentRows(client, options.filters || {});
      const componentRows = buildGovernanceComponentRows(rows);
      if (options.print !== false) {
        printTaskRows(componentRows);
      }
      return componentRows;
    }

    if (queryName === 'coverage') {
      const rows = await readGovernanceCoverageRows(client, options.filters || {});
      const coverageRows = buildGovernanceCoverageRows(rows);
      if (options.print !== false) {
        printTaskRows(coverageRows);
      }
      return coverageRows;
    }

    if (queryName === 'remediation') {
      const rows = await readGovernanceRemediationRows(client, options.filters || {});
      const remediationRows = buildGovernanceRemediationRows(rows);
      if (options.print !== false) {
        printTaskRows(remediationRows);
      }
      return remediationRows;
    }

    if (queryName === 'drift') {
      const rows = await readGovernanceDriftRows(client, options.filters || {});
      const driftRows = buildGovernanceDriftRows(rows);
      if (options.print !== false) {
        printTaskRows(driftRows);
      }
      return driftRows;
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
  buildGovernanceComponentRows,
  buildGovernanceCoverageRows,
  buildGovernanceDriftRows,
  buildGovernanceFileRows,
  buildGovernanceRemediationRows,
  buildHashDriftRows,
  buildSummaryRows,
  buildTaskRows,
  databaseUrl,
  parseArgs,
  printHashDriftSummary,
  readGovernanceComponentRows,
  readGovernanceCoverageRows,
  readGovernanceDriftRows,
  readGovernanceFileRows,
  readGovernanceRemediationRows,
  readOpenTaskRows,
  printSummary,
  printTaskRows,
  readNextTaskRows,
  readHashDriftSummary,
  readSummary,
  readTaskRows,
  resolveQueryName,
  runQuery,
};
