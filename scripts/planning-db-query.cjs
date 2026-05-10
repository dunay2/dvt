/**
 * @file scripts/planning-db-query.cjs
 * @baseline ADR-0055: Planning DB canonical operational source
 * @decision Expose DB-owned planning and governance read models through one operator query command.
 * @consequence Planning workboard and next-task reads consume normalized DB views instead of
 *   reparsing lane YAML as the operational source.
 * @version 1.0.0
 */
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { schemaName } = require('./planning-db-migrate.cjs');

const knownQueries = new Set([
  'summary',
  'hash-drift',
  'tasks',
  'open',
  'next',
  'dependencies',
  'evidence',
  'status-events',
  'artifacts',
  'files',
  'components',
  'coverage',
  'remediation',
  'drift',
  'commands',
  'pr-readiness',
  'docs-disposition',
  'task-references',
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
    if (arg === '--command-domain') {
      filters.commandDomain = value;
      continue;
    }
    if (arg === '--type') {
      filters.type = value;
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
    if (arg === '--prefix') {
      filters.prefix = value;
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
    ['planning.source_authority', summary.sourceAuthority || 'database'],
    ['planning.lanes', summary.lanes],
    ['planning.tasks', summary.tasks],
    ['planning.tasks.review', summary.reviewTasks],
    ['planning.task_dependencies', summary.planningTaskDependencies],
    ['planning.task_evidence_refs', summary.planningTaskEvidenceRefs],
    ['planning.task_status_events', summary.planningTaskStatusEvents],
    ['planning.artifacts', summary.planningArtifacts],
    ['repository.commands', summary.repositoryCommands],
    ['repository.commands.unknown', summary.repositoryCommandUnknown],
    ['repository.commands.runtime_fanout', summary.repositoryCommandRuntimeFanout],
    ['repository.pr_readiness', summary.prReadinessChecks],
    ['repository.pr_readiness.blocking', summary.prReadinessBlocking],
    ['docs.disposition_documents', summary.docsDispositionDocuments],
    ['docs.disposition_actions', summary.docsDispositionActions],
    ['docs.task_like_references', summary.docsTaskLikeReferences],
    ['docs.task_like_references.unknown', summary.docsTaskLikeReferencesUnknown],
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

function buildPlanningDependencyRows(rows) {
  return rows.map((row) => [
    row.lane_id ?? row.laneId,
    row.task_id ?? row.taskId,
    row.dependency_order ?? row.dependencyOrder,
    row.dependency_task_id ?? row.dependencyTaskId,
    compactText(row.dependency_text ?? row.dependencyText),
  ]);
}

function buildPlanningEvidenceRows(rows) {
  return rows.map((row) => [
    row.lane_id ?? row.laneId,
    row.task_id ?? row.taskId,
    row.evidence_order ?? row.evidenceOrder,
    row.evidence_ref ?? row.evidenceRef,
  ]);
}

function buildPlanningStatusEventRows(rows) {
  return rows.map((row) => [
    row.event_kind ?? row.eventKind,
    row.lane_id ?? row.laneId,
    row.task_id ?? row.taskId,
    row.status ?? '-',
    row.actor ?? '-',
  ]);
}

function buildPlanningArtifactRows(rows) {
  return rows.map((row) => [
    row.artifact_kind ?? row.artifactKind,
    row.artifact_path ?? row.artifactPath,
    row.content_sha256 ?? row.contentSha256 ?? '-',
  ]);
}

function buildRepositoryCommandRows(rows) {
  return rows.map((row) => [
    row.command_type ?? row.commandType,
    row.command_name ?? row.commandName ?? row.command_path ?? row.commandPath,
    row.domain,
    row.sensitivity,
    flagLabel(row.runtime_fanout ?? row.runtimeFanout, 'runtime-fanout'),
    row.referenced_file_count ?? row.referencedFileCount ?? 0,
  ]);
}

function joinJsonArray(value) {
  const values = Array.isArray(value) ? value : [];
  return values.length > 0 ? values.join(',') : '-';
}

function buildPrReadinessRows(rows) {
  return rows.map((row) => [
    row.readiness_id ?? row.readinessId,
    row.effective_arc_level ?? row.effectiveArcLevel,
    row.blocking ? 'blocking' : 'ready',
    row.trigger_count ?? row.triggerCount ?? 0,
    joinJsonArray(row.missing_requirements ?? row.missingRequirements),
    `evidence:${row.evidence_doc_status ?? row.evidenceDocStatus ?? '-'}`,
    `risk:${row.risk_update_status ?? row.riskUpdateStatus ?? '-'}`,
    joinJsonArray(row.required_checks ?? row.requiredChecks),
  ]);
}

function buildDocsDispositionRows(rows) {
  return rows.map((row) => [
    row.priority,
    row.action_kind ?? row.actionKind,
    row.document_path ?? row.documentPath,
    row.reference_text ?? row.referenceText ?? '-',
    compactText(row.reason),
  ]);
}

function buildTaskReferenceRows(rows) {
  return rows.map((row) => [
    row.classification,
    row.reference_text ?? row.referenceText,
    row.reference_prefix ?? row.referencePrefix,
    row.document_path ?? row.documentPath,
    row.occurrence_count ?? row.occurrenceCount ?? 0,
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

function planningDependencySelect() {
  return `
    select
      lane_id,
      task_id,
      dependency_order,
      dependency_task_id,
      dependency_text
    from ${schemaName}.planning_task_dependencies`;
}

function planningEvidenceSelect() {
  return `
    select
      lane_id,
      task_id,
      evidence_order,
      evidence_ref
    from ${schemaName}.planning_task_evidence_refs`;
}

function planningStatusEventSelect() {
  return `
    select
      event_id,
      event_kind,
      lane_id,
      task_id,
      status,
      actor,
      occurred_at
    from ${schemaName}.planning_task_status_events`;
}

function planningArtifactSelect() {
  return `
    select
      artifact_path,
      artifact_kind,
      content_sha256,
      source_content_sha256,
      exported_at
    from ${schemaName}.planning_artifacts`;
}

function repositoryCommandSelect() {
  return `
    select
      command_id,
      command_type,
      command_name,
      command_path,
      command_text,
      domain,
      sensitivity,
      runtime_fanout,
      changed_file_validation_relevant,
      referenced_file_count,
      source_path,
      source_content_sha256,
      imported_at
    from ${schemaName}.repository_command_query`;
}

function prReadinessSelect() {
  return `
    select
      readiness_id,
      base_ref,
      head_ref,
      effective_arc_level,
      is_arc,
      blocking,
      trigger_count,
      missing_requirements,
      evidence_doc_status,
      risk_update_status,
      required_checks,
      recommended_guides,
      changed_file_count,
      evidence_doc_count,
      risk_update_count,
      source_path,
      source_content_sha256,
      imported_at
    from ${schemaName}.pr_readiness_query`;
}

function docsDispositionActionSelect() {
  return `
    select
      action_id,
      priority,
      action_kind,
      document_path,
      document_status,
      planning_type,
      is_active,
      reference_text,
      reason,
      blocking,
      evidence,
      source_content_sha256,
      raw_action,
      imported_at
    from ${schemaName}.doc_disposition_action_query`;
}

function taskReferenceSelect() {
  return `
    select
      reference_id,
      document_path,
      reference_text,
      reference_prefix,
      classification,
      registered_planning_task,
      occurrence_count,
      sample_lines,
      source_content_sha256,
      raw_reference,
      imported_at
    from ${schemaName}.doc_task_reference_query`;
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
      'database'::text as "sourceAuthority",
      (select count(*)::int from ${schemaName}.planning_lanes) as lanes,
      (select count(*)::int from ${schemaName}.planning_tasks) as tasks,
      (select count(*)::int from ${schemaName}.planning_effective_tasks where status = 'review') as "reviewTasks",
      (select count(*)::int from ${schemaName}.planning_task_dependencies) as "planningTaskDependencies",
      (select count(*)::int from ${schemaName}.planning_task_evidence_refs) as "planningTaskEvidenceRefs",
      (select count(*)::int from ${schemaName}.planning_task_status_events) as "planningTaskStatusEvents",
      (select count(*)::int from ${schemaName}.planning_artifacts) as "planningArtifacts",
      (select count(*)::int from ${schemaName}.repository_commands) as "repositoryCommands",
      (select count(*)::int from ${schemaName}.repository_commands where domain = 'unknown') as "repositoryCommandUnknown",
      (select count(*)::int from ${schemaName}.repository_commands where runtime_fanout = true) as "repositoryCommandRuntimeFanout",
      (select count(*)::int from ${schemaName}.pr_readiness_checks) as "prReadinessChecks",
      (select count(*)::int from ${schemaName}.pr_readiness_checks where blocking = true) as "prReadinessBlocking",
      (select count(*)::int from ${schemaName}.doc_disposition_documents) as "docsDispositionDocuments",
      (select count(*)::int from ${schemaName}.doc_disposition_actions) as "docsDispositionActions",
      (select count(*)::int from ${schemaName}.doc_task_like_references) as "docsTaskLikeReferences",
      (select count(*)::int from ${schemaName}.doc_task_like_references where classification = 'unknown_task_like_id') as "docsTaskLikeReferencesUnknown",
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

async function readPlanningDependencyRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'lane_id', filters.laneId);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${planningDependencySelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by lane_id, task_id, dependency_order
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readPlanningEvidenceRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'lane_id', filters.laneId);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${planningEvidenceSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by lane_id, task_id, evidence_order
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readPlanningStatusEventRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'lane_id', filters.laneId);
  appendFilter(predicates, params, 'status', filters.status);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${planningStatusEventSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by occurred_at desc, lane_id, task_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readPlanningArtifactRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'artifact_kind', filters.kind);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${planningArtifactSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by artifact_kind, artifact_path
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readRepositoryCommandRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'domain', filters.commandDomain);
  appendFilter(predicates, params, 'command_type', filters.type);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${repositoryCommandSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by runtime_fanout desc, domain, command_type, coalesce(command_name, command_path)
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readPrReadinessRows(client, filters = {}) {
  const params = [];
  const limit = parseLimit(filters.limit, 20);
  params.push(limit);

  const result = await client.query(
    `${prReadinessSelect()}
     order by blocking desc, readiness_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readDocsDispositionRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'priority', filters.priority);
  appendFilter(predicates, params, 'action_kind', filters.kind);
  appendFilter(predicates, params, 'document_path', filters.path);
  appendFilter(predicates, params, 'document_status', filters.status);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${docsDispositionActionSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
      case
        when priority ~* '^P?[0-9]+$' then regexp_replace(priority, '^P', '', 'i')::int
        else 9
      end,
      action_kind,
      document_path,
      reference_text
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readTaskReferenceRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'classification', filters.kind);
  appendFilter(predicates, params, 'reference_prefix', filters.prefix);
  appendFilter(predicates, params, 'document_path', filters.path);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${taskReferenceSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
      case when classification = 'unknown_task_like_id' then 0 else 1 end,
      occurrence_count desc,
      reference_text,
      document_path
     limit $${params.length}`,
    params
  );

  return result.rows;
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

    if (queryName === 'dependencies') {
      const rows = await readPlanningDependencyRows(client, options.filters || {});
      const dependencyRows = buildPlanningDependencyRows(rows);
      if (options.print !== false) {
        printTaskRows(dependencyRows);
      }
      return dependencyRows;
    }

    if (queryName === 'evidence') {
      const rows = await readPlanningEvidenceRows(client, options.filters || {});
      const evidenceRows = buildPlanningEvidenceRows(rows);
      if (options.print !== false) {
        printTaskRows(evidenceRows);
      }
      return evidenceRows;
    }

    if (queryName === 'status-events') {
      const rows = await readPlanningStatusEventRows(client, options.filters || {});
      const eventRows = buildPlanningStatusEventRows(rows);
      if (options.print !== false) {
        printTaskRows(eventRows);
      }
      return eventRows;
    }

    if (queryName === 'artifacts') {
      const rows = await readPlanningArtifactRows(client, options.filters || {});
      const artifactRows = buildPlanningArtifactRows(rows);
      if (options.print !== false) {
        printTaskRows(artifactRows);
      }
      return artifactRows;
    }

    if (queryName === 'commands') {
      const rows = await readRepositoryCommandRows(client, options.filters || {});
      const commandRows = buildRepositoryCommandRows(rows);
      if (options.print !== false) {
        printTaskRows(commandRows);
      }
      return commandRows;
    }

    if (queryName === 'pr-readiness') {
      const rows = await readPrReadinessRows(client, options.filters || {});
      const readinessRows = buildPrReadinessRows(rows);
      if (options.print !== false) {
        printTaskRows(readinessRows);
      }
      return readinessRows;
    }

    if (queryName === 'docs-disposition') {
      const rows = await readDocsDispositionRows(client, options.filters || {});
      const dispositionRows = buildDocsDispositionRows(rows);
      if (options.print !== false) {
        printTaskRows(dispositionRows);
      }
      return dispositionRows;
    }

    if (queryName === 'task-references') {
      const rows = await readTaskReferenceRows(client, options.filters || {});
      const referenceRows = buildTaskReferenceRows(rows);
      if (options.print !== false) {
        printTaskRows(referenceRows);
      }
      return referenceRows;
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

function queryErrorDetails(error) {
  const details = [];
  const nestedErrors = Array.isArray(error && error.errors) ? error.errors : [];
  for (const nestedError of nestedErrors) {
    const nestedMessage =
      nestedError && (nestedError.message || nestedError.code || nestedError.name);
    if (nestedMessage) {
      details.push(String(nestedMessage));
    }
  }

  const cause = error && error.cause;
  const causeMessage = cause && (cause.message || cause.code || cause.name);
  if (causeMessage) {
    details.push(String(causeMessage));
  }

  const directMessage = error && (error.message || error.code || error.name);
  if (directMessage) {
    details.push(String(directMessage));
  }

  return [...new Set(details)];
}

function formatQueryError(error) {
  const details = queryErrorDetails(error);
  const hasConnectionRefusal =
    (error && error.code === 'ECONNREFUSED') ||
    details.some((detail) => /ECONNREFUSED|connection refused/i.test(detail));

  if (hasConnectionRefusal) {
    return [
      'Planning DB is unavailable.',
      'Run `pnpm planning:db:up`, then `pnpm planning:db:migrate` and `pnpm planning:db:import` if the database has not been seeded.',
      `Details: ${details.join('; ')}`,
    ].join(' ');
  }

  return details[0] || String(error);
}

async function main() {
  const command = parseArgs();
  await runQuery(command);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:query] ${formatQueryError(error)}`);
    process.exit(1);
  });
}

module.exports = {
  buildDocsDispositionRows,
  buildGovernanceComponentRows,
  buildGovernanceCoverageRows,
  buildGovernanceDriftRows,
  buildGovernanceFileRows,
  buildGovernanceRemediationRows,
  buildHashDriftRows,
  buildPlanningArtifactRows,
  buildPlanningDependencyRows,
  buildPlanningEvidenceRows,
  buildPlanningStatusEventRows,
  buildPrReadinessRows,
  buildRepositoryCommandRows,
  buildSummaryRows,
  buildTaskRows,
  buildTaskReferenceRows,
  databaseUrl,
  formatQueryError,
  parseArgs,
  printHashDriftSummary,
  readDocsDispositionRows,
  readGovernanceComponentRows,
  readGovernanceCoverageRows,
  readGovernanceDriftRows,
  readGovernanceFileRows,
  readGovernanceRemediationRows,
  readPlanningArtifactRows,
  readPlanningDependencyRows,
  readPlanningEvidenceRows,
  readPlanningStatusEventRows,
  readPrReadinessRows,
  readRepositoryCommandRows,
  readOpenTaskRows,
  printSummary,
  printTaskRows,
  readNextTaskRows,
  readHashDriftSummary,
  readSummary,
  readTaskRows,
  readTaskReferenceRows,
  resolveQueryName,
  runQuery,
};
