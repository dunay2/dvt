/**
 * @file scripts/planning-db/operate/component-operations.cjs
 * @ownedConcern Native governance component reads, writes, refresh and replay.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const { operationPayload } = require('./operation-payload.cjs');

const {
  canonicalJson,
  normalizeExistingPayload,
  normalizeRevision,
  toJson,
} = require('./command-values.cjs');

const { assertPlanningDbCurrentSchemaReady, schemaName } = require('../../planning-db-schema.cjs');

const { Client } = require('pg');

const { databaseUrl } = require('../../planning-db-schema.cjs');

const {
  planComponentCreateOperation,
  planComponentReparentOperation,
  planComponentReviseOperation,
} = require('./component-definition.cjs');

const { randomUuidV4 } = require('@dvt/crypto');

const {
  readArchitectureDesign,
  readArchitectureDesignScopes,
} = require('./architecture-design-authority.cjs');

const componentEngineeringSchemaName = 'component_engineering';

function assertComponentIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = { ...normalizeExistingPayload(existingOperation.payload) };
  if (command.kind === 'component_revise') delete existingPayload.resultingDefinition;
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.component_id === command.componentId &&
    normalizeRevision(existingOperation.expected_revision) ===
      normalizeRevision(command.expectedRevision) &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (!sameOperation) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" already belongs to a different governance component operation.`
    );
  }
}

async function readExistingComponentOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from ${schemaName}.governance_component_local_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );

  return result.rows[0] || null;
}

async function readGovernanceUnit(client, unitId) {
  const result = await client.query(
    `select
       component_id as unit_id,
       name,
       component_level as level,
       parent_component_id as parent_id,
       root_unit,
       domain_unit,
       status
     from ${componentEngineeringSchemaName}.component_tree_query
     where component_id = $1`,
    [unitId]
  );

  return result.rows[0] || null;
}

async function readGovernanceUnitPath(client, unitId) {
  const result = await client.query(
    `with recursive unit_chain as (
       select component_id as unit_id, parent_component_id as parent_id, 0 as depth
       from ${componentEngineeringSchemaName}.component_tree_query
       where component_id = $1
       union all
       select parent.component_id as unit_id, parent.parent_component_id as parent_id,
              unit_chain.depth + 1
       from ${componentEngineeringSchemaName}.component_tree_query parent
       join unit_chain
         on unit_chain.parent_id = parent.component_id
       where unit_chain.depth < 64
     )
     select unit_id
     from unit_chain
     order by depth desc`,
    [unitId]
  );

  return result.rows;
}

async function readImportedGovernanceComponent(client, componentId, lock = false) {
  const result = await client.query(
    `select 'imported'::text as source_kind, *
     from ${schemaName}.governance_components
     where component_id = $1
     ${lock ? 'for update' : ''}`,
    [componentId]
  );

  return result.rows[0] || null;
}

async function readLocalGovernanceComponent(client, componentId, lock = false) {
  const result = await client.query(
    `select 'local'::text as source_kind, *
     from ${schemaName}.governance_component_local_definitions
     where component_id = $1
     ${lock ? 'for update' : ''}`,
    [componentId]
  );

  return result.rows[0] || null;
}

async function readLatestComponentOperation(client, componentId) {
  const result = await client.query(
    `select *
     from ${schemaName}.governance_component_local_operations
     where component_id = $1
     order by created_at desc, resulting_revision desc
     limit 1`,
    [componentId]
  );

  return result.rows[0] || null;
}

async function readEffectiveComponentDefinition(client, componentId) {
  const result = await client.query(
    `select *
     from ${schemaName}.governance_component_definition_query
     where component_id = $1`,
    [componentId]
  );

  return result.rows[0] || null;
}

async function writePlannedComponentCreateOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.governance_component_local_definitions
      (component_id, source_path, source_content_sha256, revision, name, level, parent_id,
       root_unit, domain_unit, status, children_required, owned_concern, ddd_owner,
       cq_rails, created_by, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      planned.definition.componentId,
      planned.definition.sourcePath,
      planned.definition.sourceContentSha256,
      planned.definition.revision,
      planned.definition.name,
      planned.definition.level,
      planned.definition.parentComponentId,
      planned.definition.rootUnit,
      planned.definition.domainUnit,
      planned.definition.status,
      planned.definition.childrenRequired,
      planned.definition.ownedConcern,
      planned.definition.dddOwner,
      planned.definition.cqRails,
      planned.definition.createdBy,
      planned.definition.createdAt,
    ]
  );

  for (const pattern of planned.ownershipPatterns) {
    await client.query(
      `insert into ${schemaName}.governance_component_local_ownership_patterns
        (component_id, pattern_kind, pattern, pattern_order)
       values ($1, $2, $3, $4)
       on conflict (component_id, pattern_kind, pattern) do update set
         pattern_order = excluded.pattern_order`,
      [pattern.componentId, pattern.patternKind, pattern.pattern, pattern.patternOrder]
    );
  }

  for (const item of planned.semanticItems) {
    await client.query(
      `insert into ${schemaName}.governance_component_local_semantic_items
        (component_id, item_kind, item_value, item_order)
       values ($1, $2, $3, $4)
       on conflict (component_id, item_kind, item_value) do update set
         item_order = excluded.item_order`,
      [item.componentId, item.itemKind, item.itemValue, item.itemOrder]
    );
  }

  await client.query(
    `insert into ${schemaName}.governance_component_local_operations
      (operation_id, idempotency_key, operation_type, actor, component_id, source_path,
       source_content_sha256, expected_revision, previous_revision, resulting_revision,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.componentId,
      planned.audit.sourcePath,
      planned.audit.sourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function refreshComponentEngineeringReadProjections(client) {
  for (const projection of [
    'component_engineering_component_tree_projection',
    'component_engineering_file_ownership_projection',
    'component_engineering_rule_evaluation_projection',
  ]) {
    await client.query(`refresh materialized view ${schemaName}.${projection}`);
  }
}

async function writePlannedComponentReviseOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.governance_component_local_definitions
      (component_id, source_path, source_content_sha256, revision, name, level, parent_id,
       root_unit, domain_unit, status, children_required, owned_concern, ddd_owner,
       cq_rails, created_by, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     on conflict (component_id) do update set
       source_path = excluded.source_path,
       source_content_sha256 = excluded.source_content_sha256,
       revision = excluded.revision,
       name = excluded.name,
       level = excluded.level,
       parent_id = excluded.parent_id,
       root_unit = excluded.root_unit,
       domain_unit = excluded.domain_unit,
       status = excluded.status,
       children_required = excluded.children_required,
       owned_concern = excluded.owned_concern,
       ddd_owner = excluded.ddd_owner,
       cq_rails = excluded.cq_rails,
       created_by = excluded.created_by`,
    [
      planned.definition.componentId,
      planned.definition.sourcePath,
      planned.definition.sourceContentSha256,
      planned.definition.revision,
      planned.definition.name,
      planned.definition.level,
      planned.definition.parentComponentId,
      planned.definition.rootUnit,
      planned.definition.domainUnit,
      planned.definition.status,
      planned.definition.childrenRequired,
      planned.definition.ownedConcern,
      planned.definition.dddOwner,
      planned.definition.cqRails,
      planned.definition.createdBy,
      planned.definition.createdAt,
    ]
  );

  await client.query(
    `delete from ${schemaName}.governance_component_local_ownership_patterns
     where component_id = $1`,
    [planned.definition.componentId]
  );
  await client.query(
    `delete from ${schemaName}.governance_component_local_semantic_items
     where component_id = $1`,
    [planned.definition.componentId]
  );

  for (const pattern of planned.ownershipPatterns) {
    await client.query(
      `insert into ${schemaName}.governance_component_local_ownership_patterns
        (component_id, pattern_kind, pattern, pattern_order)
       values ($1, $2, $3, $4)`,
      [pattern.componentId, pattern.patternKind, pattern.pattern, pattern.patternOrder]
    );
  }

  for (const item of planned.semanticItems) {
    await client.query(
      `insert into ${schemaName}.governance_component_local_semantic_items
        (component_id, item_kind, item_value, item_order)
       values ($1, $2, $3, $4)`,
      [item.componentId, item.itemKind, item.itemValue, item.itemOrder]
    );
  }

  await refreshComponentEngineeringReadProjections(client);

  await client.query(
    `insert into ${schemaName}.governance_component_local_operations
      (operation_id, idempotency_key, operation_type, actor, component_id, source_path,
       source_content_sha256, expected_revision, previous_revision, resulting_revision,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.componentId,
      planned.audit.sourcePath,
      planned.audit.sourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function writePlannedComponentReparentOperation(client, planned) {
  if (planned.definition.sourceKind === 'local') {
    await client.query(
      `update ${schemaName}.governance_component_local_definitions
       set parent_id = $2,
           root_unit = $3,
           domain_unit = $4,
           source_path = $5,
           source_content_sha256 = $6,
           revision = $7
       where component_id = $1`,
      [
        planned.definition.componentId,
        planned.definition.parentComponentId,
        planned.definition.rootUnit,
        planned.definition.domainUnit,
        planned.definition.sourcePath,
        planned.definition.sourceContentSha256,
        planned.definition.revision,
      ]
    );
  } else {
    await client.query(
      `insert into ${schemaName}.governance_component_reparent_overrides
        (component_id, parent_id, root_unit, domain_unit, unit_path, raw_component,
         source_path, source_content_sha256, revision, updated_by, updated_at)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11)
       on conflict (component_id) do update set
         parent_id = excluded.parent_id,
         root_unit = excluded.root_unit,
         domain_unit = excluded.domain_unit,
         unit_path = excluded.unit_path,
         raw_component = excluded.raw_component,
         source_path = excluded.source_path,
         source_content_sha256 = excluded.source_content_sha256,
         revision = excluded.revision,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
      [
        planned.definition.componentId,
        planned.definition.parentComponentId,
        planned.definition.rootUnit,
        planned.definition.domainUnit,
        toJson(planned.definition.unitPath),
        toJson(planned.definition.rawComponent),
        planned.definition.sourcePath,
        planned.definition.sourceContentSha256,
        planned.definition.revision,
        planned.audit.actor,
        planned.audit.createdAt,
      ]
    );
  }

  await client.query(
    `insert into ${schemaName}.governance_component_local_operations
      (operation_id, idempotency_key, operation_type, actor, component_id, source_path,
       source_content_sha256, expected_revision, previous_revision, resulting_revision,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.componentId,
      planned.audit.sourcePath,
      planned.audit.sourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function applyComponentCreateOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingComponentOperation(client, command.idempotencyKey);
    if (existing) {
      assertComponentIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const parentUnit = await readGovernanceUnit(client, command.parentComponentId);
    const existingComponent = await readEffectiveComponentDefinition(client, command.componentId);
    const planned = planComponentCreateOperation({
      command,
      parentUnit,
      existingComponent,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedComponentCreateOperation(client, planned);
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

async function applyComponentReviseOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingComponentOperation(client, command.idempotencyKey);
    if (existing) {
      assertComponentIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    await client.query('select pg_advisory_xact_lock(hashtext($1))', [command.componentId]);
    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const existingComponent = await readEffectiveComponentDefinition(client, command.componentId);
    const latestOperation = await readLatestComponentOperation(client, command.componentId);
    const planned = planComponentReviseOperation({
      command,
      design,
      designScopes,
      existingComponent,
      latestOperation,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedComponentReviseOperation(client, planned);
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

async function applyComponentReparentOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingComponentOperation(client, command.idempotencyKey);
    if (existing) {
      assertComponentIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const parentUnit = await readGovernanceUnit(client, command.parentComponentId);
    const parentPathRows = await readGovernanceUnitPath(client, command.parentComponentId);
    const existingComponent =
      (await readImportedGovernanceComponent(client, command.componentId, true)) ||
      (await readLocalGovernanceComponent(client, command.componentId, true));
    const latestOperation = await readLatestComponentOperation(client, command.componentId);
    const planned = planComponentReparentOperation({
      command,
      parentUnit,
      existingComponent,
      parentPathRows,
      latestOperation,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedComponentReparentOperation(client, planned);
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
  applyComponentCreateOperation,
  applyComponentReparentOperation,
  applyComponentReviseOperation,
  assertComponentIdempotentReplayMatches,
  writePlannedComponentCreateOperation,
  writePlannedComponentReparentOperation,
  writePlannedComponentReviseOperation,
};
