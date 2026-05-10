const crypto = require('node:crypto');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { runMigrations, schemaName } = require('./planning-db-migrate.cjs');

const allowedStatuses = new Set(['queued', 'in_progress', 'blocked', 'review', 'done']);

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function toJson(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value);
}

function requireOption(options, key) {
  const value = options[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(
      `Missing required --${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`
    );
  }

  return value;
}

function validateTaskStatus(value) {
  if (!allowedStatuses.has(value)) {
    throw new Error(
      `Invalid planning task status "${value}". Expected: ${[...allowedStatuses].join(', ')}.`
    );
  }

  return value;
}

function parseIntegerOption(value, optionName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid --${optionName} "${value}". Expected a non-negative integer.`);
  }

  return parsed;
}

function parseNonNegativeNumberOption(value, optionName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid --${optionName} "${value}". Expected a non-negative number.`);
  }

  return parsed;
}

function parseProgress(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`Invalid --progress "${value}". Expected a number between 0 and 100.`);
  }

  return parsed;
}

function parseFlagOptions(args) {
  const options = { evidence: [] };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument "${arg}". Expected --name value flags.`);
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}.`);
    }
    index += 1;

    if (key === 'evidence') {
      options.evidence.push(value);
      continue;
    }

    const camelKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    options[camelKey] = value;
  }

  return options;
}

function operationPayload(command) {
  if (command.kind === 'task_claim') {
    return {
      ttlMinutes: command.ttlMinutes ?? null,
    };
  }

  if (command.kind === 'task_release') {
    return {};
  }

  if (command.kind === 'task_update') {
    return {
      status: command.status ?? null,
      progressPct: command.progressPct ?? null,
      statusReason: normalizeOptionalText(command.statusReason),
      evidenceRefs: command.evidenceRefs || [],
    };
  }

  if (command.kind === 'task_create') {
    return {
      parentTaskId: normalizeOptionalText(command.parentTaskId),
      priority: normalizeOptionalText(command.priority),
      status: command.status,
      objective: command.objective,
      dependency: normalizeOptionalText(command.dependency),
      target: normalizeOptionalText(command.target),
      complexity: normalizeOptionalText(command.complexity),
      effortPoints: command.effortPoints ?? null,
      progressPct: command.progressPct ?? null,
      evidenceRefs: command.evidenceRefs || [],
      statusReason: normalizeOptionalText(command.statusReason),
      lastVerified: normalizeOptionalText(command.lastVerified),
    };
  }

  if (command.kind === 'task_delete') {
    return {
      statusReason: normalizeOptionalText(command.statusReason),
    };
  }

  return {};
}

function defaultIdempotencyKey(command) {
  return [
    command.kind,
    command.actor || 'anonymous',
    command.laneId || 'all',
    command.taskId || 'all',
    command.expectedRevision ?? 'latest',
    crypto
      .createHash('sha256')
      .update(JSON.stringify(operationPayload(command)))
      .digest('hex')
      .slice(0, 16),
  ].join(':');
}

function normalizeExistingPayload(payload) {
  if (payload === undefined || payload === null) {
    return {};
  }

  if (typeof payload === 'string') {
    return JSON.parse(payload);
  }

  return payload;
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function normalizeRevision(value) {
  return value === undefined || value === null ? null : Number(value);
}

function assertIdempotentReplayMatches(existingOperation, command, currentState = null) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.lane_id === command.laneId &&
    existingOperation.task_id === command.taskId &&
    normalizeRevision(existingOperation.expected_revision) ===
      normalizeRevision(command.expectedRevision) &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (!sameOperation) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" already belongs to a different planning operation.`
    );
  }

  if (currentState) {
    const resultingRevision = normalizeRevision(
      existingOperation.resulting_revision ?? existingOperation.resultingRevision
    );
    const currentRevision = normalizeRevision(currentState.revision);
    if (
      resultingRevision !== null &&
      currentRevision !== null &&
      resultingRevision !== currentRevision
    ) {
      throw new Error(
        `Idempotency key "${command.idempotencyKey}" already completed at revision ${resultingRevision}, but ${command.laneId}/${command.taskId} is now at revision ${currentRevision}. Use a new idempotency key for a new planning operation.`
      );
    }
  }
}

