/**
 * @file scripts/planning-db/operate/architecture-audit.cjs
 * @ownedConcern Scoped architecture replay and audit envelope.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const { operationPayload } = require('./operation-payload.cjs');

const {
  canonicalJson,
  normalizeExistingPayload,
  normalizeOptionalText,
  toIso,
  toJson,
} = require('./command-values.cjs');

function assertArchitectureScopedOperationIdempotentReplayMatches(existingOperation, command) {
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

  if (existingSourceContentSha256 !== command.sourceContentSha256 || !sameOperation) {
    throw new Error(
      `ARCH-OPERATION-IDEMPOTENCY-MISMATCH: idempotency key "${command.idempotencyKey}" already belongs to a different architecture scoped operation.`
    );
  }
}

function architectureScopedAudit({ command, operationId, now, previousRevision = 0 }) {
  return {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    designId: command.designId,
    sourceRef: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    expectedRevision: null,
    previousRevision,
    resultingRevision: previousRevision,
    payload: operationPayload(command),
    createdAt: toIso(now),
  };
}

async function writeArchitectureScopedAudit(client, audit) {
  await client.query(
    `insert into architecture.design_operations
      (operation_id, idempotency_key, operation_type, actor, design_id,
       source_ref, source_content_sha256, expected_revision, previous_revision,
       resulting_revision, payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      audit.operationId,
      audit.idempotencyKey,
      audit.operationType,
      audit.actor,
      audit.designId,
      audit.sourceRef,
      audit.sourceContentSha256,
      audit.expectedRevision,
      audit.previousRevision,
      audit.resultingRevision,
      toJson(audit.payload),
      audit.createdAt,
    ]
  );
}

module.exports = {
  architectureScopedAudit,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  writeArchitectureScopedAudit,
};
