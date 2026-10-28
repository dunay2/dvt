/**
 * @file scripts/planning-db/operate/db-surface.cjs
 * @ownedConcern Database surface authority validation and exact native inventory update.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const {
  allowedDbSurfaceAuthorityModes,
  allowedDbSurfaceWriteRailKinds,
} = require('../db-surface-inventory.cjs');

const { defaultIdempotencyKey, operationPayload } = require('./operation-payload.cjs');

const {
  canonicalJson,
  normalizeExistingPayload,
  normalizeOptionalText,
  parseFlagOptions,
  requireOption,
  toIso,
  toJson,
  validateSha256,
} = require('./command-values.cjs');

const { assertPlanningDbCurrentSchemaReady, schemaName } = require('../../planning-db-schema.cjs');

const { Client } = require('pg');

const { databaseUrl } = require('../../planning-db-schema.cjs');

const { randomUuidV4 } = require('@dvt/crypto');

function validateDbSurfaceAuthorityMode(value) {
  if (!allowedDbSurfaceAuthorityModes.has(value)) {
    throw new Error(
      `Invalid DB surface authority mode "${value}". Expected: ${[
        ...allowedDbSurfaceAuthorityModes,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateDbSurfaceWriteRailKind(value) {
  if (!allowedDbSurfaceWriteRailKinds.has(value)) {
    throw new Error(
      `Invalid DB surface write rail kind "${value}". Expected: ${[
        ...allowedDbSurfaceWriteRailKinds,
      ].join(', ')}.`
    );
  }

  return value;
}

function assertDbSurfaceIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const existingSourceContentSha256 = normalizeOptionalText(
    existingOperation.source_content_sha256 ?? existingOperation.sourceContentSha256
  );
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.surface_name === command.surfaceName &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (existingSourceContentSha256 !== command.sourceContentSha256 || !sameOperation) {
    throw new Error(
      `DB-SURFACE-IDEMPOTENCY-MISMATCH: idempotency key "${command.idempotencyKey}" already belongs to a different DB surface operation.`
    );
  }
}

function validateDbSurfaceUpsertCommand(command) {
  const requiredTextFields = [
    ['surface', command.surfaceName],
    ['canonical-source', command.canonicalSource],
    ['write-rail', command.writeRail],
    ['write-rail-kind', command.writeRailKind],
    ['read-query-rail', command.readQueryRail],
    ['projection', command.projection],
    ['validation', command.validation],
    ['authority-mode', command.authorityMode],
    ['source-ref', command.sourceRef],
    ['source-content-sha256', command.sourceContentSha256],
    ['actor', command.actor],
  ];

  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`DB-SURFACE-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  if (command.authorityMode === 'database' && command.writeRailKind !== 'db_command') {
    throw new Error(
      `DATABASE-AUTHORITY-WRITE-RAIL-MISMATCH: database surface "${command.surfaceName}" requires write rail kind db_command.`
    );
  }

  return command;
}

function parseDbSurfaceCommand(action, args) {
  if (action !== 'upsert') {
    throw new Error(`Unknown db-surface operation "${action}". Expected upsert.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'db_surface_upsert',
    surfaceName: requireOption(options, 'surface'),
    canonicalSource: requireOption(options, 'canonicalSource'),
    writeRail: requireOption(options, 'writeRail'),
    writeRailKind: validateDbSurfaceWriteRailKind(requireOption(options, 'writeRailKind')),
    readQueryRail: requireOption(options, 'readQueryRail'),
    projection: requireOption(options, 'projection'),
    validation: requireOption(options, 'validation'),
    authorityMode: validateDbSurfaceAuthorityMode(requireOption(options, 'authorityMode')),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateDbSurfaceUpsertCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function normalizeDbSurface(row) {
  if (!row) {
    return null;
  }

  return {
    surfaceName: row.surface_name ?? row.surfaceName,
    revision: Number(row.revision ?? 0),
  };
}

function planDbSurfaceUpsertOperation({ command, existingSurface, operationId, now }) {
  validateDbSurfaceUpsertCommand(command);

  const previous = normalizeDbSurface(existingSurface);
  const previousRevision = previous ? previous.revision : 0;
  const resultingRevision = previous ? previous.revision + 1 : 0;
  const updatedAt = toIso(now);
  const surface = {
    surfaceName: command.surfaceName,
    canonicalSource: command.canonicalSource,
    writeRail: command.writeRail,
    writeRailKind: command.writeRailKind,
    readQueryRail: command.readQueryRail,
    projection: command.projection,
    validation: command.validation,
    authorityMode: command.authorityMode,
    sourceRef: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    revision: resultingRevision,
    updatedBy: command.actor,
    updatedAt,
    rawSurface: operationPayload(command),
  };
  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    surfaceName: command.surfaceName,
    sourceRef: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    previousRevision,
    resultingRevision,
    payload: operationPayload(command),
    createdAt: updatedAt,
  };

  return { surface, audit };
}

async function readExistingDbSurfaceOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from ${schemaName}.db_governance_surface_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );

  return result.rows[0] || null;
}

async function readDbSurface(client, surfaceName, lock = false) {
  const result = await client.query(
    `select *
     from ${schemaName}.db_governance_surfaces
     where surface_name = $1
     ${lock ? 'for update' : ''}`,
    [surfaceName]
  );

  return result.rows[0] || null;
}

async function writePlannedDbSurfaceUpsertOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.db_governance_surfaces
      (surface_name, canonical_source, write_rail, write_rail_kind, read_query_rail,
       projection, validation, authority_mode, source_ref, source_content_sha256,
       revision, updated_by, updated_at, raw_surface)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
     on conflict (surface_name) do update set
       canonical_source = excluded.canonical_source,
       write_rail = excluded.write_rail,
       write_rail_kind = excluded.write_rail_kind,
       read_query_rail = excluded.read_query_rail,
       projection = excluded.projection,
       validation = excluded.validation,
       authority_mode = excluded.authority_mode,
       source_ref = excluded.source_ref,
       source_content_sha256 = excluded.source_content_sha256,
       revision = excluded.revision,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at,
       raw_surface = excluded.raw_surface`,
    [
      planned.surface.surfaceName,
      planned.surface.canonicalSource,
      planned.surface.writeRail,
      planned.surface.writeRailKind,
      planned.surface.readQueryRail,
      planned.surface.projection,
      planned.surface.validation,
      planned.surface.authorityMode,
      planned.surface.sourceRef,
      planned.surface.sourceContentSha256,
      planned.surface.revision,
      planned.surface.updatedBy,
      planned.surface.updatedAt,
      toJson(planned.surface.rawSurface),
    ]
  );

  await client.query(
    `insert into ${schemaName}.db_governance_surface_operations
      (operation_id, idempotency_key, operation_type, actor, surface_name,
       source_ref, source_content_sha256, previous_revision, resulting_revision,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.surfaceName,
      planned.audit.sourceRef,
      planned.audit.sourceContentSha256,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function applyDbSurfaceUpsertOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existingOperation = await readExistingDbSurfaceOperation(client, command.idempotencyKey);
    if (existingOperation) {
      assertDbSurfaceIdempotentReplayMatches(existingOperation, command);
      await client.query('commit');
      return { idempotent: true, audit: existingOperation };
    }

    const existingSurface = await readDbSurface(client, command.surfaceName, true);
    const planned = planDbSurfaceUpsertOperation({
      command,
      existingSurface,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedDbSurfaceUpsertOperation(client, planned);
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
  applyDbSurfaceUpsertOperation,
  assertDbSurfaceIdempotentReplayMatches,
  parseDbSurfaceCommand,
  planDbSurfaceUpsertOperation,
  validateDbSurfaceAuthorityMode,
  validateDbSurfaceWriteRailKind,
  writePlannedDbSurfaceUpsertOperation,
};