function parseTaskCommand(action, args) {
  const options = parseFlagOptions(args);
  const laneId = requireOption(options, 'lane');
  const taskId = requireOption(options, 'task');

  if (action === 'show') {
    return {
      kind: 'task_show',
      laneId,
      taskId,
    };
  }

  const actor = requireOption(options, 'actor');
  const expectedRevision = parseIntegerOption(options.expectedRevision, 'expected-revision');
  const ttlMinutes = parseIntegerOption(options.ttlMinutes, 'ttl-minutes') ?? 120;

  if (action === 'claim') {
    const command = {
      kind: 'task_claim',
      laneId,
      taskId,
      actor,
      ttlMinutes,
      expectedRevision,
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action === 'release') {
    const command = {
      kind: 'task_release',
      laneId,
      taskId,
      actor,
      expectedRevision,
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action === 'update') {
    const status = options.status === undefined ? undefined : validateTaskStatus(options.status);
    const progressPct = parseProgress(options.progress);
    const command = {
      kind: 'task_update',
      laneId,
      taskId,
      actor,
      status,
      progressPct,
      statusReason: options.reason,
      evidenceRefs: options.evidence,
      expectedRevision,
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action === 'create') {
    const status = options.status === undefined ? 'queued' : validateTaskStatus(options.status);
    const progressPct = parseProgress(options.progress);
    const effortPoints = parseNonNegativeNumberOption(options.effortPoints, 'effort-points');
    const command = {
      kind: 'task_create',
      laneId,
      taskId,
      actor,
      parentTaskId: options.parentTask,
      priority: options.priority,
      status,
      objective: requireOption(options, 'objective'),
      dependency: options.dependency,
      target: options.target,
      complexity: options.complexity,
      effortPoints,
      progressPct,
      statusReason: options.reason,
      evidenceRefs: options.evidence,
      lastVerified: options.lastVerified,
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action === 'delete') {
    const command = {
      kind: 'task_delete',
      laneId,
      taskId,
      actor,
      statusReason: options.reason,
      expectedRevision,
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  throw new Error(
    `Unknown planning task operation "${action}". Expected claim, release, update, create, delete, or show.`
  );
}

function parseArgs(args = process.argv.slice(2)) {
  const [resource, action, ...rest] = args;

  if (resource === 'task') {
    if (!action) {
      throw new Error(
        'Missing task operation. Expected claim, release, update, create, delete, or show.'
      );
    }

    return parseTaskCommand(action, rest);
  }

  if (resource === 'audit') {
    const options = parseFlagOptions([action, ...rest].filter(Boolean));
    return {
      kind: 'audit',
      laneId: options.lane || null,
      taskId: options.task || null,
      limit: parseIntegerOption(options.limit, 'limit') ?? 20,
    };
  }

  throw new Error('Unknown planning DB operation. Expected "task" or "audit".');
}

function normalizeState(row) {
  if (!row) {
    return null;
  }

  return {
    laneId: row.lane_id ?? row.laneId,
    taskId: row.task_id ?? row.taskId,
    sourcePath: row.source_path ?? row.sourcePath,
    baseSourceContentSha256: row.base_source_content_sha256 ?? row.baseSourceContentSha256,
    revision: Number(row.revision ?? 0),
    status: row.status,
    progressPct: row.progress_pct === undefined ? row.progressPct : row.progress_pct,
    evidenceRefs: row.evidence_refs ?? row.evidenceRefs ?? [],
    statusReason: row.status_reason ?? row.statusReason ?? null,
    claimedBy: row.claimed_by ?? row.claimedBy ?? null,
    claimToken: row.claim_token ?? row.claimToken ?? null,
    claimExpiresAt: row.claim_expires_at ?? row.claimExpiresAt ?? null,
  };
}

function buildInitialState(importedTask) {
  return {
    laneId: importedTask.laneId,
    taskId: importedTask.taskId,
    sourcePath: importedTask.sourcePath,
    baseSourceContentSha256: importedTask.sourceContentSha256,
    revision: 0,
    status: importedTask.status,
    progressPct: importedTask.progressPct ?? null,
    evidenceRefs: importedTask.evidenceRefs || [],
    statusReason: importedTask.statusReason ?? null,
    claimedBy: null,
    claimToken: null,
    claimExpiresAt: null,
  };
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function planTaskLocalOperation({ command, importedTask, currentState, operationId, now }) {
  if (!importedTask) {
    throw new Error(
      `Planning task ${command.laneId}/${command.taskId} was not imported into the planning DB.`
    );
  }

  const previous = normalizeState(currentState) || buildInitialState(importedTask);
  const expectedRevision = command.expectedRevision;
  if (
    expectedRevision !== null &&
    expectedRevision !== undefined &&
    expectedRevision !== previous.revision
  ) {
    throw new Error(
      `Stale planning task revision for ${command.laneId}/${command.taskId}: expected ${expectedRevision} but current revision is ${previous.revision}.`
    );
  }

  const resultingRevision = previous.revision + 1;
  const state = {
    ...previous,
    revision: resultingRevision,
    updatedAt: toIso(now),
  };

  if (command.kind === 'task_claim') {
    const expiresAt = new Date(new Date(now).getTime() + command.ttlMinutes * 60 * 1000);
    state.claimedBy = command.actor;
    state.claimToken = operationId;
    state.claimExpiresAt = expiresAt.toISOString();
  } else if (command.kind === 'task_release') {
    state.claimedBy = null;
    state.claimToken = null;
    state.claimExpiresAt = null;
  } else if (command.kind === 'task_update') {
    if (command.status !== undefined) {
      state.status = command.status;
    }
    if (command.progressPct !== null && command.progressPct !== undefined) {
      state.progressPct = command.progressPct;
    }
    if (command.statusReason !== undefined) {
      state.statusReason = normalizeOptionalText(command.statusReason);
    }
    if (command.evidenceRefs && command.evidenceRefs.length > 0) {
      state.evidenceRefs = command.evidenceRefs;
    }
  } else {
    throw new Error(`Unsupported local operation kind "${command.kind}".`);
  }

  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    laneId: command.laneId,
    taskId: command.taskId,
    sourcePath: importedTask.sourcePath,
    baseSourceContentSha256: importedTask.sourceContentSha256,
    expectedRevision: expectedRevision ?? null,
    previousRevision: previous.revision,
    resultingRevision,
    payload: operationPayload(command),
    createdAt: toIso(now),
  };

  return { state, audit };
}

function buildRawTaskFromCreateCommand(command) {
  const rawTask = {
    task_id: command.taskId,
    status: command.status,
    objective: command.objective,
  };

  const optionalFields = [
    ['parent_task', command.parentTaskId],
    ['priority', command.priority],
    ['dependency', command.dependency],
    ['target', command.target],
    ['complexity', command.complexity],
    ['effort_points', command.effortPoints],
    ['progress_pct', command.progressPct],
    ['status_reason', command.statusReason],
    ['last_verified', command.lastVerified],
  ];

  for (const [key, value] of optionalFields) {
    if (value !== undefined && value !== null && value !== '') {
      rawTask[key] = value;
    }
  }

  if (command.evidenceRefs && command.evidenceRefs.length > 0) {
    rawTask.evidence_refs = command.evidenceRefs;
  }

  return rawTask;
}

function buildDefinitionFromCreateCommand({ command, importedLane, now }) {
  const rawTask = buildRawTaskFromCreateCommand(command);

  return {
    laneId: command.laneId,
    taskId: command.taskId,
    sourcePath: importedLane.sourcePath,
    sourceContentSha256: importedLane.sourceContentSha256,
    parentTaskId: normalizeOptionalText(command.parentTaskId),
    priority: normalizeOptionalText(command.priority),
    status: command.status,
    objective: command.objective,
    dependency: normalizeOptionalText(command.dependency),
    target: normalizeOptionalText(command.target),
    complexity: normalizeOptionalText(command.complexity),
    effortPoints: command.effortPoints ?? null,
    progressPct: command.progressPct ?? null,
    evidenceRefs: command.evidenceRefs || [],
    statusReason: normalizeOptionalText(command.statusReason),
    lastVerified: normalizeOptionalText(command.lastVerified),
    createdBy: command.actor,
    createdAt: toIso(now),
    rawTask,
  };
}

function normalizeTaskDefinition(row) {
  if (!row) {
    return null;
  }

  return {
    laneId: row.lane_id ?? row.laneId,
    taskId: row.task_id ?? row.taskId,
    sourcePath: row.source_path ?? row.sourcePath,
    sourceContentSha256: row.source_content_sha256 ?? row.sourceContentSha256,
    parentTaskId: row.parent_task_id ?? row.parentTaskId ?? null,
    priority: row.priority ?? null,
    status: row.status,
    objective: row.objective,
    dependency: row.dependency ?? null,
    target: row.target ?? null,
    complexity: row.complexity ?? null,
    effortPoints: row.effort_points ?? row.effortPoints ?? null,
    progressPct: row.progress_pct ?? row.progressPct ?? null,
    evidenceRefs: row.evidence_refs ?? row.evidenceRefs ?? [],
    statusReason: row.status_reason ?? row.statusReason ?? null,
    lastVerified: row.last_verified ?? row.lastVerified ?? null,
    rawTask: row.raw_task ?? row.rawTask,
  };
}

function planTaskDefinitionOperation({
  command,
  importedLane,
  importedTask,
  localDefinition,
  localTombstone,
  currentState,
  operationId,
  now,
}) {
  if (localTombstone) {
    throw new Error(
      `Planning task ${command.laneId}/${command.taskId} is already deleted locally.`
    );
  }

  if (command.kind === 'task_create') {
    if (!importedLane) {
      throw new Error(`Planning lane ${command.laneId} was not imported into the planning DB.`);
    }
    if (importedTask || localDefinition) {
      throw new Error(`Planning task ${command.laneId}/${command.taskId} already exists.`);
    }

    const definition = buildDefinitionFromCreateCommand({ command, importedLane, now });
    const audit = {
      operationId,
      idempotencyKey: command.idempotencyKey,
      operationType: command.kind,
      actor: command.actor,
      laneId: command.laneId,
      taskId: command.taskId,
      sourcePath: importedLane.sourcePath,
      baseSourceContentSha256: importedLane.sourceContentSha256,
      expectedRevision: null,
      previousRevision: 0,
      resultingRevision: 0,
      payload: operationPayload(command),
      createdAt: toIso(now),
    };

    return { definition, audit };
  }

  if (command.kind === 'task_delete') {
    const effectiveTask = normalizeTaskDefinition(importedTask || localDefinition);
    if (!effectiveTask) {
      throw new Error(`Planning task ${command.laneId}/${command.taskId} does not exist.`);
    }

    const previous = {
      ...buildInitialState(effectiveTask),
      ...(normalizeState(currentState) || {}),
    };
    const expectedRevision = command.expectedRevision;
    if (
      expectedRevision !== null &&
      expectedRevision !== undefined &&
      expectedRevision !== previous.revision
    ) {
      throw new Error(
        `Stale planning task revision for ${command.laneId}/${command.taskId}: expected ${expectedRevision} but current revision is ${previous.revision}.`
      );
    }

    const resultingRevision = previous.revision + 1;
    const state = {
      ...previous,
      revision: resultingRevision,
      statusReason: normalizeOptionalText(command.statusReason),
      updatedAt: toIso(now),
    };
    const tombstone = {
      laneId: command.laneId,
      taskId: command.taskId,
      sourcePath: effectiveTask.sourcePath,
      baseSourceContentSha256: effectiveTask.sourceContentSha256,
      deletedBy: command.actor,
      deletedAt: toIso(now),
      statusReason: normalizeOptionalText(command.statusReason),
    };
    const audit = {
      operationId,
      idempotencyKey: command.idempotencyKey,
      operationType: command.kind,
      actor: command.actor,
      laneId: command.laneId,
      taskId: command.taskId,
      sourcePath: effectiveTask.sourcePath,
      baseSourceContentSha256: effectiveTask.sourceContentSha256,
      expectedRevision: expectedRevision ?? null,
      previousRevision: previous.revision,
      resultingRevision,
      payload: operationPayload(command),
      createdAt: toIso(now),
    };

    return { state, tombstone, audit };
  }

  throw new Error(`Unsupported task definition operation kind "${command.kind}".`);
}

function buildAuditRows(rows) {
  return rows.map(
    (row) =>
      `${row.created_at} ${row.operation_id} ${row.operation_type} ${row.lane_id}/${row.task_id} actor=${row.actor} expected=${row.expected_revision ?? 'null'} resulting=${row.resulting_revision}`
  );
}

async function readImportedTask(client, command) {
  const result = await client.query(
    `select
       lane_id as "laneId",
       task_id as "taskId",
       status,
       progress_pct as "progressPct",
       evidence_refs as "evidenceRefs",
       status_reason as "statusReason",
       source_path as "sourcePath",
       source_content_sha256 as "sourceContentSha256"
     from ${schemaName}.planning_tasks
     where lane_id = $1 and task_id = $2`,
    [command.laneId, command.taskId]
  );

  return result.rows[0] || null;
}

async function readImportedLane(client, command) {
  const result = await client.query(
    `select
       lane_id as "laneId",
       source_path as "sourcePath",
       source_content_sha256 as "sourceContentSha256"
     from ${schemaName}.planning_lanes
     where lane_id = $1`,
    [command.laneId]
  );

  return result.rows[0] || null;
}

async function readEffectiveTask(client, command) {
  const result = await client.query(
    `select
       lane_id as "laneId",
       task_id as "taskId",
       status,
       progress_pct as "progressPct",
       evidence_refs as "evidenceRefs",
       status_reason as "statusReason",
       source_path as "sourcePath",
       source_content_sha256 as "sourceContentSha256",
       raw_task as "rawTask"
     from ${schemaName}.planning_effective_tasks
     where lane_id = $1 and task_id = $2`,
    [command.laneId, command.taskId]
  );

  return result.rows[0] || null;
}

async function readLocalDefinition(client, command, lock = false) {
  const result = await client.query(
    `select *
     from ${schemaName}.planning_task_local_definitions
     where lane_id = $1 and task_id = $2
     ${lock ? 'for update' : ''}`,
    [command.laneId, command.taskId]
  );

  return result.rows[0] || null;
}

async function readLocalTombstone(client, command, lock = false) {
  const result = await client.query(
    `select *
     from ${schemaName}.planning_task_local_tombstones
     where lane_id = $1 and task_id = $2
     ${lock ? 'for update' : ''}`,
    [command.laneId, command.taskId]
  );

  return result.rows[0] || null;
}

async function readCurrentState(client, command, lock = false) {
  const result = await client.query(
    `select *
     from ${schemaName}.planning_task_local_state
     where lane_id = $1 and task_id = $2
     ${lock ? 'for update' : ''}`,
    [command.laneId, command.taskId]
  );

  return result.rows[0] || null;
}

async function readExistingOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from ${schemaName}.planning_local_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );

  return result.rows[0] || null;
}

async function writePlannedOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.planning_task_local_state
      (lane_id, task_id, source_path, base_source_content_sha256, revision, status,
       progress_pct, evidence_refs, status_reason, claimed_by, claim_token,
       claim_expires_at, updated_at, raw_overlay)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14::jsonb)
     on conflict (lane_id, task_id) do update set
       source_path = excluded.source_path,
       base_source_content_sha256 = excluded.base_source_content_sha256,
       revision = excluded.revision,
       status = excluded.status,
       progress_pct = excluded.progress_pct,
       evidence_refs = excluded.evidence_refs,
       status_reason = excluded.status_reason,
       claimed_by = excluded.claimed_by,
       claim_token = excluded.claim_token,
       claim_expires_at = excluded.claim_expires_at,
       updated_at = excluded.updated_at,
       raw_overlay = excluded.raw_overlay`,
    [
      planned.state.laneId,
      planned.state.taskId,
      planned.state.sourcePath,
      planned.state.baseSourceContentSha256,
      planned.state.revision,
      planned.state.status,
      planned.state.progressPct,
      toJson(planned.state.evidenceRefs),
      planned.state.statusReason,
      planned.state.claimedBy,
      planned.state.claimToken,
      planned.state.claimExpiresAt,
      planned.state.updatedAt,
      toJson(planned.state),
    ]
  );

  await client.query(
    `insert into ${schemaName}.planning_local_operations
      (operation_id, idempotency_key, operation_type, actor, lane_id, task_id,
       source_path, base_source_content_sha256, expected_revision, previous_revision,
       resulting_revision, payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.laneId,
      planned.audit.taskId,
      planned.audit.sourcePath,
      planned.audit.baseSourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function writePlannedDefinitionOperation(client, planned) {
  if (planned.state) {
    await client.query(
      `insert into ${schemaName}.planning_task_local_state
        (lane_id, task_id, source_path, base_source_content_sha256, revision, status,
         progress_pct, evidence_refs, status_reason, claimed_by, claim_token,
         claim_expires_at, updated_at, raw_overlay)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14::jsonb)
       on conflict (lane_id, task_id) do update set
         source_path = excluded.source_path,
         base_source_content_sha256 = excluded.base_source_content_sha256,
         revision = excluded.revision,
         status = excluded.status,
         progress_pct = excluded.progress_pct,
         evidence_refs = excluded.evidence_refs,
         status_reason = excluded.status_reason,
         claimed_by = excluded.claimed_by,
         claim_token = excluded.claim_token,
         claim_expires_at = excluded.claim_expires_at,
         updated_at = excluded.updated_at,
         raw_overlay = excluded.raw_overlay`,
      [
        planned.state.laneId,
        planned.state.taskId,
        planned.state.sourcePath,
        planned.state.baseSourceContentSha256,
        planned.state.revision,
        planned.state.status,
        planned.state.progressPct,
        toJson(planned.state.evidenceRefs),
        planned.state.statusReason,
        planned.state.claimedBy,
        planned.state.claimToken,
        planned.state.claimExpiresAt,
        planned.state.updatedAt,
        toJson(planned.state),
      ]
    );
  }

  if (planned.definition) {
    await client.query(
      `insert into ${schemaName}.planning_task_local_definitions
        (lane_id, task_id, source_path, source_content_sha256, parent_task_id, priority,
         status, objective, dependency, target, complexity, effort_points, progress_pct,
         evidence_refs, status_reason, last_verified, created_by, created_at, raw_task)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
               $14::jsonb, $15, $16, $17, $18, $19::jsonb)`,
      [
        planned.definition.laneId,
        planned.definition.taskId,
        planned.definition.sourcePath,
        planned.definition.sourceContentSha256,
        planned.definition.parentTaskId,
        planned.definition.priority,
        planned.definition.status,
        planned.definition.objective,
        planned.definition.dependency,
        planned.definition.target,
        planned.definition.complexity,
        planned.definition.effortPoints,
        planned.definition.progressPct,
        toJson(planned.definition.evidenceRefs),
        planned.definition.statusReason,
        planned.definition.lastVerified,
        planned.definition.createdBy,
        planned.definition.createdAt,
        toJson(planned.definition.rawTask),
      ]
    );
  }

  if (planned.tombstone) {
    await client.query(
      `insert into ${schemaName}.planning_task_local_tombstones
        (lane_id, task_id, source_path, base_source_content_sha256, deleted_by,
         deleted_at, status_reason)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        planned.tombstone.laneId,
        planned.tombstone.taskId,
        planned.tombstone.sourcePath,
        planned.tombstone.baseSourceContentSha256,
        planned.tombstone.deletedBy,
        planned.tombstone.deletedAt,
        planned.tombstone.statusReason,
      ]
    );
  }

  await client.query(
    `insert into ${schemaName}.planning_local_operations
      (operation_id, idempotency_key, operation_type, actor, lane_id, task_id,
       source_path, base_source_content_sha256, expected_revision, previous_revision,
       resulting_revision, payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.laneId,
      planned.audit.taskId,
      planned.audit.sourcePath,
      planned.audit.baseSourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function applyTaskLocalOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    await client.query('begin');

    const existing = await readExistingOperation(client, command.idempotencyKey);
    if (existing) {
      const currentState = await readCurrentState(client, command);
      assertIdempotentReplayMatches(existing, command, currentState);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    if (command.kind === 'task_create' || command.kind === 'task_delete') {
      const importedLane =
        command.kind === 'task_create' ? await readImportedLane(client, command) : null;
      const importedTask =
        command.kind === 'task_create'
          ? await readImportedTask(client, command)
          : await readEffectiveTask(client, command);
      const localDefinition = await readLocalDefinition(client, command, true);
      const localTombstone = await readLocalTombstone(client, command, true);
      const currentState =
        command.kind === 'task_delete' ? await readCurrentState(client, command, true) : null;
      const planned = planTaskDefinitionOperation({
        command,
        importedLane,
        importedTask,
        localDefinition,
        localTombstone,
        currentState,
        operationId: options.operationId || crypto.randomUUID(),
        now: options.now || new Date(),
      });

      await writePlannedDefinitionOperation(client, planned);
      await client.query('commit');
      return { idempotent: false, ...planned };
    }

    const importedTask = await readEffectiveTask(client, command);
    const currentState = await readCurrentState(client, command, true);
    const planned = planTaskLocalOperation({
      command,
      importedTask,
      currentState,
      operationId: options.operationId || crypto.randomUUID(),
      now: options.now || new Date(),
    });

    await writePlannedOperation(client, planned);
    await client.query('commit');
    return { idempotent: false, ...planned };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function showTask(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    const importedTask = await readImportedTask(client, command);
    const effectiveTask = await readEffectiveTask(client, command);
    const currentState = await readCurrentState(client, command);
    const localDefinition = await readLocalDefinition(client, command);
    const localTombstone = await readLocalTombstone(client, command);
    return {
      importedTask,
      effectiveTask,
      localDefinition: normalizeTaskDefinition(localDefinition),
      localTombstone,
      localState: normalizeState(currentState),
    };
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function readAudit(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    const params = [];
    const predicates = [];
    if (command.laneId) {
      params.push(command.laneId);
      predicates.push(`lane_id = $${params.length}`);
    }
    if (command.taskId) {
      params.push(command.taskId);
      predicates.push(`task_id = $${params.length}`);
    }
    params.push(command.limit);

    const result = await client.query(
      `select
         operation_id,
         operation_type,
         actor,
         lane_id,
         task_id,
         expected_revision,
         resulting_revision,
         created_at::text
       from ${schemaName}.planning_local_operations
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by created_at desc, operation_id desc
       limit $${params.length}`,
      params
    );

    return result.rows;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

function printOperationResult(result) {
  if (result.idempotent) {
    console.log(
      `[planning:db:operate] idempotent operation=${result.audit.operation_id} resultingRevision=${result.audit.resulting_revision}`
    );
    return;
  }

  console.log(
    `[planning:db:operate] ${result.audit.operationType} ${result.audit.laneId}/${result.audit.taskId} revision=${result.audit.resultingRevision}`
  );
}

async function main() {
  const command = parseArgs();

  if (command.kind === 'task_show') {
    const task = await showTask(command);
    console.log(JSON.stringify(task, null, 2));
    return;
  }

  if (command.kind === 'audit') {
    const rows = await readAudit(command);
    for (const row of buildAuditRows(rows)) {
      console.log(row);
    }
    return;
  }

  const result = await applyTaskLocalOperation(command);
  printOperationResult(result);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:operate] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  applyTaskLocalOperation,
  assertIdempotentReplayMatches,
  buildAuditRows,
  databaseUrl,
  parseArgs,
  planTaskDefinitionOperation,
  planTaskLocalOperation,
  readAudit,
  showTask,
  validateTaskStatus,
};
