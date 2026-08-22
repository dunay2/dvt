/** Owned concern: record governance refresh executions through a DB-first command rail. */
const { randomUuidV4, sha256HexUtf8 } = require('@dvt/crypto');

const { Client } = require('pg');

const { defaultPgUrl } = require('../planning-db-run.cjs');
const { assertPlanningDbCurrentSchemaReady, schemaName } = require('../planning-db-schema.cjs');

const allowedRunStates = new Set(['accepted', 'passed', 'failed']);
const defaultCommandName = 'pnpm governance:refresh';

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function toJson(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function stableHash(parts) {
  return sha256HexUtf8(parts.join('\0'));
}

function normalizeOptionalText(value, fallback = '') {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : fallback;
}

function assertSha256(value, label) {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase sha256 hex digest.`);
  }
}

function validateRunState(value) {
  if (!allowedRunStates.has(value)) {
    throw new Error(
      `Invalid governance refresh run state "${value}". Expected: ${[...allowedRunStates].join(', ')}.`
    );
  }
  return value;
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, label) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

function stageScriptWasObserved(observedScripts, offset, stageScript) {
  return observedScripts[offset] === stageScript;
}

function buildStageRunId({ runId, stageGroup, passNumber, stageIndex, stageId }) {
  return stableHash([runId, stageGroup, String(passNumber), String(stageIndex), stageId]).slice(
    0,
    32
  );
}

function buildStageRow({ runId, stageGroup, passNumber, stageIndex, stage, stageState, now }) {
  return {
    stageRunId: buildStageRunId({
      runId,
      stageGroup,
      passNumber,
      stageIndex,
      stageId: stage.id,
    }),
    runId,
    stageGroup,
    passNumber,
    stageIndex,
    stageId: stage.id,
    stageScript: stage.script,
    args: stage.args || [],
    env: stage.env || {},
    stageState,
    recordedAt: toIso(now),
    metadata: {},
  };
}

function buildGovernanceRefreshStageRunRows({ runId, stages, result, now = new Date() }) {
  const generationPasses = parseNonNegativeInteger(
    result?.generationPasses ?? 0,
    'generationPasses'
  );
  const generationStagesRun = Array.isArray(result?.generationStagesRun)
    ? result.generationStagesRun
    : [];
  const databaseStagesRun = Array.isArray(result?.databaseStagesRun)
    ? result.databaseStagesRun
    : [];
  const generationStages = Array.isArray(stages?.generationStages) ? stages.generationStages : [];
  const databaseStages = Array.isArray(stages?.databaseStages) ? stages.databaseStages : [];
  const rows = [];

  for (let passIndex = 0; passIndex < generationPasses; passIndex += 1) {
    for (const [stageIndex, stage] of generationStages.entries()) {
      const observedOffset = passIndex * generationStages.length + stageIndex;
      rows.push(
        buildStageRow({
          runId,
          stageGroup: 'generation',
          passNumber: passIndex + 1,
          stageIndex: stageIndex + 1,
          stage,
          stageState: stageScriptWasObserved(generationStagesRun, observedOffset, stage.script)
            ? 'passed'
            : 'skipped',
          now,
        })
      );
    }
  }

  for (const [stageIndex, stage] of databaseStages.entries()) {
    rows.push(
      buildStageRow({
        runId,
        stageGroup: 'database',
        passNumber: 1,
        stageIndex: stageIndex + 1,
        stage,
        stageState: stageScriptWasObserved(databaseStagesRun, stageIndex, stage.script)
          ? 'passed'
          : 'skipped',
        now,
      })
    );
  }

  return rows;
}

function buildOperationPayload(command) {
  return {
    runId: command.runId,
    runState: command.runState,
    commandName: command.commandName || defaultCommandName,
    sourceRef: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    maxPasses: command.maxPasses,
    generationPasses: command.generationPasses,
    stabilized: command.stabilized,
    errorSummary: command.errorSummary || '',
  };
}

function defaultGovernanceRefreshRunIdempotencyKey(command) {
  return [
    'governance_refresh_run_record',
    command.actor || 'anonymous',
    command.runId,
    command.runState,
    stableHash([JSON.stringify(buildOperationPayload(command))]).slice(0, 16),
  ].join(':');
}

function normalizeExistingRun(row) {
  if (!row) {
    return null;
  }
  return {
    runId: row.run_id ?? row.runId,
    revision: Number(row.revision ?? 0),
  };
}

function planGovernanceRefreshRunRecordOperation({
  command,
  existingRun = null,
  operationId,
  now,
}) {
  const runState = validateRunState(command.runState);
  const maxPasses = parsePositiveInteger(command.maxPasses, 'maxPasses');
  const generationPasses = parseNonNegativeInteger(command.generationPasses, 'generationPasses');
  const normalizedExistingRun = normalizeExistingRun(existingRun);
  const previousRevision = normalizedExistingRun?.revision ?? -1;
  const resultingRevision = previousRevision + 1;
  const sourceContentSha256 = normalizeOptionalText(command.sourceContentSha256);
  assertSha256(sourceContentSha256, 'sourceContentSha256');

  const createdAt = toIso(now);
  const run = {
    runId: command.runId,
    actor: command.actor,
    commandName: command.commandName || defaultCommandName,
    sourceRef: command.sourceRef,
    sourceContentSha256,
    runState,
    maxPasses,
    generationPasses,
    stabilized:
      command.stabilized === undefined || command.stabilized === null
        ? null
        : Boolean(command.stabilized),
    errorSummary: command.errorSummary || '',
    revision: resultingRevision,
    startedAt: command.startedAt ? toIso(command.startedAt) : createdAt,
    completedAt: command.completedAt ? toIso(command.completedAt) : null,
    payload: buildOperationPayload(command),
  };

  const stages =
    command.stages && command.result
      ? buildGovernanceRefreshStageRunRows({
          runId: command.runId,
          stages: command.stages,
          result: command.result,
          now,
        })
      : [];

  return {
    audit: {
      operationId,
      idempotencyKey: command.idempotencyKey || defaultGovernanceRefreshRunIdempotencyKey(command),
      operationType: 'governance_refresh_run_record',
      actor: command.actor,
      runId: command.runId,
      expectedRevision: command.expectedRevision === undefined ? null : command.expectedRevision,
      previousRevision,
      resultingRevision,
      sourceRef: command.sourceRef,
      sourceContentSha256,
      payload: buildOperationPayload(command),
      createdAt,
    },
    run,
    stages,
  };
}

async function readGovernanceRefreshRun(client, runId, forUpdate = false) {
  const result = await client.query(
    `select run_id, revision
       from ${schemaName}.governance_refresh_runs
      where run_id = $1
      ${forUpdate ? 'for update' : ''}`,
    [runId]
  );
  return result.rows[0] || null;
}

async function readExistingGovernanceRefreshRunOperation(client, idempotencyKey) {
  const result = await client.query(
    `select
       operation_id,
       idempotency_key,
       operation_type,
       actor,
       run_id,
       source_ref,
       source_content_sha256,
       expected_revision,
       previous_revision,
       resulting_revision,
       payload,
       created_at
     from ${schemaName}.governance_refresh_run_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );
  return result.rows[0] || null;
}

