/**
 * @file scripts/planning-db/operate/fowler.cjs
 * @ownedConcern Fowler fact admissibility, preservation and audited replay.
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

const { assertPlanningDbCurrentSchemaReady, schemaName } = require('../../planning-db-schema.cjs');

const { Client } = require('pg');

const { databaseUrl } = require('../../planning-db-schema.cjs');

const { randomUuidV4 } = require('@dvt/crypto');

const allowedFowlerAnalysisDispositionStatuses = new Set([
  'proposed',
  'accepted',
  'rejected',
  'superseded',
]);

const allowedFowlerAnalysisCanonicalTargetStatuses = new Set([
  'proposed',
  'accepted',
  'rejected',
  'superseded',
]);

const allowedFowlerAnalysisReferenceResolutionStatuses = new Set([
  'resolved',
  'obsolete',
  'replaced',
  'blocked',
  'ignored',
]);

const allowedFowlerAnalysisRetirementDecisionStatuses = new Set([
  'approved',
  'rejected',
  'blocked',
]);

function validateFowlerAnalysisDispositionStatus(value) {
  if (!allowedFowlerAnalysisDispositionStatuses.has(value)) {
    throw new Error(
      `Invalid Fowler analysis disposition status "${value}". Expected: ${[
        ...allowedFowlerAnalysisDispositionStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateFowlerAnalysisCanonicalTargetStatus(value) {
  if (!allowedFowlerAnalysisCanonicalTargetStatuses.has(value)) {
    throw new Error(
      `Invalid Fowler analysis canonical target status "${value}". Expected: ${[
        ...allowedFowlerAnalysisCanonicalTargetStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateFowlerAnalysisReferenceResolutionStatus(value) {
  if (!allowedFowlerAnalysisReferenceResolutionStatuses.has(value)) {
    throw new Error(
      `Invalid Fowler analysis reference resolution status "${value}". Expected: ${[
        ...allowedFowlerAnalysisReferenceResolutionStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateFowlerAnalysisRetirementDecisionStatus(value) {
  if (!allowedFowlerAnalysisRetirementDecisionStatuses.has(value)) {
    throw new Error(
      `Invalid Fowler analysis retirement decision status "${value}". Expected: ${[
        ...allowedFowlerAnalysisRetirementDecisionStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function assertFowlerAnalysisIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const existingSourceContentSha256 = normalizeOptionalText(
    existingOperation.source_content_sha256 ?? existingOperation.sourceContentSha256
  );
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.document_path === command.documentPath &&
    normalizeOptionalText(existingOperation.target_path) ===
      normalizeOptionalText(command.targetPath || command.canonicalTargetPath) &&
    normalizeOptionalText(existingOperation.reference_path) ===
      normalizeOptionalText(command.referencePath) &&
    normalizeOptionalText(existingOperation.relation_type) ===
      normalizeOptionalText(command.relationType) &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (existingSourceContentSha256 !== command.sourceContentSha256 || !sameOperation) {
    throw new Error(
      `FOWLER-ANALYSIS-IDEMPOTENCY-MISMATCH: idempotency key "${command.idempotencyKey}" already belongs to a different Fowler analysis operation.`
    );
  }
}

function parseFowlerAnalysisCommand(action, args) {
  const options = parseFlagOptions(args);
  const baseCommand = {
    documentPath: requireOption(options, 'path'),
    actor: requireOption(options, 'actor'),
    reason: requireOption(options, 'reason'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    idempotencyKey: options.idempotencyKey,
  };

  if (action === 'record-disposition') {
    const command = {
      kind: 'fowler_analysis_disposition_record',
      ...baseCommand,
      dispositionStatus: validateFowlerAnalysisDispositionStatus(options.status || 'accepted'),
      dispositionKind: options.kind || 'canonicalized',
      canonicalTargetPath: normalizeOptionalText(options.target),
    };

    return {
      ...command,
      idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command),
    };
  }

  if (action === 'link-canonical-target') {
    const command = {
      kind: 'fowler_analysis_canonical_target_link',
      ...baseCommand,
      targetPath: requireOption(options, 'target'),
      targetKind: options.targetKind || 'canonical_document',
      targetStatus: validateFowlerAnalysisCanonicalTargetStatus(options.status || 'accepted'),
    };

    return {
      ...command,
      idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command),
    };
  }

  if (action === 'resolve-reference') {
    const command = {
      kind: 'fowler_analysis_reference_resolve',
      ...baseCommand,
      referencePath: requireOption(options, 'reference'),
      relationType: requireOption(options, 'relation'),
      resolutionStatus: validateFowlerAnalysisReferenceResolutionStatus(
        options.resolution || 'resolved'
      ),
      canonicalTargetPath: normalizeOptionalText(options.target),
    };

    return {
      ...command,
      idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command),
    };
  }

  if (action === 'approve-retirement') {
    const command = {
      kind: 'fowler_analysis_retirement_approve',
      ...baseCommand,
      decisionStatus: validateFowlerAnalysisRetirementDecisionStatus(
        options.decision || 'approved'
      ),
    };

    return {
      ...command,
      idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command),
    };
  }

  throw new Error(
    `Unknown fowler-analysis operation "${action}". Expected record-disposition, link-canonical-target, resolve-reference, or approve-retirement.`
  );
}

function fowlerAnalysisAudit({ command, operationId, now }) {
  return {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    documentPath: command.documentPath,
    targetPath: command.targetPath || command.canonicalTargetPath || null,
    referencePath: command.referencePath || null,
    relationType: command.relationType || null,
    sourceContentSha256: command.sourceContentSha256,
    payload: operationPayload(command),
    createdAt: toIso(now),
  };
}

function planFowlerAnalysisOperation({ command, operationId, now }) {
  const createdAt = toIso(now);
  const audit = fowlerAnalysisAudit({ command, operationId, now });

  if (command.kind === 'fowler_analysis_disposition_record') {
    return {
      disposition: {
        documentPath: command.documentPath,
        dispositionStatus: command.dispositionStatus,
        dispositionKind: command.dispositionKind,
        canonicalTargetPath: command.canonicalTargetPath,
        reason: command.reason,
        sourceContentSha256: command.sourceContentSha256,
        recordedBy: command.actor,
        recordedAt: createdAt,
        rawDisposition: operationPayload(command),
      },
      audit,
    };
  }

  if (command.kind === 'fowler_analysis_canonical_target_link') {
    return {
      target: {
        documentPath: command.documentPath,
        targetPath: command.targetPath,
        targetKind: command.targetKind,
        targetStatus: command.targetStatus,
        reason: command.reason,
        sourceContentSha256: command.sourceContentSha256,
        linkedBy: command.actor,
        linkedAt: createdAt,
        rawTarget: operationPayload(command),
      },
      audit,
    };
  }

  if (command.kind === 'fowler_analysis_reference_resolve') {
    return {
      referenceResolution: {
        documentPath: command.documentPath,
        referencePath: command.referencePath,
        relationType: command.relationType,
        resolutionStatus: command.resolutionStatus,
        canonicalTargetPath: command.canonicalTargetPath,
        reason: command.reason,
        sourceContentSha256: command.sourceContentSha256,
        resolvedBy: command.actor,
        resolvedAt: createdAt,
        rawResolution: operationPayload(command),
      },
      audit,
    };
  }

  if (command.kind === 'fowler_analysis_retirement_approve') {
    return {
      retirementDecision: {
        documentPath: command.documentPath,
        decisionStatus: command.decisionStatus,
        reason: command.reason,
        sourceContentSha256: command.sourceContentSha256,
        decidedBy: command.actor,
        decidedAt: createdAt,
        rawDecision: operationPayload(command),
      },
      audit,
    };
  }

  throw new Error(`Unsupported Fowler analysis operation kind "${command.kind}".`);
}

async function readExistingFowlerAnalysisOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from ${schemaName}.fowler_analysis_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );

  return result.rows[0] || null;
}

async function writePlannedFowlerAnalysisOperation(client, planned) {
  if (planned.disposition) {
    await client.query(
      `insert into ${schemaName}.fowler_analysis_dispositions
        (document_path, disposition_status, disposition_kind, canonical_target_path,
         reason, source_content_sha256, recorded_by, recorded_at, raw_disposition)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       on conflict (document_path) do update set
         disposition_status = excluded.disposition_status,
         disposition_kind = excluded.disposition_kind,
         canonical_target_path = excluded.canonical_target_path,
         reason = excluded.reason,
         source_content_sha256 = excluded.source_content_sha256,
         recorded_by = excluded.recorded_by,
         recorded_at = excluded.recorded_at,
         raw_disposition = excluded.raw_disposition`,
      [
        planned.disposition.documentPath,
        planned.disposition.dispositionStatus,
        planned.disposition.dispositionKind,
        planned.disposition.canonicalTargetPath,
        planned.disposition.reason,
        planned.disposition.sourceContentSha256,
        planned.disposition.recordedBy,
        planned.disposition.recordedAt,
        toJson(planned.disposition.rawDisposition),
      ]
    );
  }

  if (planned.target) {
    await client.query(
      `insert into ${schemaName}.fowler_analysis_canonical_targets
        (document_path, target_path, target_kind, target_status, reason,
         source_content_sha256, linked_by, linked_at, raw_target)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       on conflict (document_path, target_path) do update set
         target_kind = excluded.target_kind,
         target_status = excluded.target_status,
         reason = excluded.reason,
         source_content_sha256 = excluded.source_content_sha256,
         linked_by = excluded.linked_by,
         linked_at = excluded.linked_at,
         raw_target = excluded.raw_target`,
      [
        planned.target.documentPath,
        planned.target.targetPath,
        planned.target.targetKind,
        planned.target.targetStatus,
        planned.target.reason,
        planned.target.sourceContentSha256,
        planned.target.linkedBy,
        planned.target.linkedAt,
        toJson(planned.target.rawTarget),
      ]
    );
  }

  if (planned.referenceResolution) {
    await client.query(
      `insert into ${schemaName}.fowler_analysis_reference_resolutions
        (document_path, reference_path, relation_type, resolution_status,
         canonical_target_path, reason, source_content_sha256, resolved_by,
         resolved_at, raw_resolution)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       on conflict (document_path, reference_path, relation_type) do update set
         resolution_status = excluded.resolution_status,
         canonical_target_path = excluded.canonical_target_path,
         reason = excluded.reason,
         source_content_sha256 = excluded.source_content_sha256,
         resolved_by = excluded.resolved_by,
         resolved_at = excluded.resolved_at,
         raw_resolution = excluded.raw_resolution`,
      [
        planned.referenceResolution.documentPath,
        planned.referenceResolution.referencePath,
        planned.referenceResolution.relationType,
        planned.referenceResolution.resolutionStatus,
        planned.referenceResolution.canonicalTargetPath,
        planned.referenceResolution.reason,
        planned.referenceResolution.sourceContentSha256,
        planned.referenceResolution.resolvedBy,
        planned.referenceResolution.resolvedAt,
        toJson(planned.referenceResolution.rawResolution),
      ]
    );
  }

  if (planned.retirementDecision) {
    await client.query(
      `insert into ${schemaName}.fowler_analysis_retirement_decisions
        (document_path, decision_status, reason, source_content_sha256,
         decided_by, decided_at, raw_decision)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)
       on conflict (document_path) do update set
         decision_status = excluded.decision_status,
         reason = excluded.reason,
         source_content_sha256 = excluded.source_content_sha256,
         decided_by = excluded.decided_by,
         decided_at = excluded.decided_at,
         raw_decision = excluded.raw_decision`,
      [
        planned.retirementDecision.documentPath,
        planned.retirementDecision.decisionStatus,
        planned.retirementDecision.reason,
        planned.retirementDecision.sourceContentSha256,
        planned.retirementDecision.decidedBy,
        planned.retirementDecision.decidedAt,
        toJson(planned.retirementDecision.rawDecision),
      ]
    );
  }

  await client.query(
    `insert into ${schemaName}.fowler_analysis_operations
      (operation_id, idempotency_key, operation_type, actor, document_path,
       target_path, reference_path, relation_type, source_content_sha256,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.documentPath,
      planned.audit.targetPath,
      planned.audit.referencePath,
      planned.audit.relationType,
      planned.audit.sourceContentSha256,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function applyFowlerAnalysisOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingFowlerAnalysisOperation(client, command.idempotencyKey);
    if (existing) {
      assertFowlerAnalysisIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const planned = planFowlerAnalysisOperation({
      command,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedFowlerAnalysisOperation(client, planned);
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
  applyFowlerAnalysisOperation,
  assertFowlerAnalysisIdempotentReplayMatches,
  parseFowlerAnalysisCommand,
  planFowlerAnalysisOperation,
  writePlannedFowlerAnalysisOperation,
};
