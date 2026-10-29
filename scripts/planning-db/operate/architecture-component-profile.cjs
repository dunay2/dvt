/**
 * @file scripts/planning-db/operate/architecture-component-profile.cjs
 * @ownedConcern Component taxonomy, responsibility profile and association authority.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const {
  normalizeListOption,
  normalizeOptionalText,
  parseFlagOptions,
  requireOption,
  toIso,
  validateComponentId,
  validateSha256,
} = require('./command-values.cjs');

const {
  replaceComponentBindings,
  requireBindings,
} = require('../component-source-responsibility-store.cjs');

const {
  assertArchitectureDesignMayImplement,
  assertArchitectureDesignMayRecord,
  assertArchitectureDesignScope,
  readArchitectureDesign,
  readArchitectureDesignScopes,
  readExistingArchitectureDesignOperation,
  validateArchitectureDesignId,
  validateArchitectureRecordStatus,
} = require('./architecture-design-authority.cjs');

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

const allowedArchitectureComponentKinds = new Set([
  'package',
  'module',
  'port',
  'adapter',
  'service',
  'ui-view',
  'workflow',
  'dbt-model',
  'api',
]);

const allowedArchitectureComponentLayers = new Set([
  'domain',
  'application',
  'adapter',
  'ui',
  'infra',
  'contracts',
]);

const allowedArchitectureComponentCriticalities = new Set(['low', 'medium', 'high', 'critical']);

function validateArchitectureComponentKind(value) {
  if (!allowedArchitectureComponentKinds.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid component kind "${value}". Expected: ${[
        ...allowedArchitectureComponentKinds,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureComponentLayer(value) {
  if (!allowedArchitectureComponentLayers.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid component layer "${value}". Expected: ${[
        ...allowedArchitectureComponentLayers,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureComponentCriticality(value) {
  if (!allowedArchitectureComponentCriticalities.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid component criticality "${value}". Expected: ${[
        ...allowedArchitectureComponentCriticalities,
      ].join(', ')}.`
    );
  }

  return value;
}

function parseArchitectureComponentResponsibility(value) {
  const parts = String(value || '')
    .split('|')
    .map((part) => part.trim());

  if (parts.length !== 4 || parts.some((part) => !part)) {
    throw new Error(
      'ARCH-COMPONENT-SEMANTICS-MISSING: --responsibility must use responsibility_id|responsibility|reason_to_change|ddd_owner.'
    );
  }

  return {
    responsibilityId: parts[0],
    responsibility: parts[1],
    reasonToChange: parts[2],
    dddOwner: parts[3],
  };
}

function parseArchitectureComponentResponsibilities(value) {
  return normalizeListOption(value).map(parseArchitectureComponentResponsibility);
}

function validateArchitectureResponsibilityId(value) {
  const normalized = String(value || '').trim();
  if (!/^RESP-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --responsibility "${value}". Expected an uppercase RESP-* architecture responsibility id.`
    );
  }

  return normalized;
}

function validateArchitectureComponentRecordCommand(command) {
  if (command.sourceBindings !== undefined) {
    requireBindings(command.sourceBindings);
    if (!/^[a-f0-9]{64}$/u.test(command.expectedBindingsHash || ''))
      throw new Error('--source-bindings requires --expected-bindings-hash.');
  } else if (command.expectedBindingsHash !== undefined) {
    throw new Error('--expected-bindings-hash requires --source-bindings.');
  }
  const requiredTextFields = [
    ['name', command.name],
    ['owner', command.owner],
    ['repo-path', command.repoPath],
    ['public-contract', command.publicContract],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-COMPONENT-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  if (command.responsibilities.length === 0) {
    throw new Error(
      'ARCH-COMPONENT-SEMANTICS-MISSING: RecordArchitectureComponent requires at least one --responsibility.'
    );
  }

  if (
    (command.expectedResponsibilityStatus === undefined) !==
    (command.responsibilityStatus === undefined)
  ) {
    throw new Error(
      'ARCH-RESPONSIBILITY-STATUS-PAIR-MISSING: expected and target responsibility statuses are required together.'
    );
  }
  if (command.expectedResponsibilityStatus !== undefined) {
    if (!(
      (command.expectedResponsibilityStatus === 'proposed' &&
        command.responsibilityStatus === 'approved') ||
      (command.expectedResponsibilityStatus === 'approved' &&
        command.responsibilityStatus === 'implemented')
    )) {
      throw new Error(
        'ARCH-RESPONSIBILITY-STATUS-TRANSITION-INVALID: only proposed→approved or approved→implemented is allowed.'
      );
    }
    if (
      new Set(command.responsibilities.map((entry) => entry.responsibilityId)).size !==
      command.responsibilities.length
    ) {
      throw new Error(
        'ARCH-RESPONSIBILITY-STATUS-DUPLICATE: explicitly promoted responsibility IDs must be unique.'
      );
    }
  }

  if (command.parentComponentId && command.parentComponentId === command.componentId) {
    throw new Error(`Architecture component ${command.componentId} cannot be its own parent.`);
  }

  return command;
}

function parseArchitectureComponentCommand(action, args) {
  const options = parseFlagOptions(args);
  if (action === 'retire-responsibility') {
    const command = {
      kind: 'architecture_component_responsibility_retire',
      designId: validateArchitectureDesignId(requireOption(options, 'design')),
      componentId: validateComponentId(requireOption(options, 'component'), 'component'),
      responsibilityId: validateArchitectureResponsibilityId(
        requireOption(options, 'responsibility')
      ),
      reason: requireOption(options, 'reason'),
      sourceRef: requireOption(options, 'sourceRef'),
      sourceContentSha256: validateSha256(
        requireOption(options, 'sourceContentSha256'),
        'source-content-sha256'
      ),
      actor: requireOption(options, 'actor'),
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action !== 'record') {
    throw new Error(
      `Unknown architecture-component operation "${action}". Expected record or retire-responsibility.`
    );
  }

  const command = {
    kind: 'architecture_component_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    componentId: validateComponentId(requireOption(options, 'component'), 'component'),
    name: requireOption(options, 'name'),
    componentKind: validateArchitectureComponentKind(requireOption(options, 'kind')),
    layer: validateArchitectureComponentLayer(requireOption(options, 'layer')),
    owner: requireOption(options, 'owner'),
    repoPath: requireOption(options, 'repoPath'),
    publicContract: requireOption(options, 'publicContract'),
    runtime: options.runtime || 'none',
    criticality: validateArchitectureComponentCriticality(options.criticality || 'medium'),
    status: validateArchitectureRecordStatus(options.status || 'proposed'),
    parentComponentId: options.parent ? validateComponentId(options.parent, 'parent') : null,
    responsibilities: parseArchitectureComponentResponsibilities(options.responsibility),
    ...(options.sourceBindings === undefined
      ? {}
      : { sourceBindings: requireBindings(JSON.parse(options.sourceBindings)) }),
    ...(options.expectedBindingsHash === undefined
      ? {}
      : { expectedBindingsHash: options.expectedBindingsHash }),
    ...(options.expectedResponsibilityStatus === undefined
      ? {}
      : { expectedResponsibilityStatus: options.expectedResponsibilityStatus }),
    ...(options.responsibilityStatus === undefined
      ? {}
      : { responsibilityStatus: options.responsibilityStatus }),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureComponentRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function normalizeArchitectureComponent(row) {
  if (!row) {
    return null;
  }

  return {
    componentId: row.component_id ?? row.componentId,
    maturityScore: row.maturity_score ?? row.maturityScore ?? null,
    createdAt: row.created_at ?? row.createdAt,
  };
}

function planArchitectureComponentRecordOperation({
  command,
  design,
  designScopes,
  existingComponent,
  parentComponent,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  const existing = normalizeArchitectureComponent(existingComponent);
  const requiredScope = existing ? 'may_update' : 'may_create';
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    [requiredScope],
    'ARCH-COMPONENT-DESIGN-SCOPE-MISSING'
  );

  if (command.parentComponentId && !normalizeArchitectureComponent(parentComponent)) {
    throw new Error(`ARCH-RELATION-ENDPOINT-MISSING: parent ${command.parentComponentId}`);
  }

  validateArchitectureComponentRecordCommand(command);

  const updatedAt = toIso(now);
  const createdAt = existing?.createdAt ?? updatedAt;
  const component = {
    componentId: command.componentId,
    name: command.name,
    kind: command.componentKind,
    layer: command.layer,
    owner: command.owner,
    repoPath: command.repoPath,
    publicContract: command.publicContract,
    runtime: command.runtime,
    criticality: command.criticality,
    status: command.status,
    maturityScore: existing?.maturityScore ?? null,
    parentComponentId: command.parentComponentId,
    createdAt,
    updatedAt,
  };
  const responsibilities = command.responsibilities.map((responsibility) => ({
    ...responsibility,
    componentId: command.componentId,
    status:
      command.responsibilityStatus ??
      (['approved', 'implemented', 'drift'].includes(command.status) ? command.status : 'proposed'),
    createdAt,
  }));
  const audit = architectureScopedAudit({ command, operationId, now });

  return {
    component,
    responsibilities,
    audit,
    ...(command.expectedResponsibilityStatus === undefined
      ? {}
      : {
          expectedResponsibilityStatus: command.expectedResponsibilityStatus,
          responsibilityStatus: command.responsibilityStatus,
        }),
    ...(command.sourceBindings === undefined
      ? {}
      : {
          sourceBindings: command.sourceBindings,
          expectedBindingsHash: command.expectedBindingsHash,
        }),
  };
}

function planArchitectureComponentResponsibilityRetireOperation({
  command,
  design,
  designScopes,
  existingResponsibility,
  operationId,
  now,
}) {
  assertArchitectureDesignMayImplement(design, command);
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    ['may_update'],
    'ARCH-COMPONENT-DESIGN-SCOPE-MISSING'
  );
  if (!existingResponsibility) {
    throw new Error(`ARCH-RESPONSIBILITY-NOT-FOUND: ${command.responsibilityId}`);
  }
  const existingComponentId =
    existingResponsibility.component_id ?? existingResponsibility.componentId;
  if (existingComponentId !== command.componentId) {
    throw new Error(
      `ARCH-RESPONSIBILITY-COMPONENT-MISMATCH: ${command.responsibilityId} belongs to ${existingComponentId}.`
    );
  }

  return {
    retirement: {
      responsibilityId: command.responsibilityId,
      componentId: command.componentId,
    },
    audit: architectureScopedAudit({ command, operationId, now }),
  };
}

async function readArchitectureComponent(client, componentId) {
  const result = await client.query(
    `select *
     from architecture.component
     where component_id = $1`,
    [componentId]
  );

  return result.rows[0] || null;
}

async function readArchitectureComponentResponsibility(client, responsibilityId) {
  const result = await client.query(
    `select *
     from architecture.component_responsibility
     where responsibility_id = $1`,
    [responsibilityId]
  );

  return result.rows[0] || null;
}

async function writePlannedArchitectureComponentRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.component
      (component_id, name, kind, layer, owner, repo_path, public_contract,
       runtime, criticality, status, maturity_score, parent_component_id,
       created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     on conflict (component_id) do update set
       name = excluded.name,
       kind = excluded.kind,
       layer = excluded.layer,
       owner = excluded.owner,
       repo_path = excluded.repo_path,
       public_contract = excluded.public_contract,
       runtime = excluded.runtime,
       criticality = excluded.criticality,
       status = excluded.status,
       maturity_score = excluded.maturity_score,
       parent_component_id = excluded.parent_component_id,
       updated_at = excluded.updated_at`,
    [
      planned.component.componentId,
      planned.component.name,
      planned.component.kind,
      planned.component.layer,
      planned.component.owner,
      planned.component.repoPath,
      planned.component.publicContract,
      planned.component.runtime,
      planned.component.criticality,
      planned.component.status,
      planned.component.maturityScore,
      planned.component.parentComponentId,
      planned.component.createdAt,
      planned.component.updatedAt,
    ]
  );

  for (const responsibility of planned.responsibilities) {
    if (planned.expectedResponsibilityStatus !== undefined) {
      const promoted = await client.query(
        `update architecture.component_responsibility
         set status = $1
         where responsibility_id = $2 and component_id = $3 and status = $4
         returning responsibility_id`,
        [
          planned.responsibilityStatus,
          responsibility.responsibilityId,
          planned.component.componentId,
          planned.expectedResponsibilityStatus,
        ]
      );
      if (promoted.rowCount !== 1) {
        throw new Error(
          `ARCH-RESPONSIBILITY-STATUS-CONFLICT: ${responsibility.responsibilityId} must exist in ${planned.component.componentId} with status ${planned.expectedResponsibilityStatus}.`
        );
      }
    }
    await client.query(
      `insert into architecture.component_responsibility
        (responsibility_id, component_id, responsibility, reason_to_change,
         ddd_owner, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (responsibility_id) do update set
         component_id = excluded.component_id,
         responsibility = excluded.responsibility,
         reason_to_change = excluded.reason_to_change,
         ddd_owner = excluded.ddd_owner,
         status = architecture.component_responsibility.status`,
      [
        responsibility.responsibilityId,
        responsibility.componentId,
        responsibility.responsibility,
        responsibility.reasonToChange,
        responsibility.dddOwner,
        responsibility.status,
        responsibility.createdAt,
      ]
    );
    // The upsert holds the responsibility row lock before checking implementations.
    // Concurrent binding writers hold FOR SHARE, so their committed bindings are visible here.
    const conflicts = await client.query(
      `select 1 from architecture.component_source_responsibility
      where responsibility_id = $1 and role = 'implements' and component_id <> $2 limit 1`,
      [responsibility.responsibilityId, responsibility.componentId]
    );
    if (conflicts.rows.length)
      throw new Error(
        'Cannot reassign a responsibility with implementations owned by another component.'
      );
  }

  await replaceComponentBindings(client, {
    componentId: planned.component.componentId,
    sourceBindings: planned.sourceBindings,
    expectedBindingsHash: planned.expectedBindingsHash,
  });
  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedArchitectureComponentResponsibilityRetireOperation(client, planned) {
  const result = await client.query(
    `delete from architecture.component_responsibility
     where responsibility_id = $1
       and component_id = $2`,
    [planned.retirement.responsibilityId, planned.retirement.componentId]
  );
  if (result.rowCount !== 1) {
    throw new Error(
      `ARCH-RESPONSIBILITY-RETIRE-CONFLICT: ${planned.retirement.responsibilityId} was not deleted.`
    );
  }
  await writeArchitectureScopedAudit(client, planned.audit);
}

async function applyArchitectureComponentRecordOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');
    await client.query(
      "select pg_advisory_xact_lock(hashtext('dvt:architecture-component'), hashtext($1))",
      [command.componentId]
    );

    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const existingComponent = await readArchitectureComponent(client, command.componentId);
    const parentComponent = command.parentComponentId
      ? await readArchitectureComponent(client, command.parentComponentId)
      : null;
    const planned = planArchitectureComponentRecordOperation({
      command,
      design,
      designScopes,
      existingComponent,
      parentComponent,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureComponentRecordOperation(client, planned);
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

async function applyArchitectureComponentResponsibilityRetireOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;
  if (ownsClient) await client.connect();

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');
    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }
    const [design, designScopes, existingResponsibility] = await Promise.all([
      readArchitectureDesign(client, command.designId),
      readArchitectureDesignScopes(client, command.designId),
      readArchitectureComponentResponsibility(client, command.responsibilityId),
    ]);
    const planned = planArchitectureComponentResponsibilityRetireOperation({
      command,
      design,
      designScopes,
      existingResponsibility,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });
    await writePlannedArchitectureComponentResponsibilityRetireOperation(client, planned);
    await client.query('commit');
    return { idempotent: false, ...planned };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) await client.end();
  }
}

module.exports = {
  applyArchitectureComponentRecordOperation,
  applyArchitectureComponentResponsibilityRetireOperation,
  normalizeArchitectureComponent,
  parseArchitectureComponentCommand,
  planArchitectureComponentRecordOperation,
  planArchitectureComponentResponsibilityRetireOperation,
  readArchitectureComponent,
  writePlannedArchitectureComponentRecordOperation,
  writePlannedArchitectureComponentResponsibilityRetireOperation,
};