function assertGovernanceRefreshRunIdempotentReplayMatches(existing, command) {
  const existingPayload = existing.payload || {};
  const expectedPayload = buildOperationPayload(command);
  if (JSON.stringify(existingPayload) !== JSON.stringify(expectedPayload)) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" was already used for a different governance refresh run operation.`
    );
  }
}

async function writePlannedGovernanceRefreshRunRecordOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.governance_refresh_runs
      (run_id, actor, command_name, source_ref, source_content_sha256, run_state,
       max_passes, generation_passes, stabilized, error_summary, revision, started_at,
       completed_at, payload)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
     on conflict (run_id) do update set
       actor = excluded.actor,
       command_name = excluded.command_name,
       source_ref = excluded.source_ref,
       source_content_sha256 = excluded.source_content_sha256,
       run_state = excluded.run_state,
       max_passes = excluded.max_passes,
       generation_passes = excluded.generation_passes,
       stabilized = excluded.stabilized,
       error_summary = excluded.error_summary,
       revision = excluded.revision,
       completed_at = excluded.completed_at,
       payload = excluded.payload`,
    [
      planned.run.runId,
      planned.run.actor,
      planned.run.commandName,
      planned.run.sourceRef,
      planned.run.sourceContentSha256,
      planned.run.runState,
      planned.run.maxPasses,
      planned.run.generationPasses,
      planned.run.stabilized,
      planned.run.errorSummary,
      planned.run.revision,
      planned.run.startedAt,
      planned.run.completedAt,
      toJson(planned.run.payload),
    ]
  );

  await client.query(
    `insert into ${schemaName}.governance_refresh_run_operations
      (operation_id, idempotency_key, operation_type, actor, run_id, source_ref,
       source_content_sha256, expected_revision, previous_revision, resulting_revision,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.runId,
      planned.audit.sourceRef,
      planned.audit.sourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );

  if (planned.stages.length > 0) {
    await client.query(
      `delete from ${schemaName}.governance_refresh_stage_runs where run_id = $1`,
      [planned.run.runId]
    );

    for (const stage of planned.stages) {
      await client.query(
        `insert into ${schemaName}.governance_refresh_stage_runs
          (stage_run_id, run_id, stage_group, pass_number, stage_index, stage_id,
           stage_script, args, env, stage_state, recorded_at, metadata)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12::jsonb)`,
        [
          stage.stageRunId,
          stage.runId,
          stage.stageGroup,
          stage.passNumber,
          stage.stageIndex,
          stage.stageId,
          stage.stageScript,
          toJson(stage.args),
          toJson(stage.env),
          stage.stageState,
          stage.recordedAt,
          toJson(stage.metadata),
        ]
      );
    }
  }
}

async function applyGovernanceRefreshRunRecordOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingGovernanceRefreshRunOperation(
      client,
      command.idempotencyKey
    );
    if (existing) {
      assertGovernanceRefreshRunIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const existingRun = await readGovernanceRefreshRun(client, command.runId, true);
    const planned = planGovernanceRefreshRunRecordOperation({
      command,
      existingRun,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedGovernanceRefreshRunRecordOperation(client, planned);
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

module.exports = {
  allowedRunStates,
  applyGovernanceRefreshRunRecordOperation,
  assertGovernanceRefreshRunIdempotentReplayMatches,
  buildGovernanceRefreshStageRunRows,
  defaultGovernanceRefreshRunIdempotencyKey,
  planGovernanceRefreshRunRecordOperation,
  readExistingGovernanceRefreshRunOperation,
  readGovernanceRefreshRun,
  validateRunState,
  writePlannedGovernanceRefreshRunRecordOperation,
};
