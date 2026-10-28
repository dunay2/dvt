/**
 * @file scripts/planning-db/operate/architecture-relations.cjs
 * @ownedConcern Explicit component graph edge direction/sync/failure/authorization contracts.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const {
  normalizeOptionalText,
  parseFlagOptions,
  requireOption,
  toIso,
  toJson,
  validateSha256,
} = require('./command-values.cjs');

const {
  assertArchitectureDesignMayRecord,
  assertArchitectureDesignScope,
  readArchitectureDesign,
  readArchitectureDesignScopes,
  readExistingArchitectureDesignOperation,
  validateArchitectureDesignId,
} = require('./architecture-design-authority.cjs');

const {
  normalizeArchitectureComponent,
  readArchitectureComponent,
  validateArchitectureComponentId,
} = require('./architecture-component-profile.cjs');

const { defaultIdempotencyKey } = require('./operation-payload.cjs');

const {
  architectureScopedAudit,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  writeArchitectureScopedAudit,
} = require('./architecture-audit.cjs');

const { Client } = require('pg');

const { databaseUrl } = require('../../planning-db-schema.cjs');

const { assertPlanningDbCurrentSchemaReady } = require('../../planning-db-schema.cjs');

const { randomUuidV4 } = require('@dvt/crypto');

const allowedArchitectureRelationTypes = new Set([
  'contains',
  'depends_on',
  'calls',
  'publishes',
  'consumes',
  'reads',
  'writes',
  'implements_port',
  'exposes_api',
  'transforms',
  'guards',
]);

const allowedArchitectureRelationDirections = new Set(['outbound', 'inbound', 'bidirectional']);

const allowedArchitectureRelationSyncModes = new Set(['sync', 'async', 'batch', 'build_time']);

const allowedArchitectureRelationRecordStatuses = new Set([
  'proposed',
  'approved',
  'implemented',
  'deprecated',
  'drift',
]);

function validateArchitectureRelationId(value) {
  const normalized = String(value || '').trim();
  if (!/^REL-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --relation "${value}". Expected an uppercase REL-* architecture relation id.`
    );
  }

  return normalized;
}

function validateArchitectureRelationRecordStatus(value) {
  if (!allowedArchitectureRelationRecordStatuses.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitectureRelation stores statuses accepted by architecture.component_relation: ${[
        ...allowedArchitectureRelationRecordStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureRelationType(value) {
  if (!allowedArchitectureRelationTypes.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid relation type "${value}". Expected: ${[
        ...allowedArchitectureRelationTypes,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureRelationDirection(value) {
  if (!allowedArchitectureRelationDirections.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid relation direction "${value}". Expected: ${[
        ...allowedArchitectureRelationDirections,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureRelationSyncMode(value) {
  if (!allowedArchitectureRelationSyncModes.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid relation sync mode "${value}". Expected: ${[
        ...allowedArchitectureRelationSyncModes,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureRelationRecordCommand(command) {
  const requiredTextFields = [
    ['failure-mode', command.failureMode],
    ['authorization-scope', command.authorizationScope],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-RELATION-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  if (command.sourceComponentId === command.targetComponentId) {
    throw new Error(
      'ARCH-RELATION-ENDPOINT-MISSING: architecture relations require two components.'
    );
  }

  return command;
}

function parseArchitectureRelationCommand(action, args) {
  if (action !== 'record') {
    throw new Error(`Unknown architecture-relation operation "${action}". Expected record.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'architecture_relation_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    relationId: validateArchitectureRelationId(requireOption(options, 'relation')),
    sourceComponentId: validateArchitectureComponentId(requireOption(options, 'source'), 'source'),
    targetComponentId: validateArchitectureComponentId(requireOption(options, 'target'), 'target'),
    relationType: validateArchitectureRelationType(requireOption(options, 'type')),
    direction: validateArchitectureRelationDirection(requireOption(options, 'direction')),
    syncAsync: validateArchitectureRelationSyncMode(requireOption(options, 'syncAsync')),
    contractId: normalizeOptionalText(options.contract),
    failureMode: requireOption(options, 'failureMode'),
    authorizationScope: requireOption(options, 'authorizationScope'),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    status: validateArchitectureRelationRecordStatus(options.status || 'proposed'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureRelationRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function normalizeArchitectureRelation(row) {
  if (!row) {
    return null;
  }

  return {
    relationId: row.relation_id ?? row.relationId,
  };
}

function planArchitectureRelationRecordOperation({
  command,
  design,
  designScopes,
  sourceComponent,
  targetComponent,
  existingRelation,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  const existing = normalizeArchitectureRelation(existingRelation);
  const requiredScope = existing ? 'may_update' : 'may_create';
  assertArchitectureDesignScope(
    designScopes,
    'relation',
    command.relationId,
    [requiredScope],
    'ARCH-COMPONENT-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.sourceComponentId,
    ['may_reference', 'may_create', 'may_update'],
    'ARCH-RELATION-ENDPOINT-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.targetComponentId,
    ['may_reference', 'may_create', 'may_update'],
    'ARCH-RELATION-ENDPOINT-SCOPE-MISSING'
  );

  if (
    !normalizeArchitectureComponent(sourceComponent) ||
    !normalizeArchitectureComponent(targetComponent)
  ) {
    throw new Error('ARCH-RELATION-ENDPOINT-MISSING: source or target component does not exist.');
  }

  validateArchitectureRelationRecordCommand(command);

  const createdAt = toIso(now);
  const relation = {
    relationId: command.relationId,
    sourceComponentId: command.sourceComponentId,
    targetComponentId: command.targetComponentId,
    relationType: command.relationType,
    direction: command.direction,
    syncAsync: command.syncAsync,
    contractId: command.contractId,
    failureMode: command.failureMode,
    authorizationScope: command.authorizationScope,
    sourceRefs: [command.sourceRef],
    status: command.status,
    createdAt,
    updatedAt: createdAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { relation, audit };
}

async function readArchitectureRelation(client, relationId) {
  const result = await client.query(
    `select *
     from architecture.component_relation
     where relation_id = $1`,
    [relationId]
  );

  return result.rows[0] || null;
}

async function writePlannedArchitectureRelationRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.component_relation
      (relation_id, source_component_id, target_component_id, relation_type,
       direction, sync_async, contract_id, failure_mode, authorization_scope,
       source_refs, status, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)
     on conflict (relation_id) do update set
       source_component_id = excluded.source_component_id,
       target_component_id = excluded.target_component_id,
       relation_type = excluded.relation_type,
       direction = excluded.direction,
       sync_async = excluded.sync_async,
       contract_id = excluded.contract_id,
       failure_mode = excluded.failure_mode,
       authorization_scope = excluded.authorization_scope,
       source_refs = excluded.source_refs,
       status = excluded.status,
       updated_at = excluded.updated_at`,
    [
      planned.relation.relationId,
      planned.relation.sourceComponentId,
      planned.relation.targetComponentId,
      planned.relation.relationType,
      planned.relation.direction,
      planned.relation.syncAsync,
      planned.relation.contractId,
      planned.relation.failureMode,
      planned.relation.authorizationScope,
      toJson(planned.relation.sourceRefs),
      planned.relation.status,
      planned.relation.createdAt,
      planned.relation.updatedAt,
    ]
  );

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function applyArchitectureRelationRecordOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const sourceComponent = await readArchitectureComponent(client, command.sourceComponentId);
    const targetComponent = await readArchitectureComponent(client, command.targetComponentId);
    const existingRelation = await readArchitectureRelation(client, command.relationId);
    const planned = planArchitectureRelationRecordOperation({
      command,
      design,
      designScopes,
      sourceComponent,
      targetComponent,
      existingRelation,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureRelationRecordOperation(client, planned);
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
  applyArchitectureRelationRecordOperation,
  parseArchitectureRelationCommand,
  planArchitectureRelationRecordOperation,
};
