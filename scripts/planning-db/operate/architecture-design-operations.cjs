/**
 * @file scripts/planning-db/operate/architecture-design-operations.cjs
 * @ownedConcern Design create/transition plans and native CAS/audit persistence.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

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

const {
  normalizeArchitectureDesign,
  parseArchitectureDesignScopes,
  readArchitectureDesign,
  readArchitectureImplementationViolations,
  readExistingArchitectureDesignOperation,
  validateArchitectureDesignCreateStatus,
  validateArchitectureDesignId,
  validateArchitectureDesignTransition,
  validateArchitectureFowlerSignal,
  validateArchitectureRailRef,
} = require('./architecture-design-authority.cjs');

const {
  architectureScopedAudit,
  writeArchitectureScopedAudit,
} = require('./architecture-audit.cjs');

const { Client } = require('pg');

const { databaseUrl } = require('../../planning-db-schema.cjs');

const { assertPlanningDbCurrentSchemaReady } = require('../../planning-db-schema.cjs');

const { randomUuidV4 } = require('@dvt/crypto');

function assertArchitectureDesignIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const existingSourceContentSha256 = normalizeOptionalText(
    existingOperation.source_content_sha256 ?? existingOperation.sourceContentSha256
  );
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.design_id === command.designId &&
    existingOperation.source_ref === command.sourceRef &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (existingSourceContentSha256 !== command.sourceContentSha256) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" already completed for source hash ${
        existingSourceContentSha256 ?? 'unknown'
      }, but current source hash is ${command.sourceContentSha256}. Use a new idempotency key for a new architecture design operation.`
    );
  }

  if (!sameOperation) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" already belongs to a different architecture design operation.`
    );
  }
}

function validateArchitectureDesignCreateCommand(command) {
  if (command.scopes.length === 0) {
    throw new Error('CreateArchitectureDesign requires at least one --scope.');
  }

  const requiredTextFields = [
    ['work-item', command.workItemId],
    ['title', command.title],
    ['owner', command.owner],
    ['rationale', command.rationale],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`Missing required --${field}`);
    }
  }

  return command;
}

function parseArchitectureDesignCommand(action, args) {
  const options = parseFlagOptions(args);
  if (action === 'transition') {
    const { fromStatus, toStatus } = validateArchitectureDesignTransition(
      requireOption(options, 'fromStatus'),
      requireOption(options, 'toStatus')
    );
    const command = {
      kind: 'architecture_design_transition',
      designId: validateArchitectureDesignId(requireOption(options, 'design')),
      fromStatus,
      toStatus,
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

  if (action !== 'create') {
    throw new Error(
      `Unknown architecture-design operation "${action}". Expected create or transition.`
    );
  }

  const fowlerSignalOption = Array.isArray(options.fowlerSignal)
    ? options.fowlerSignal[0]
    : options.fowlerSignal;
  const command = {
    kind: 'architecture_design_create',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    workItemId: requireOption(options, 'workItem'),
    title: requireOption(options, 'title'),
    owner: requireOption(options, 'owner'),
    status: validateArchitectureDesignCreateStatus(options.status || 'proposed'),
    rationale: requireOption(options, 'rationale'),
    fowlerSignal: validateArchitectureFowlerSignal(fowlerSignalOption || 'none'),
    railRef: validateArchitectureRailRef(requireOption(options, 'railRef')),
    supersedesId: options.supersedes ? validateArchitectureDesignId(options.supersedes) : null,
    scopes: parseArchitectureDesignScopes(options.scope),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureDesignCreateCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function planArchitectureDesignCreateOperation({ command, existingDesign, operationId, now }) {
  const existing = normalizeArchitectureDesign(existingDesign);
  if (existing) {
    throw new Error(`Architecture design ${command.designId} already exists.`);
  }

  validateArchitectureDesignCreateCommand(command);

  const createdAt = toIso(now);
  const design = {
    designId: command.designId,
    workItemId: command.workItemId,
    title: command.title,
    owner: command.owner,
    status: command.status,
    rationale: command.rationale,
    fowlerSignal: command.fowlerSignal,
    railRef: command.railRef,
    approvedAt: null,
    supersedesId: command.supersedesId,
    createdAt,
    updatedAt: createdAt,
  };
  const scopes = command.scopes.map((scope) => ({
    designId: command.designId,
    ...scope,
    createdAt,
  }));
  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    designId: command.designId,
    sourceRef: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    expectedRevision: null,
    previousRevision: 0,
    resultingRevision: 0,
    payload: operationPayload(command),
    createdAt,
  };

  return { design, scopes, audit };
}

function planArchitectureDesignTransitionOperation({
  command,
  existingDesign,
  implementationViolations = [],
  operationId,
  now,
}) {
  const existing = normalizeArchitectureDesign(existingDesign);
  if (!existing) {
    throw new Error(
      `ARCH-DESIGN-NOT-FOUND: architecture design ${command.designId} does not exist.`
    );
  }
  if (existing.status !== command.fromStatus) {
    throw new Error(
      `ARCH-DESIGN-TRANSITION-CONFLICT: expected ${command.designId} in ${command.fromStatus}, found ${existing.status}.`
    );
  }
  validateArchitectureDesignTransition(command.fromStatus, command.toStatus);
  if (
    command.toStatus === 'implemented' &&
    implementationViolations.some(
      (violation) =>
        (violation.violation_kind ?? violation.violationKind) === 'required_evidence_missing' &&
        violation.severity === 'blocker'
    )
  ) {
    const subjects = implementationViolations
      .map(
        (violation) =>
          `${violation.subject_kind ?? violation.subjectKind}:${violation.subject_id ?? violation.subjectId}`
      )
      .join(', ');
    throw new Error(
      `ARCH-DESIGN-IMPLEMENTATION-EVIDENCE-MISSING: ${command.designId} cannot become implemented while required proof is invalid for ${subjects}.`
    );
  }

  const updatedAt = toIso(now);
  const transition = {
    designId: command.designId,
    fromStatus: command.fromStatus,
    toStatus: command.toStatus,
    reason: command.reason,
    approvedAt:
      command.toStatus === 'approved' ? existing.approvedAt || updatedAt : existing.approvedAt,
    updatedAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { transition, audit };
}

async function writePlannedArchitectureDesignCreateOperation(client, planned) {
  await client.query(
    `insert into architecture.design
      (design_id, work_item_id, title, owner, status, rationale, fowler_signal,
       rail_ref, approved_at, supersedes_id, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      planned.design.designId,
      planned.design.workItemId,
      planned.design.title,
      planned.design.owner,
      planned.design.status,
      planned.design.rationale,
      planned.design.fowlerSignal,
      planned.design.railRef,
      planned.design.approvedAt,
      planned.design.supersedesId,
      planned.design.createdAt,
      planned.design.updatedAt,
    ]
  );

  for (const scope of planned.scopes) {
    await client.query(
      `insert into architecture.design_scope
        (design_id, subject_kind, subject_id, scope_kind, required, created_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        scope.designId,
        scope.subjectKind,
        scope.subjectId,
        scope.scopeKind,
        scope.required,
        scope.createdAt,
      ]
    );
  }

  await client.query(
    `insert into architecture.design_operations
      (operation_id, idempotency_key, operation_type, actor, design_id,
       source_ref, source_content_sha256, expected_revision, previous_revision,
       resulting_revision, payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.designId,
      planned.audit.sourceRef,
      planned.audit.sourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function writePlannedArchitectureDesignTransitionOperation(client, planned) {
  const result = await client.query(
    `update architecture.design
     set status = $3,
         approved_at = case
           when $3 = 'approved' then coalesce(approved_at, $4)
           else approved_at
         end,
         updated_at = $5
     where design_id = $1
       and status = $2
     returning design_id`,
    [
      planned.transition.designId,
      planned.transition.fromStatus,
      planned.transition.toStatus,
      planned.transition.approvedAt,
      planned.transition.updatedAt,
    ]
  );
  if (!result.rows[0]) {
    throw new Error(
      `ARCH-DESIGN-TRANSITION-CONFLICT: ${planned.transition.designId} no longer has status ${planned.transition.fromStatus}.`
    );
  }

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function applyArchitectureDesignCreateOperation(command, options = {}) {
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
      assertArchitectureDesignIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const existingDesign = await readArchitectureDesign(client, command.designId);
    const planned = planArchitectureDesignCreateOperation({
      command,
      existingDesign,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureDesignCreateOperation(client, planned);
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

async function applyArchitectureDesignTransitionOperation(command, options = {}) {
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
      assertArchitectureDesignIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const existingDesign = await readArchitectureDesign(client, command.designId);
    const implementationViolations =
      command.toStatus === 'implemented'
        ? await readArchitectureImplementationViolations(client, command.designId)
        : [];
    const planned = planArchitectureDesignTransitionOperation({
      command,
      existingDesign,
      implementationViolations,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureDesignTransitionOperation(client, planned);
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
  applyArchitectureDesignCreateOperation,
  applyArchitectureDesignTransitionOperation,
  assertArchitectureDesignIdempotentReplayMatches,
  parseArchitectureDesignCommand,
  planArchitectureDesignCreateOperation,
  planArchitectureDesignTransitionOperation,
  writePlannedArchitectureDesignTransitionOperation,
};
